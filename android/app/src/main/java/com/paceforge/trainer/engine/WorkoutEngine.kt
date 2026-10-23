package com.paceforge.trainer.engine

import com.paceforge.trainer.PlannedWorkout
import com.paceforge.trainer.Segment
import com.paceforge.trainer.ble.FtmsCenter
import android.media.AudioManager
import android.media.ToneGenerator
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
    val elapsedSec = MutableStateFlow(0)       // position in the workout (jumps with step navigation)
    val rideSec = MutableStateFlow(0)          // real riding time: never jumps, used for recording
    val stepAnchorRide = MutableStateFlow(0)   // rideSec when the current step was last entered by a jump
    val targetW = MutableStateFlow(0)
    val segmentIndex = MutableStateFlow(0)
    val bias = MutableStateFlow(0)   // manual offset in watts (+/- buttons), cleared at each interval change
    val beepEnabled = MutableStateFlow(false)  // audio cue 3 s before the next interval

    private var scope: CoroutineScope? = null
    private var tickJob: Job? = null
    private val tone: ToneGenerator? by lazy {
        try { ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80) } catch (e: RuntimeException) { null }
    }

    fun attach(scope: CoroutineScope) { this.scope = scope }

    fun load(w: PlannedWorkout) {
        stop()
        workout.value = w
        elapsedSec.value = 0
        rideSec.value = 0
        stepAnchorRide.value = 0
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
                rideSec.value += 1
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

    private fun stepIndexAt(w: PlannedWorkout, t: Int): Int {
        var acc = 0
        for (i in w.segments.indices) {
            acc += w.segments[i].durationSec
            if (t < acc) return i
        }
        return w.segments.lastIndex
    }

    private fun stepStart(w: PlannedWorkout, idx: Int): Int = w.segments.take(idx).sumOf { it.durationSec }

    /**
     * Step navigation. delta > 0: start of the next step. delta < 0: restart the current step,
     * or go to the previous one when less than 4 s into it.
     */
    fun jumpStep(delta: Int) {
        val w = workout.value ?: return
        if (status.value == Status.DONE || w.segments.isEmpty()) return
        val cur = stepIndexAt(w, elapsedSec.value)
        val target = when {
            delta > 0 -> { if (cur >= w.segments.lastIndex) return; cur + 1 }
            elapsedSec.value - stepStart(w, cur) > 3 -> cur
            else -> (cur - 1).coerceAtLeast(0)
        }
        elapsedSec.value = stepStart(w, target)
        stepAnchorRide.value = rideSec.value
        bias.value = 0
        pushTarget(send = status.value == Status.RUNNING)   // paused/idle: update the display only
    }

    fun nudgeBias(delta: Int) { bias.value = (bias.value + delta).coerceIn(-100, 100) }

    /** Current segment + interpolated target, sent to the trainer. */
    private fun pushTarget(send: Boolean = true) {
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
        // Bias nudges only last until the end of the current interval.
        if (idx != segmentIndex.value) bias.value = 0
        segmentIndex.value = idx
        val s: Segment = w.segments[idx]
        if (beepEnabled.value && idx < w.segments.lastIndex && s.durationSec - t == 3)
            tone?.startTone(ToneGenerator.TONE_PROP_BEEP, 150)
        val frac = if (s.durationSec == 0) 1.0 else (t.toDouble() / s.durationSec).coerceIn(0.0, 1.0)
        val watts = (s.startW + (s.endW - s.startW) * frac).roundToInt() + bias.value
        targetW.value = (s.startW + (s.endW - s.startW) * frac).roundToInt()
        if (send) FtmsCenter.setTargetPower(watts.coerceAtLeast(0))
    }
}
