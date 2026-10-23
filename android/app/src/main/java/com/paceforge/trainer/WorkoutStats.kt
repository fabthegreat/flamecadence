package com.paceforge.trainer

import kotlin.math.pow
import kotlin.math.roundToInt

data class WorkoutStats(val avgW: Int, val npW: Int, val intensity: Double?, val tss: Int?) {
    /** "Avg 182 W · NP 195 W · IF 0.84 · TSS 62" (IF / TSS only when the FTP is known). */
    fun label(): String = buildString {
        append("Avg $avgW W · NP $npW W")
        if (intensity != null) append(" · IF ${"%.2f".format(java.util.Locale.US, intensity)}")
        if (tss != null) append(" · TSS $tss")
    }
}

object WorkoutMath {
    /** 1 Hz power series of a plan, ramps interpolated. */
    fun series(segments: List<Segment>): DoubleArray {
        val out = ArrayList<Double>()
        for (s in segments) {
            for (i in 0 until s.durationSec) {
                val f = (i + 0.5) / s.durationSec
                out.add(s.startW + (s.endW - s.startW) * f)
            }
        }
        return out.toDoubleArray()
    }

    /** Normalized Power: 4th root of the mean of the 4th power of the 30 s rolling average. */
    fun normalizedPower(p: DoubleArray): Double {
        if (p.isEmpty()) return 0.0
        if (p.size < 30) return p.average()
        var window = 0.0
        var sum = 0.0
        var n = 0
        for (i in p.indices) {
            window += p[i]
            if (i >= 30) window -= p[i - 30]
            if (i >= 29) { sum += (window / 30.0).pow(4); n++ }
        }
        return (sum / n).pow(0.25)
    }

    fun stats(p: DoubleArray, ftp: Double): WorkoutStats? {
        if (p.isEmpty()) return null
        val np = normalizedPower(p)
        val intensity = if (ftp > 0) np / ftp else null
        val tss = if (ftp > 0) p.size * np * (np / ftp) / (ftp * 3600.0) * 100.0 else null
        return WorkoutStats(p.average().roundToInt(), np.roundToInt(), intensity, tss?.roundToInt())
    }

    fun planned(w: PlannedWorkout): WorkoutStats? = stats(series(w.segments), w.ftp)
}
