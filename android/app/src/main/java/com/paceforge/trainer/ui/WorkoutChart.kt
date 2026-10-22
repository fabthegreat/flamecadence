package com.paceforge.trainer.ui

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.paceforge.trainer.Segment

/**
 * Full-workout power profile chart, TrainerRoad-style.
 *
 *  - Golden filled steps/ramps: the planned target power for the whole session.
 *  - White line: actual power recorded during the ride (1 Hz).
 *  - Vertical cursor + dimmed overlay: where you are in the workout.
 */
@Composable
fun WorkoutChart(
    segments: List<Segment>,
    totalSec: Int,
    elapsedSec: Int,
    history: List<Pair<Int, Int>>,   // (elapsedSec, actualW)
    modifier: Modifier = Modifier
) {
    val target = Color(0xFFFF9D00)
    val targetFill = target.copy(alpha = 0.35f)
    val actual = Color.White
    val cursor = Color(0xFFFFD166)
    val dimmed = Color.Black.copy(alpha = 0.35f)

    Canvas(modifier) {
        if (totalSec <= 0) return@Canvas

        val maxTarget = segments.maxOf { maxOf(it.startW, it.endW) }
        val maxActual = history.maxOfOrNull { it.second.toDouble() } ?: 0.0
        val maxW = maxOf(maxTarget, maxActual, 50.0)

        val w = size.width
        val h = size.height
        fun x(t: Int) = t.toFloat() / totalSec * w
        fun y(p: Double) = h - (p / maxW * h).toFloat()

        // --- Target profile: filled steps/ramps ---
        val fill = Path()
        var t = 0
        fill.moveTo(0f, y(0.0))
        for (s in segments) {
            fill.lineTo(x(t), y(s.startW))
            fill.lineTo(x(t + s.durationSec), y(s.endW))
            t += s.durationSec
        }
        fill.lineTo(w, y(0.0))
        fill.close()
        drawPath(fill, targetFill)

        // --- Target profile: outline ---
        val outline = Path()
        var started = false
        t = 0
        for (s in segments) {
            if (!started) { outline.moveTo(x(t), y(s.startW)); started = true }
            outline.lineTo(x(t + s.durationSec), y(s.endW))
            t += s.durationSec
        }
        if (started) drawPath(outline, target, style = Stroke(width = 2.dp.toPx()))

        // --- Actual power progression ---
        if (history.size > 1) {
            val ap = Path()
            history.forEachIndexed { i, (sec, watts) ->
                val px = x(sec)
                val py = y(watts.toDouble())
                if (i == 0) ap.moveTo(px, py) else ap.lineTo(px, py)
            }
            drawPath(ap, actual, style = Stroke(width = 2.dp.toPx()))
        }

        // --- Elapsed cursor + dim completed region ---
        if (elapsedSec > 0) {
            val cx = x(elapsedSec)
            drawRect(dimmed, topLeft = Offset.Zero, size = Size(cx, h))
            drawLine(cursor, Offset(cx, 0f), Offset(cx, h), strokeWidth = 1.5.dp.toPx())
        }
    }
}
