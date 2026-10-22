package com.paceforge.trainer.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paceforge.trainer.PlannedWorkout
import com.paceforge.trainer.ble.FtmsCenter
import com.paceforge.trainer.engine.WorkoutEngine

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

    // 1 Hz actual-power history for the full-workout chart
    val history = remember { mutableStateListOf<Pair<Int, Int>>() }
    LaunchedEffect(elapsed) {
        if (status == WorkoutEngine.Status.RUNNING) history.add(elapsed to power)
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
                onExit()
            }) { Text("End") }
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
