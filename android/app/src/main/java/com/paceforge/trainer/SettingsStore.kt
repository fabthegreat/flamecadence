package com.paceforge.trainer

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.settings by preferencesDataStore("settings")

data class AppSettings(val apiKey: String, val athleteId: String)

object SettingsStore {
    private val KEY_API = stringPreferencesKey("icu_api_key")
    private val KEY_ATHLETE = stringPreferencesKey("icu_athlete_id")

    fun flow(ctx: Context): Flow<AppSettings> = ctx.settings.data.map { p ->
        AppSettings(p[KEY_API] ?: "", p[KEY_ATHLETE].let { if (it.isNullOrEmpty()) "0" else it })
    }

    suspend fun save(ctx: Context, apiKey: String, athleteId: String) {
        ctx.settings.edit { it[KEY_API] = apiKey.trim(); it[KEY_ATHLETE] = athleteId.trim().ifEmpty { "0" } }
    }
}
