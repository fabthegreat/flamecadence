package com.paceforge.trainer

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.Locale

/** The 8 categories of the web app's library, in the same order. */
enum class LibTheme(val id: String, val icon: String, val en: String, val fr: String) {
    BEGINNER("beginner", "🌱", "Beginner & Short Sessions", "Débutant & séances courtes"),
    RECOVERY("recovery", "🌿", "Recovery & Taper", "Récupération & affûtage"),
    ENDURANCE("endurance", "🚴", "Endurance", "Endurance"),
    TEMPO("tempo", "📈", "Tempo & Sweet Spot", "Tempo & sweet spot"),
    THRESHOLD("threshold", "🔥", "Threshold", "Seuil"),
    VO2MAX("vo2max", "⚡", "VO₂ Max & Anaerobic", "VO₂ Max & anaérobie"),
    SPRINT("sprint", "💥", "Sprint & Race", "Sprint & course"),
    TESTING("testing", "🎯", "Testing", "Tests");

    fun label(fr: Boolean) = if (fr) this.fr else en

    companion object {
        fun of(id: String) = values().firstOrNull { it.id == id } ?: ENDURANCE
    }
}

/**
 * A workout of the built-in library (same content as the PaceForge web app).
 * Power is stored as % of FTP, so the same workout is turned into watts with
 * the rider's own FTP (see [toPlanned]).
 */
data class LibWorkout(
    val id: String,
    val theme: LibTheme,
    val nameEn: String,
    val nameFr: String,
    val infoEn: String,
    val infoFr: String,
    val segments: List<Segment>,   // startW / endW hold % of FTP here
    val durationSec: Int
) {
    fun name(fr: Boolean) = if (fr && nameFr.isNotBlank()) nameFr else nameEn
    fun info(fr: Boolean) = if (fr && infoFr.isNotBlank()) infoFr else infoEn

    fun toPlanned(ftp: Double, fr: Boolean) = PlannedWorkout(
        id = id.hashCode().toLong(),
        name = name(fr),
        description = info(fr),
        segments = segments.map { it.copy(startW = it.startW * ftp / 100.0, endW = it.endW * ftp / 100.0) },
        ftp = ftp
    )
}

/** Loads assets/library.json (generated from the web app's library). */
object Library {
    fun isFrench(): Boolean = Locale.getDefault().language == "fr"

    suspend fun load(ctx: Context): List<LibWorkout> = withContext(Dispatchers.IO) {
        val text = ctx.assets.open("library.json").bufferedReader().use { it.readText() }
        parse(text)
    }

    /** Format: {"sections":[...], "workouts":[{id,theme,en,fr,ien,ifr,s:[[sec,startPct,endPct,sectionIdx],...]}]} */
    fun parse(text: String): List<LibWorkout> {
        val root = JSONObject(text)
        val secArr = root.getJSONArray("sections")
        val sections = List(secArr.length()) { secArr.getString(it) }
        val arr = root.getJSONArray("workouts")
        val out = ArrayList<LibWorkout>(arr.length())
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            val steps = o.getJSONArray("s")
            val segs = ArrayList<Segment>(steps.length())
            for (k in 0 until steps.length()) {
                val st = steps.getJSONArray(k)
                val dur = st.getInt(0)
                if (dur <= 0) continue
                segs.add(Segment(dur, st.getDouble(1), st.getDouble(2), sections.getOrElse(st.getInt(3)) { "" }))
            }
            if (segs.isEmpty()) continue
            out.add(LibWorkout(
                id = o.getString("id"),
                theme = LibTheme.of(o.optString("theme")),
                nameEn = o.optString("en", "Workout"),
                nameFr = o.optString("fr", ""),
                infoEn = o.optString("ien", ""),
                infoFr = o.optString("ifr", ""),
                segments = segs,
                durationSec = segs.sumOf { it.durationSec }
            ))
        }
        return out
    }
}
