package com.paceforge.trainer

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.settings by preferencesDataStore("settings")

data class AppSettings(
    val apiKey: String,
    val athleteId: String,
    /** Skip the save prompt and upload the finished ride straight away. */
    val autoUpload: Boolean = true,
    /** Audio cue 3 s before each interval change. */
    val beep: Boolean = false,
    /** Keep the screen on while the player is open. */
    val keepAwake: Boolean = true
)

object SettingsStore {
    private val KEY_API = stringPreferencesKey("icu_api_key")
    private val KEY_ATHLETE = stringPreferencesKey("icu_athlete_id")
    private val KEY_AUTO_UPLOAD = booleanPreferencesKey("auto_upload")
    private val KEY_BEEP = booleanPreferencesKey("beep_interval")
    private val KEY_AWAKE = booleanPreferencesKey("keep_awake")

    /**
     * Emits null until the persisted file has actually been read, so the UI can
     * tell "still loading" apart from "no API key saved" — this was the source of
     * the app occasionally asking to re-enter a key that was in fact saved.
     * The API key is stored encrypted (see [SecretBox]) and decrypted here.
     */
    fun flow(ctx: Context): Flow<AppSettings?> = ctx.settings.data.map { p ->
        AppSettings(
            apiKey = SecretBox.decrypt(p[KEY_API] ?: ""),
            athleteId = p[KEY_ATHLETE].let { if (it.isNullOrEmpty()) "0" else it },
            autoUpload = p[KEY_AUTO_UPLOAD] ?: true,
            beep = p[KEY_BEEP] ?: false,
            keepAwake = p[KEY_AWAKE] ?: true
        )
    }

    suspend fun save(
        ctx: Context, apiKey: String, athleteId: String,
        autoUpload: Boolean, beep: Boolean, keepAwake: Boolean
    ) {
        ctx.settings.edit {
            it[KEY_API] = SecretBox.encrypt(apiKey.trim())
            it[KEY_ATHLETE] = athleteId.trim().ifEmpty { "0" }
            it[KEY_AUTO_UPLOAD] = autoUpload
            it[KEY_BEEP] = beep
            it[KEY_AWAKE] = keepAwake
        }
    }
}
