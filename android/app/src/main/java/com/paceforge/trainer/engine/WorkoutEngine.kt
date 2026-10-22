package com.paceforge.trainer.engine

import com.paceforge.trainer.PlannedWorkout
import com.paceforge.trainer.Segment
import com.paceforge.trainer.ble.FtmsCenter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

/**
 * Drives the planned workout: 1 Hz ticker computes the current target watts
 * (with linear ramp interpolation inside a segment) and pushes it to the
 * trainer in ERG mode.
 */
object WorkoutEngine {
    enum class Status { IDLE, RUNNING, PAUSED, DONE }

    val status = MutableStateFlow(Status.IDLE)
    val workout = MutableStateFlow<PlannedWorkout?>(null)
    val elapsedSec = MutableStateFlow(0)
    val targetW = MutableStateFlow(0)
    val segmentIndex = MutableStateFlow(0)
    val bias = MutableStateFlow(0)   // manual offset in watts (+/- buttons)

    private var scope: CoroutineScope? = null
    private var tickJob: Job? = null

    fun attach(scope: CoroutineScope) { this.scope = scope }

    fun load(w: PlannedWorkout) {
        stop()
        workout.value = w
        elapsedSec.value = 0
        segmentIndex.value = 0
        targetW.value = w.segments.firstOrNull()?.startW?.roundToInt() ?: 0
        bias.value = 0
        status.value = Status.IDLE
    }

    fun start() {
        val w = workout.value ?: return
        if (status.value == Status.RUNNING) return
        status.value = Status.RUNNING
        tickJob = scope?.launch {
            while (status.value == Status.RUNNING && elapsedSec.value < w.totalSec) {
                delay(1000)
                elapsedSec.value += 1
                pushTarget()
            }
            if (elapsedSec.value >= w.totalSec) {
                status.value = Status.DONE
                FtmsCenter.setTargetPower(0)
            }
        }
    }

    fun pause() {
        if (status.value != Status.RUNNING) return
        status.value = Status.PAUSED
        tickJob?.cancel()
        FtmsCenter.setTargetPower(0)  // let the rider spin freely while paused
    }

    fun resume() { if (status.value == Status.PAUSED) start() }

    fun stop() {
        tickJob?.cancel()
        status.value = Status.IDLE
        FtmsCenter.setTargetPower(0)
    }

    fun nudgeBias(delta: Int) { bias.value = (bias.value + delta).coerceIn(-100, 100) }

    /** Current segment + interpolated target, sent to the trainer. */
    private fun pushTarget() {
        val w = workout.value ?: return
        var t = elapsedSec.value
        var idx = 0
        for (i in w.segments.indices) {
            val d = w.segments[i].durationSec
            if (t < d) { idx = i; break }
            t -= d
            idx = i
            if (i == w.segments.lastIndex && t >= 0) { idx = i; t = w.segments[i].durationSec }
        }
        segmentIndex.value = idx
        val s: Segment = w.segments[idx]
        val frac = if (s.durationSec == 0) 1.0 else (t.toDouble() / s.durationSec).coerceIn(0.0, 1.0)
        val watts = (s.startW + (s.endW - s.startW) * frac).roundToInt() + bias.value
        targetW.value = (s.startW + (s.endW - s.startW) * frac).roundToInt()
        FtmsCenter.setTargetPower(watts.coerceAtLeast(0))
    }
}
