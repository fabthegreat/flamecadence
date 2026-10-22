package com.paceforge.trainer

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

/** One flat, time-ordered slice of the workout (already resolved in watts). */
data class Segment(
    val durationSec: Int,
    val startW: Double,
    val endW: Double,
    val text: String
)

data class PlannedWorkout(
    val id: Long,
    val name: String,
    val description: String,
    val segments: List<Segment>
) {
    val totalSec: Int get() = segments.sumOf { it.durationSec }
}

/**
 * intervals.icu API client.
 * Docs: https://intervals.icu/api-docs.html  (Basic auth: "API_Key" / <your key>)
 * Planned workouts: GET /api/v1/athlete/{id}/events?category=WORKOUT&resolve=true
 * With resolve=true, power targets are returned in watts in the "_power" fields,
 * so no FTP conversion is needed on the device.
 */
object IcuRepository {
    private val http = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private fun todayIso(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    private fun basicAuth(apiKey: String): String =
        "Basic " + android.util.Base64.encodeToString("API_KEY:$apiKey".toByteArray(),
            android.util.Base64.NO_WRAP)

    suspend fun fetchToday(apiKey: String, athleteId: String): List<PlannedWorkout> =
        withContext(Dispatchers.IO) {
            val today = todayIso()
            val url = "https://intervals.icu/api/v1/athlete/$athleteId/events" +
                "?category=WORKOUT&resolve=true&oldest=$today&newest=$today"
            val req = Request.Builder().url(url)
                .header("Authorization", basicAuth(apiKey))
                .build()

            http.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) throw RuntimeException("intervals.icu HTTP ${resp.code}")
                val body = resp.body?.string() ?: throw RuntimeException("Empty response")
                parse(JSONArray(body), today)
            }
        }

    private fun parse(events: JSONArray, today: String): List<PlannedWorkout> {
        val out = ArrayList<PlannedWorkout>()
        for (i in 0 until events.length()) {
            val ev = events.getJSONObject(i)
            val start = ev.optString("start_date_local", "")
            if (!start.startsWith(today)) continue
            val doc = ev.optJSONObject("workout_doc") ?: continue
            val ftp = doc.optDouble("ftp", 0.0)
            val segs = ArrayList<Segment>()
            doc.optJSONArray("steps")?.let { flatten(it, segs, ftp) }
            if (segs.isEmpty()) continue
            out.add(PlannedWorkout(
                id = ev.optLong("id"),
                name = ev.optString("name", "Workout"),
                description = doc.optString("description", ""),
                segments = segs
            ))
        }
        return out
    }

    /** Recursively flatten workout_doc steps (reps, nested steps) into segments in watts. */
    private fun flatten(steps: JSONArray, out: MutableList<Segment>, ftp: Double, reps: Int = 1) {
        for (i in 0 until steps.length()) {
            val s = steps.getJSONObject(i)
            val repsHere = if (s.isNull("reps")) 1 else s.optInt("reps", 1)
            val children = s.optJSONArray("steps")
            if (children != null) {
                repeat(repsHere * reps) { flatten(children, out, ftp, 1) }
                continue
            }
            val dur = s.optInt("duration", 0)
            if (dur <= 0) continue
            val (a, b) = resolvedWatts(s, ftp)
            val text = s.optString("text", "")
            repeat(repsHere * reps) { out.add(Segment(dur, a, b, text)) }
        }
    }

    // Resolved watts come from "_power" when resolve=true, otherwise "power" (%ftp).
    private fun resolvedWatts(step: JSONObject, ftp: Double): Pair<Double, Double> {
        val p = step.optJSONObject("_power")
        if (p != null) {
            val v = p.optDouble("value", Double.NaN)
            val a = p.optDouble("start", Double.NaN)
            val b = p.optDouble("end", Double.NaN)
            if (!v.isNaN()) return v to v
            if (!a.isNaN() && !b.isNaN()) return a to b
        }
        val raw = step.optJSONObject("power") ?: return 0.0 to 0.0
        val scale = if (raw.optString("units", "%ftp").contains("%ftp")) ftp / 100.0 else 1.0
        val v = raw.optDouble("value", Double.NaN)
        val a = raw.optDouble("start", Double.NaN)
        val b = raw.optDouble("end", Double.NaN)
        if (!v.isNaN()) return v * scale to v * scale
        if (!a.isNaN() && !b.isNaN()) return a * scale to b * scale
        return 0.0 to 0.0
    }
}
