package com.paceforge.trainer.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.paceforge.trainer.IcuUpload
import com.paceforge.trainer.PlannedWorkout
import com.paceforge.trainer.Segment
import com.paceforge.trainer.SessionPoint
import com.paceforge.trainer.SettingsStore
import com.paceforge.trainer.ble.FtmsCenter
import com.paceforge.trainer.engine.WorkoutEngine
import kotlinx.coroutines.launch
import java.util.Locale

private fun clock(sec: Int) = "${sec / 60}:${"%02d".format(sec % 60)}"

private fun nextLabel(s: Segment): String {
    val dur = when {
        s.durationSec % 60 == 0 -> "${s.durationSec / 60} min"
        s.durationSec < 60 -> "${s.durationSec} s"
        else -> clock(s.durationSec)
    }
    val watts = if (s.startW.toInt() == s.endW.toInt()) "${s.startW.toInt()} W"
                else "${s.startW.toInt()}–${s.endW.toInt()} W"
    return "$dur @ $watts"
}

@Composable
fun PlayerScreen(pad: PaddingValues, workout: PlannedWorkout?, onExit: () -> Unit) {
    // Load into the engine as soon as we enter the screen.
    LaunchedEffect(workout?.id) { workout?.let { WorkoutEngine.load(it) } }

    val status by WorkoutEngine.status.collectAsState()
    val elapsed by WorkoutEngine.elapsedSec.collectAsState()
    val target by WorkoutEngine.targetW.collectAsState()
    val bias by WorkoutEngine.bias.collectAsState()
    val segIdx by WorkoutEngine.segmentIndex.collectAsState()
    val power by FtmsCenter.powerW.collectAsState()
    val cadence by FtmsCenter.cadence.collectAsState()
    val hr by FtmsCenter.hrBpm.collectAsState()
    val ergOk by FtmsCenter.ergAvailable.collectAsState()

    val ctx = androidx.compose.ui.platform.LocalContext.current
    val settings by SettingsStore.flow(ctx).collectAsStateWithLifecycle(initialValue = null)

    // Preferences that act during the workout
    val s = settings
    LaunchedEffect(s?.beep) { WorkoutEngine.beepEnabled.value = s?.beep == true }
    val view = LocalView.current
    DisposableEffect(s?.keepAwake) {
        view.keepScreenOn = s?.keepAwake ?: true
        onDispose { view.keepScreenOn = false }
    }

    // 1 Hz session recording (power + hr + cadence) for the chart and the upload
    val session = remember { mutableStateListOf<SessionPoint>() }
    LaunchedEffect(elapsed) {
        if (status == WorkoutEngine.Status.RUNNING) session.add(SessionPoint(elapsed, power, hr, cadence))
    }
    val history = remember(session.size) { session.map { it.sec to it.watts } }

    // Real session start time (set once, when the workout actually starts running)
    val startMs = remember { mutableStateOf<Long?>(null) }
    LaunchedEffect(status) {
        if (status == WorkoutEngine.Status.RUNNING && startMs.value == null)
            startMs.value = System.currentTimeMillis()
    }

    // Offer save/discard once the workout is over (finished or ended early)
    var askSave by remember { mutableStateOf(false) }
    LaunchedEffect(status) {
        if (status == WorkoutEngine.Status.DONE && session.isNotEmpty()) askSave = true
    }

    val w = workout
    val total = w?.totalSec ?: 0
    val next = w?.segments?.getOrNull(segIdx + 1)
    val active = status == WorkoutEngine.Status.RUNNING || status == WorkoutEngine.Status.PAUSED

    fun endWorkout() {
        WorkoutEngine.stop()
        if (session.isEmpty()) onExit() else askSave = true
    }

    // Leaving mid-ride needs a confirmation; on the save screen the rider must save or discard.
    var confirmEnd by remember { mutableStateOf(false) }
    fun requestBack() {
        if (active) confirmEnd = true
        else if (!askSave) onExit()
    }
    BackHandler { requestBack() }
    if (confirmEnd) {
        AlertDialog(
            onDismissRequest = { confirmEnd = false },
            title = { Text("End workout?") },
            text = { Text("The ride so far can still be saved to intervals.icu.") },
            confirmButton = { TextButton(onClick = { confirmEnd = false; endWorkout() }) { Text("End workout") } },
            dismissButton = { TextButton(onClick = { confirmEnd = false }) { Text("Keep riding") } }
        )
    }

    if (askSave) {
        // ---------------------------------------------------------- end of ride
        Column(Modifier.fillMaxSize().padding(pad).padding(horizontal = 16.dp)) {
            BackHeader(w?.name ?: "PaceForge workout", onBack = null)
            // elapsed = 0: no cursor / dimming, the whole session is traced in white
            WorkoutChart(w?.segments ?: emptyList(), total, 0, history,
                Modifier.fillMaxWidth().height(150.dp).padding(top = 4.dp))
            Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                SaveSection(
                    name = w?.name ?: "PaceForge workout",
                    points = session.toList(),
                    startMs = startMs.value ?: System.currentTimeMillis(),
                    apiKey = s?.apiKey ?: "",
                    athleteId = s?.athleteId ?: "0",
                    autoUpload = s?.autoUpload ?: false,
                    onDone = { session.clear(); onExit() }
                )
            }
        }
        return
    }

    // ---------------------------------------------------------------- player
    Column(Modifier.fillMaxSize().padding(pad).padding(horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally) {

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically) {
            BackHeader(w?.name ?: "No workout", onBack = { requestBack() }, modifier = Modifier.weight(1f, fill = false))
            if (total > 0) {
                Spacer(Modifier.width(8.dp))
                if (ergOk) StatusPill("ERG", Forge.Green) else StatusPill("NO ERG · read-only", Forge.Warn)
            }
        }

        if (total > 0) {
            Text("${clock(elapsed)} / ${clock(total)}" + (next?.let { "  ·  next: ${nextLabel(it)}" } ?: ""),
                fontSize = 12.sp, color = Forge.Header, textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 6.dp))
        }

        // Full workout profile + live progression
        WorkoutChart(w?.segments ?: emptyList(), total, elapsed, history,
            Modifier.fillMaxWidth().height(150.dp).padding(top = 8.dp))

        // Target power — the hero number
        Text("$target W",
            style = TextStyle(
                brush = Brush.verticalGradient(listOf(Color.White, Color(0xFFFFD9A3))),
                fontSize = 58.sp, fontWeight = FontWeight.Black, letterSpacing = (-1).sp),
            modifier = Modifier.padding(top = 10.dp))
        Text(if (bias != 0) "TARGET · BIAS ${if (bias > 0) "+" else "−"}${kotlin.math.abs(bias)} W" else "TARGET",
            fontSize = 11.sp, letterSpacing = 1.sp, color = Forge.Muted)

        Row(Modifier.fillMaxWidth().padding(top = 14.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
            Metric("ACTUAL", "$power W")
            Metric("CADENCE", "$cadence rpm")
            Metric("HEART RATE", if (hr > 0) "$hr bpm" else "—")
        }

        Spacer(Modifier.height(14.dp))

        when (status) {
            WorkoutEngine.Status.IDLE ->
                PrimaryButton("▶  Start workout", Modifier.fillMaxWidth()) { WorkoutEngine.start() }
            WorkoutEngine.Status.DONE ->
                PrimaryButton("Done 🎉", Modifier.fillMaxWidth()) { onExit() }
            WorkoutEngine.Status.RUNNING, WorkoutEngine.Status.PAUSED -> {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ForgeChip("−10 W", Modifier.weight(1f)) { WorkoutEngine.nudgeBias(-10) }
                    ForgeChip("+10 W", Modifier.weight(1f)) { WorkoutEngine.nudgeBias(10) }
                    if (status == WorkoutEngine.Status.RUNNING)
                        ForgeChip("⏸ Pause", Modifier.weight(1f), accent = true) { WorkoutEngine.pause() }
                    else
                        ForgeChip("▶ Resume", Modifier.weight(1f), accent = true) { WorkoutEngine.resume() }
                    ForgeChip("End", Modifier.weight(1f)) { confirmEnd = true }
                }
                Text("Bias nudges apply until the end of the interval.",
                    fontSize = 11.sp, color = Forge.Faint, textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
            }
        }
    }
}

@Composable
private fun SaveSection(
    name: String,
    points: List<SessionPoint>,
    startMs: Long,
    apiKey: String,
    athleteId: String,
    autoUpload: Boolean,
    onDone: () -> Unit
) {
    var state by remember { mutableStateOf("idle") }   // idle | saving | saved | error
    var errorMsg by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun upload() {
        state = "saving"
        scope.launch {
            try {
                IcuUpload.uploadTcx(apiKey, athleteId, name, startMs, points)
                state = "saved"
            } catch (e: Exception) {
                errorMsg = e.message
                state = "error"
            }
        }
    }

    // "Auto-upload finished rides": skip the prompt and send it straight away.
    LaunchedEffect(autoUpload, apiKey) {
        if (autoUpload && apiKey.isNotBlank() && state == "idle") upload()
    }

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text("Workout complete 🎉", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold)
        Text(
            "${String.format(Locale.getDefault(), "%,d", points.size)} samples · " +
                "${(points.lastOrNull()?.sec ?: 0) / 60} min recorded",
            fontSize = 11.sp, color = Forge.Muted, modifier = Modifier.padding(top = 4.dp))
        Spacer(Modifier.height(12.dp))

        when (state) {
            "saving" -> {
                CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 3.dp)
                Text("Uploading to intervals.icu…", fontSize = 12.sp, color = Forge.Muted,
                    modifier = Modifier.padding(top = 8.dp))
            }
            "saved" -> {
                Text("Saved to intervals.icu ✓", color = Color(0xFF2ECC71),
                    fontSize = 15.sp, fontWeight = FontWeight.ExtraBold)
                Text("appears as activity “$name”", fontSize = 11.sp, color = Forge.Faint,
                    modifier = Modifier.padding(top = 4.dp))
                PrimaryButton("Done", Modifier.padding(top = 12.dp).widthIn(min = 220.dp), onClick = onDone)
            }
            "error" -> {
                Text("Upload failed: $errorMsg", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                GhostButton("Retry", Modifier.padding(top = 12.dp).widthIn(min = 220.dp)) { state = "idle" }
                GhostButton("Discard", Modifier.padding(top = 8.dp).widthIn(min = 220.dp), onClick = onDone)
            }
            else -> {
                PrimaryButton("Save to intervals.icu", Modifier.widthIn(min = 220.dp)) { upload() }
                GhostButton("Discard", Modifier.padding(top = 8.dp).widthIn(min = 220.dp), onClick = onDone)
            }
        }
    }
}

@Composable
private fun Metric(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
        Text(label, fontSize = 11.sp, color = Forge.Muted, modifier = Modifier.padding(top = 2.dp))
    }
}
