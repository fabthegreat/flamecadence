package com.paceforge.trainer.ui

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.dp
import com.paceforge.trainer.Segment
import kotlin.math.ceil

// ---------------------------------------------------------------- power zones

/** FTP used to colour the steps: the real one when known, else estimated from the hardest step. */
fun zoneRefFtp(segments: List<Segment>, ftp: Double): Double {
    if (ftp > 0) return ftp
    val max = segments.maxOfOrNull { maxOf(it.startW, it.endW) } ?: return 200.0
    return if (max > 0) max / 1.1 else 200.0
}

/** Coggan power zones, easy (cool colours) to hard (red / purple). */
fun zoneColor(watts: Double, ftp: Double): Color {
    val pct = if (ftp > 0) watts / ftp * 100.0 else 0.0
    return when {
        pct < 55 -> Color(0xFF8FA3B8)    // Z1 recovery
        pct < 76 -> Color(0xFF3B8EEA)    // Z2 endurance
        pct < 91 -> Color(0xFF2ECC71)    // Z3 tempo
        pct < 106 -> Color(0xFFF2C94C)   // Z4 threshold
        pct < 121 -> Color(0xFFF2994A)   // Z5 VO2max
        pct < 151 -> Color(0xFFEB5757)   // Z6 anaerobic
        else -> Color(0xFFBB6BD9)        // Z7 neuromuscular
    }
}

/** Split (x, value) samples into continuous runs: a new run starts when x goes backwards (step navigation) or jumps. */
private fun runs(pts: List<Pair<Int, Int>>): List<List<Pair<Int, Int>>> {
    val out = ArrayList<List<Pair<Int, Int>>>()
    var cur = ArrayList<Pair<Int, Int>>()
    var last = Int.MIN_VALUE
    for (p in pts) {
        if (cur.isNotEmpty() && (p.first < last || p.first - last > 3)) { out.add(cur); cur = ArrayList() }
        cur.add(p)
        last = p.first
    }
    if (cur.isNotEmpty()) out.add(cur)
    return out
}

/**
 * Full-workout power profile chart.
 *
 *  - One block per step, coloured by power zone (relative to FTP) so hard and easy steps
 *    read at a glance; ramps and steps stay crisp.
 *  - Actual power as a smoothed curve (1 Hz samples).
 *  - Heart rate as a thin translucent line behind the power curve, on its own scale (if available).
 *  - 100 W gridlines with watt labels on the left axis.
 *  - Vertical cursor + dimmed overlay showing where you are.
 *  - compact = true: tiny thumbnail for the workout cards (no grid, axis, traces or cursor).
 */
@Composable
fun WorkoutChart(
    segments: List<Segment>,
    totalSec: Int,
    elapsedSec: Int,
    history: List<Pair<Int, Int>>,   // (workout position sec, actual W)
    modifier: Modifier = Modifier,
    compact: Boolean = false,
    ftp: Double = 0.0,
    hrHistory: List<Pair<Int, Int>> = emptyList()   // (workout position sec, bpm)
) {
    val actual = Color.White
    val hrColor = Color(0xFFFF6B8A)
    val cursor = Color(0xFFFFD166)
    val dimmed = Color.Black.copy(alpha = 0.35f)
    val grid = Color.White.copy(alpha = 0.10f)
    val labelColor = Color.White.copy(alpha = 0.55f)

    Canvas(modifier) {
        if (totalSec <= 0 || segments.isEmpty()) return@Canvas

        val refFtp = zoneRefFtp(segments, ftp)
        val maxTarget = segments.maxOf { maxOf(it.startW, it.endW) }
        val maxActual = history.maxOfOrNull { it.second.toDouble() } ?: 0.0
        // Round the axis up to the next 50 W so blocks never touch the top.
        val maxW = ceil(maxOf(maxTarget, maxActual, 50.0) / 50.0) * 50.0

        val axisPad = if (compact) 0f else 34f   // room for the watt labels
        val plotW = size.width - axisPad
        val h = size.height
        fun x(t: Int) = axisPad + t.toFloat() / totalSec * plotW
        fun y(p: Double) = h - (p / maxW * (h - 4f)).toFloat()

        /** Smooth curve through points; drawn run by run so jumps never leave a stray line. */
        fun smooth(pts: List<Offset>, color: Color, widthPx: Float) {
            if (pts.size < 2) return
            val path = Path()
            path.moveTo(pts[0].x, pts[0].y)
            for (i in 1 until pts.size - 1) {
                val midX = (pts[i].x + pts[i + 1].x) / 2f
                val midY = (pts[i].y + pts[i + 1].y) / 2f
                path.quadraticBezierTo(pts[i].x, pts[i].y, midX, midY)
            }
            path.lineTo(pts.last().x, pts.last().y)
            drawPath(path, color, style = Stroke(width = widthPx, cap = StrokeCap.Round, join = StrokeJoin.Round))
        }

        // --- 100 W gridlines + labels (full mode only) ---
        if (!compact) {
            val paint = android.graphics.Paint().apply {
                textSize = 18f
                color = labelColor.toArgb()
                isAntiAlias = true
            }
            var level = 100
            while (level < maxW) {
                val gy = y(level.toDouble())
                drawLine(grid, Offset(axisPad, gy), Offset(size.width, gy), 1f)
                drawContext.canvas.nativeCanvas.drawText("$level", 2f, gy + 6f, paint)
                level += 100
            }
            drawLine(grid, Offset(axisPad, y(0.0)), Offset(size.width, y(0.0)), 1f)
        }

        // --- Target profile: one zone-coloured block per segment ---
        val gap = if (compact) 1f else 2f
        var t = 0
        for (s in segments) {
            val x0 = x(t) + gap / 2f
            val x1 = x(t + s.durationSec) - gap / 2f
            if (x1 - x0 >= 1f) {
                val zone = zoneColor((s.startW + s.endW) / 2.0, refFtp)
                val fill = Brush.verticalGradient(
                    listOf(zone.copy(alpha = 0.95f), zone.copy(alpha = 0.30f)), startY = 0f, endY = h)
                val block = Path().apply {
                    moveTo(x0, y(s.startW))
                    lineTo(x1, y(s.endW))
                    lineTo(x1, y(0.0))
                    lineTo(x0, y(0.0))
                    close()
                }
                drawPath(block, fill)
                // Bright top edge so ramps read clearly even a few pixels wide
                drawLine(lerp(zone, Color.White, 0.35f), Offset(x0, y(s.startW)), Offset(x1, y(s.endW)),
                    if (compact) 1.dp.toPx() else 2.dp.toPx(), cap = StrokeCap.Round)
            }
            t += s.durationSec
        }

        if (compact) return@Canvas

        // --- Heart rate: own scale, thin and translucent so the power curve stays readable ---
        val hrPts = hrHistory.filter { it.second > 0 }
        if (hrPts.size > 1) {
            val lo = hrPts.minOf { it.second } - 10
            val hi = maxOf(hrPts.maxOf { it.second } + 10, lo + 40)
            for (run in runs(hrPts)) {
                smooth(run.map { Offset(x(it.first), h - ((it.second - lo).toFloat() / (hi - lo) * (h - 4f))) },
                    hrColor.copy(alpha = 0.75f), 1.5.dp.toPx())
            }
        }

        // --- Actual power ---
        for (run in runs(history)) {
            smooth(run.map { Offset(x(it.first), y(it.second.toDouble())) }, actual, 2.dp.toPx())
        }

        // --- Position cursor + dim completed region ---
        if (elapsedSec > 0) {
            val cx = x(elapsedSec).coerceAtMost(size.width)
            drawRect(dimmed, topLeft = Offset(axisPad, 0f),
                size = Size((cx - axisPad).coerceAtLeast(0f), h))
            drawLine(cursor, Offset(cx, 0f), Offset(cx, h), 1.5.dp.toPx())
        }
    }
}
