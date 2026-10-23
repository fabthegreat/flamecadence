package com.paceforge.trainer

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt

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
    val segments: List<Segment>,
    val date: String = "",     // yyyy-MM-dd (local)
    val ftp: Double = 0.0      // FTP the watts were resolved with (0 = unknown)
) {
    val totalSec: Int get() = segments.sumOf { it.durationSec }
}

/** Data for the Home "This week" card. Every field is optional: failures just hide it. */
data class WeekSummary(
    val ctlDelta: Int?,       // fitness (CTL) change over the last 7 days
    val loadLabel: String?,   // fresh / neutral / loaded / overloaded (from TSB = CTL - ATL)
    val nextName: String?,    // next planned workout after today
    val nextWhen: String?     // "tomorrow" or the weekday name
)

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

    fun todayIso(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    private fun basicAuth(apiKey: String): String =
        "Basic " + android.util.Base64.encodeToString("API_KEY:$apiKey".toByteArray(),
            android.util.Base64.NO_WRAP)

    /** Planned workouts from today through today + [days], sorted by date. */
    suspend fun fetchUpcoming(apiKey: String, athleteId: String, days: Int = 7): List<PlannedWorkout> =
        withContext(Dispatchers.IO) {
            val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val today = fmt.format(Date())
            val cal = Calendar.getInstance(); cal.add(Calendar.DAY_OF_YEAR, days)
            val last = fmt.format(cal.time)
            val url = "https://intervals.icu/api/v1/athlete/$athleteId/events" +
                "?category=WORKOUT&resolve=true&oldest=$today&newest=$last"
            val req = Request.Builder().url(url)
                .header("Authorization", basicAuth(apiKey))
                .build()

            http.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) throw RuntimeException("intervals.icu HTTP ${resp.code}")
                val body = resp.body?.string() ?: throw RuntimeException("Empty response")
                parse(JSONArray(body), null).sortedBy { it.date }
            }
        }

    private fun httpGet(url: String, apiKey: String): String {
        val req = Request.Builder().url(url).header("Authorization", basicAuth(apiKey)).build()
        http.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) throw RuntimeException("intervals.icu HTTP ${resp.code}")
            return resp.body?.string() ?: throw RuntimeException("Empty response")
        }
    }

    /**
     * Fitness trend (wellness endpoint) and the next planned workout, for the
     * Home "This week" card. Never throws: each half fails independently.
     */
    suspend fun fetchWeek(apiKey: String, athleteId: String): WeekSummary =
        withContext(Dispatchers.IO) {
            val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val cal = Calendar.getInstance()
            val today = fmt.format(cal.time)
            cal.add(Calendar.DAY_OF_YEAR, -7); val weekAgo = fmt.format(cal.time)
            cal.add(Calendar.DAY_OF_YEAR, 8); val tomorrow = fmt.format(cal.time)
            cal.add(Calendar.DAY_OF_YEAR, 13); val horizon = fmt.format(cal.time)
            val base = "https://intervals.icu/api/v1/athlete/$athleteId"

            var ctlDelta: Int? = null
            var load: String? = null
            try {
                val arr = JSONArray(httpGet("$base/wellness?oldest=$weekAgo&newest=$today", apiKey))
                var first: Double? = null
                var last: Double? = null
                var lastAtl: Double? = null
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    if (o.isNull("ctl")) continue
                    val c = o.optDouble("ctl")
                    if (first == null) first = c
                    last = c
                    lastAtl = if (o.isNull("atl")) null else o.optDouble("atl")
                }
                val f = first; val l = last; val a = lastAtl
                if (f != null && l != null) {
                    ctlDelta = (l - f).roundToInt()
                    if (a != null) load = loadLabel(l - a)
                }
            } catch (e: Exception) { }

            var nextName: String? = null
            var nextWhen: String? = null
            try {
                val arr = JSONArray(httpGet("$base/events?category=WORKOUT&oldest=$tomorrow&newest=$horizon", apiKey))
                var bestDate: String? = null
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    val d = o.optString("start_date_local", "").take(10)
                    if (d.length < 10) continue
                    if (bestDate == null || d < bestDate) {
                        bestDate = d
                        nextName = o.optString("name", "Workout")
                    }
                }
                bestDate?.let { d ->
                    nextWhen = if (d == tomorrow) "tomorrow"
                    else fmt.parse(d)?.let { SimpleDateFormat("EEEE", Locale.getDefault()).format(it) } ?: d
                }
            } catch (e: Exception) { }

            WeekSummary(ctlDelta, load, nextName, nextWhen)
        }

    /** Form (TSB = CTL - ATL) as a plain-language label. */
    private fun loadLabel(tsb: Double): String = when {
        tsb > 5 -> "fresh"
        tsb > -10 -> "neutral"
        tsb > -30 -> "loaded"
        else -> "overloaded"
    }

    private fun parse(events: JSONArray, onlyDate: String?): List<PlannedWorkout> {
        val out = ArrayList<PlannedWorkout>()
        for (i in 0 until events.length()) {
            val ev = events.getJSONObject(i)
            val start = ev.optString("start_date_local", "")
            if (onlyDate != null && !start.startsWith(onlyDate)) continue
            val doc = ev.optJSONObject("workout_doc") ?: continue
            val ftp = doc.optDouble("ftp", 0.0)
            val segs = ArrayList<Segment>()
            doc.optJSONArray("steps")?.let { flatten(it, segs, ftp) }
            if (segs.isEmpty()) continue
            out.add(PlannedWorkout(
                id = ev.optLong("id"),
                name = ev.optString("name", "Workout"),
                description = doc.optString("description", ""),
                segments = segs,
                date = start.take(10),
                ftp = ftp
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
