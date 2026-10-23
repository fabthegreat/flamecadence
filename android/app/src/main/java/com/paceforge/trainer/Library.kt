package com.paceforge.trainer

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

/**
 * A workout of the built-in library. Power is stored as % of FTP, so the same
 * workout is turned into watts with the rider's own FTP (see [toPlanned]).
 */
data class LibWorkout(
    val id: String,
    val name: String,
    val category: String,
    val description: String,
    val segments: List<Segment>,   // startW / endW hold % of FTP here
    val durationSec: Int,
    val intensityFactor: Double,   // FTP-independent
    val tss: Int                   // FTP-independent
) {
    fun toPlanned(ftp: Double) = PlannedWorkout(
        id = id.hashCode().toLong(),
        name = name,
        description = description,
        segments = segments.map { it.copy(startW = it.startW * ftp / 100.0, endW = it.endW * ftp / 100.0) },
        ftp = ftp
    )
}

/** Loads assets/library.json. Replace that file to change the library. */
object Library {
    suspend fun load(ctx: Context): List<LibWorkout> = withContext(Dispatchers.IO) {
        val text = ctx.assets.open("library.json").bufferedReader().use { it.readText() }
        parse(text)
    }

    fun parse(text: String): List<LibWorkout> {
        val arr = JSONObject(text).getJSONArray("workouts")
        val out = ArrayList<LibWorkout>()
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            val segs = ArrayList<Segment>()
            o.optJSONArray("steps")?.let { flatten(it, segs) }
            if (segs.isEmpty()) continue
            val stats = WorkoutMath.stats(WorkoutMath.series(segs), 100.0)
            out.add(LibWorkout(
                id = o.getString("id"),
                name = o.optString("name", "Workout"),
                category = o.optString("category", "Other"),
                description = o.optString("description", ""),
                segments = segs,
                durationSec = segs.sumOf { it.durationSec },
                intensityFactor = stats?.intensity ?: 0.0,
                tss = stats?.tss ?: 0
            ))
        }
        return out
    }

    private fun flatten(steps: JSONArray, out: MutableList<Segment>) {
        for (i in 0 until steps.length()) {
            val s = steps.getJSONObject(i)
            val children = s.optJSONArray("steps")
            if (children != null) {
                repeat(s.optInt("reps", 1)) { flatten(children, out) }
                continue
            }
            val dur = s.optInt("duration", 0)
            if (dur <= 0) continue
            val flat = s.optDouble("power", Double.NaN)
            val a = if (flat.isNaN()) s.optDouble("start", 0.0) else flat
            val b = if (flat.isNaN()) s.optDouble("end", a) else flat
            out.add(Segment(dur, a, b, s.optString("text", "")))
        }
    }
}
