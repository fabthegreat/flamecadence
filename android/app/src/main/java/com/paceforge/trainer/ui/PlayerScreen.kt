package com.paceforge.trainer.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.paceforge.trainer.IcuUpload
import com.paceforge.trainer.PlannedWorkout
import com.paceforge.trainer.SessionPoint
import com.paceforge.trainer.SettingsStore
import com.paceforge.trainer.ble.FtmsCenter
import com.paceforge.trainer.engine.WorkoutEngine
import kotlinx.coroutines.launch

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

    val ctx = androidx.compose.ui.platform.LocalContext.current
    val settings by SettingsStore.flow(ctx).collectAsStateWithLifecycle(initialValue = null)
    val scope = rememberCoroutineScope()

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
    val next = w?.segments?.getOrNull((segIdx + 1).coerceAtMost((w.segments.size - 1).coerceAtLeast(0)))

    Column(Modifier.fillMaxSize().padding(pad).padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally) {
        Text(w?.name ?: "No workout", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))

        // Progress
        if (total > 0) {
            LinearProgressIndicator(progress = { elapsed.toFloat() / total }, Modifier.fillMaxWidth())
            Spacer(Modifier.height(6.dp))
            Text("${elapsed / 60}:${"%02d".format(elapsed % 60)} / ${total / 60}:${"%02d".format(total % 60)}",
                fontSize = 13.sp)
        }

        // Full workout profile + live progression
        WorkoutChart(w?.segments ?: emptyList(), total, elapsed, history,
            Modifier.fillMaxWidth().height(160.dp))

        Spacer(Modifier.height(16.dp))

        // Target power — the big number
        Text("$target W", fontSize = 64.sp, fontWeight = FontWeight.Black)
        if (bias != 0) Text("bias $bias W", fontSize = 13.sp)

        Spacer(Modifier.height(16.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            Metric("Actual", "$power W")
            Metric("Cadence", "$cadence rpm")
            Metric("HR", if (hr > 0) "$hr bpm" else "—")
        }

        Spacer(Modifier.height(16.dp))
        next?.let {
            Text("Next: ${it.durationSec / 60} min at ${if (it.startW == it.endW) "${it.startW.toInt()} W" else "${it.startW.toInt()}–${it.endW.toInt()} W"}",
                fontSize = 13.sp)
        }

        Spacer(Modifier.height(24.dp))

        if (askSave) {
            SaveSection(
                name = w?.name ?: "PaceForge workout",
                points = session.toList(),
                startMs = startMs.value ?: System.currentTimeMillis(),
                apiKey = settings?.apiKey ?: "",
                athleteId = settings?.athleteId ?: "0",
                onDone = { session.clear(); onExit() }
            )
        } else {
            when (status) {
                WorkoutEngine.Status.IDLE, WorkoutEngine.Status.DONE ->
                    Button(onClick = { WorkoutEngine.start() }, modifier = Modifier.fillMaxWidth(0.7f)) {
                        Text(if (status == WorkoutEngine.Status.DONE) "Done 🎉" else "Start workout")
                    }
                WorkoutEngine.Status.RUNNING ->
                    Button(onClick = { WorkoutEngine.pause() }, modifier = Modifier.fillMaxWidth(0.7f)) { Text("Pause") }
                WorkoutEngine.Status.PAUSED ->
                    Button(onClick = { WorkoutEngine.resume() }, modifier = Modifier.fillMaxWidth(0.7f)) { Text("Resume") }
            }

            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { WorkoutEngine.nudgeBias(-10) }) { Text("−10 W") }
                OutlinedButton(onClick = { WorkoutEngine.nudgeBias(10) }) { Text("+10 W") }
                OutlinedButton(onClick = {
                    WorkoutEngine.stop()
                    if (session.isEmpty()) onExit() else askSave = true
                }) { Text("End") }
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
    onDone: () -> Unit
) {
    var state by remember { mutableStateOf("idle") }   // idle | saving | saved | error
    var errorMsg by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text("Workout complete", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Text("${points.size} samples · ${points.lastOrNull()?.sec ?: 0}s recorded",
            fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(12.dp))

        when (state) {
            "saving" -> {
                CircularProgressIndicator(Modifier.size(28.dp))
                Text("Uploading to intervals.icu…", fontSize = 12.sp)
            }
            "saved" -> {
                Text("Saved to intervals.icu ✓", color = Color(0xFF1D7A3A), fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(12.dp))
                Button(onClick = onDone, modifier = Modifier.fillMaxWidth(0.7f)) { Text("Done") }
            }
            "error" -> {
                Text("Upload failed: $errorMsg",
                    color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { state = "idle" }) { Text("Retry") }
                    OutlinedButton(onClick = onDone) { Text("Discard") }
                }
            }
            else -> {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = {
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
                    }) { Text("Save to intervals.icu") }
                    OutlinedButton(onClick = onDone) { Text("Discard") }
                }
            }
        }
    }
}

@Composable
private fun Metric(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text(label, fontSize = 12.sp)
    }
}
