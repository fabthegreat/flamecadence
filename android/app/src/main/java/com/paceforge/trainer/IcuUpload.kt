package com.paceforge.trainer

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

/** One 1 Hz sample of the ride. */
data class SessionPoint(val sec: Int, val watts: Int, val hr: Int, val cadence: Int)

/**
 * Uploads a recorded session to intervals.icu as a completed activity.
 * Docs: POST /api/v1/athlete/{id}/activities (multipart 'file', fit/tcx/gpx).
 * TCX is generated locally: no binary FIT writer needed.
 */
object IcuUpload {
    private val http = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    private fun basicAuth(apiKey: String): String =
        "Basic " + android.util.Base64.encodeToString("API_KEY:$apiKey".toByteArray(),
            android.util.Base64.NO_WRAP)

    /** Build a Garmin TCX (Biking) document from the session samples. */
    fun buildTcx(name: String, startMs: Long, points: List<SessionPoint>): String {
        val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        iso.timeZone = TimeZone.getTimeZone("UTC")
        val start = iso.format(Date(startMs))
        val sb = StringBuilder()
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
        sb.append("<TrainingCenterDatabase ")
        sb.append("xmlns=\"http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2\" ")
        sb.append("xmlns:ns3=\"http://www.garmin.com/xmlschemas/ActivityExtension/v2\">\n")
        sb.append("  <Activities>\n")
        sb.append("    <Activity Sport=\"Biking\">\n")
        sb.append("      <Id>$start</Id>\n")
        sb.append("      <Lap StartTime=\"$start\">\n")
        sb.append("        <TotalTimeSeconds>${points.lastOrNull()?.sec ?: 0}</TotalTimeSeconds>\n")
        sb.append("        <DistanceMeters>0</DistanceMeters>\n")
        sb.append("        <Intensity>Active</Intensity>\n")
        sb.append("        <TriggerMethod>Manual</TriggerMethod>\n")
        sb.append("        <Track>\n")
        for (p in points) {
            val t = iso.format(Date(startMs + p.sec * 1000L))
            sb.append("          <Trackpoint>\n")
            sb.append("            <Time>$t</Time>\n")
            if (p.hr > 0) sb.append("            <HeartRateBpm><Value>${p.hr}</Value></HeartRateBpm>\n")
            if (p.cadence > 0) sb.append("            <Cadence>${p.cadence}</Cadence>\n")
            sb.append("            <Extensions><ns3:TPX><ns3:Watts>${p.watts}</ns3:Watts></ns3:TPX></Extensions>\n")
            sb.append("          </Trackpoint>\n")
        }
        sb.append("        </Track>\n")
        sb.append("      </Lap>\n")
        sb.append("    </Activity>\n")
        sb.append("  </Activities>\n")
        sb.append("</TrainingCenterDatabase>\n")
        return sb.toString()
    }

    /**
     * Upload the recorded session. Returns the created intervals.icu activity id.
     * athleteId "0" = the athlete owning the API key.
     */
    suspend fun uploadTcx(
        apiKey: String,
        athleteId: String,
        name: String,
        startMs: Long,
        points: List<SessionPoint>
    ): String = withContext(Dispatchers.IO) {
        val tcx = buildTcx(name, startMs, points)
        val url = "https://intervals.icu/api/v1/athlete/$athleteId/activities" +
            "?name=" + URLEncoder.encode(name, "UTF-8")
        val body = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("file", "paceforge.tcx",
                tcx.toByteArray().toRequestBody("application/octet-stream".toMediaType()))
            .build()
        val req = Request.Builder()
            .url(url)
            .header("Authorization", basicAuth(apiKey))
            .post(body)
            .build()
        http.newCall(req).execute().use { resp ->
            val text = resp.body?.string() ?: ""
            if (!resp.isSuccessful)
                throw RuntimeException("intervals.icu HTTP ${resp.code}: ${text.take(200)}")
            JSONArray(text).optJSONObject(0)?.optString("id") ?: "ok"
        }
    }
}
