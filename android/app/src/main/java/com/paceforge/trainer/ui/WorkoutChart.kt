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
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.dp
import com.paceforge.trainer.Segment
import kotlin.math.ceil

/**
 * Full-workout power profile chart, TrainerRoad-style.
 *
 *  - One golden block per segment (steps and ramps stay crisp, no cross-segment
 *    triangles), with a gradient fill and a bright top edge.
 *  - Actual power drawn as a smoothed curve (1 Hz samples).
 *  - 100 W gridlines with watt labels on the left axis.
 *  - Vertical cursor + dimmed overlay showing where you are.
 *  - compact = true: tiny thumbnail for the home workout card (no grid,
 *    no axis, no actual trace, no cursor).
 */
@Composable
fun WorkoutChart(
    segments: List<Segment>,
    totalSec: Int,
    elapsedSec: Int,
    history: List<Pair<Int, Int>>,   // (elapsedSec, actualW)
    modifier: Modifier = Modifier,
    compact: Boolean = false
) {
    val target = Color(0xFFFF9D00)
    val targetTop = Color(0xFFFFC24D)
    val targetDark = Color(0xFF7A2E00)
    val actual = Color.White
    val cursor = Color(0xFFFFD166)
    val dimmed = Color.Black.copy(alpha = 0.35f)
    val grid = Color.White.copy(alpha = 0.10f)
    val labelColor = Color.White.copy(alpha = 0.55f)

    Canvas(modifier) {
        if (totalSec <= 0) return@Canvas

        val maxTarget = segments.maxOf { maxOf(it.startW, it.endW) }
        val maxActual = history.maxOfOrNull { it.second.toDouble() } ?: 0.0
        // Round the axis up to the next 50 W so blocks never touch the top.
        val maxW = ceil(maxOf(maxTarget, maxActual, 50.0) / 50.0) * 50.0

        val axisPad = if (compact) 0f else 34f   // room for the watt labels
        val plotW = size.width - axisPad
        val h = size.height
        fun x(t: Int) = axisPad + t.toFloat() / totalSec * plotW
        fun y(p: Double) = h - (p / maxW * (h - 4f)).toFloat()

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
            // Baseline
            drawLine(grid, Offset(axisPad, y(0.0)), Offset(size.width, y(0.0)), 1f)
        }

        // --- Target profile: one block per segment ---
        val gap = if (compact) 1f else 2f
        val blockFill = Brush.verticalGradient(listOf(targetTop, targetDark), startY = 0f, endY = h)
        var t = 0
        for (s in segments) {
            val x0 = x(t) + gap / 2f
            val x1 = x(t + s.durationSec) - gap / 2f
            if (x1 - x0 >= 1f) {
                val block = Path().apply {
                    moveTo(x0, y(s.startW))
                    lineTo(x1, y(s.endW))
                    lineTo(x1, y(0.0))
                    lineTo(x0, y(0.0))
                    close()
                }
                drawPath(block, blockFill)
                // Bright top edge so ramps read clearly even a few pixels wide
                drawLine(target, Offset(x0, y(s.startW)), Offset(x1, y(s.endW)),
                    if (compact) 1.dp.toPx() else 2.dp.toPx(), cap = StrokeCap.Round)
            }
            t += s.durationSec
        }

        if (compact) return@Canvas

        // --- Actual power: smoothed curve through the 1 Hz samples ---
        if (history.size > 1) {
            val pts = history.map { Offset(x(it.first), y(it.second.toDouble())) }
            val ap = Path()
            ap.moveTo(pts[0].x, pts[0].y)
            for (i in 1 until pts.size - 1) {
                val midX = (pts[i].x + pts[i + 1].x) / 2f
                val midY = (pts[i].y + pts[i + 1].y) / 2f
                ap.quadraticBezierTo(pts[i].x, pts[i].y, midX, midY)
            }
            ap.lineTo(pts.last().x, pts.last().y)
            drawPath(ap, actual, style = Stroke(width = 2.dp.toPx(),
                cap = StrokeCap.Round, join = StrokeJoin.Round))
        }

        // --- Elapsed cursor + dim completed region ---
        if (elapsedSec > 0) {
            val cx = x(elapsedSec).coerceAtMost(size.width)
            drawRect(dimmed, topLeft = Offset(axisPad, 0f),
                size = Size((cx - axisPad).coerceAtLeast(0f), h))
            drawLine(cursor, Offset(cx, 0f), Offset(cx, h), 1.5.dp.toPx())
        }
    }
}
