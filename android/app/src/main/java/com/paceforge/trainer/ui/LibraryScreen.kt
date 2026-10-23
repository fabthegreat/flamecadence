package com.paceforge.trainer.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.paceforge.trainer.LibWorkout
import com.paceforge.trainer.Library
import com.paceforge.trainer.PlannedWorkout
import com.paceforge.trainer.SettingsStore
import com.paceforge.trainer.ble.FtmsCenter

private val DURATIONS = listOf("Any", "≤ 45 min", "45–60", "60–90", "> 90 min")
private val INTENSITIES = listOf("Any", "Easy", "Moderate", "Hard")

private fun durationOk(w: LibWorkout, i: Int): Boolean {
    val m = w.durationSec / 60
    return when (i) { 1 -> m <= 45; 2 -> m in 46..60; 3 -> m in 61..90; 4 -> m > 90; else -> true }
}

private fun intensityOk(w: LibWorkout, i: Int): Boolean = when (i) {
    1 -> w.intensityFactor < 0.75
    2 -> w.intensityFactor >= 0.75 && w.intensityFactor < 0.88
    3 -> w.intensityFactor >= 0.88
    else -> true
}

/** Built-in workout library: lets a rider without an intervals.icu account pick a workout and ride. */
@Composable
fun LibraryScreen(
    pad: PaddingValues,
    onBack: () -> Unit,
    onSettings: () -> Unit,
    onPlayWorkout: (PlannedWorkout) -> Unit
) {
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val settings by SettingsStore.flow(ctx).collectAsStateWithLifecycle(initialValue = null)
    val trainer by FtmsCenter.trainerState.collectAsState()

    var all by remember { mutableStateOf<List<LibWorkout>>(emptyList()) }
    var loadError by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        try { all = Library.load(ctx) } catch (e: Exception) { loadError = e.message }
    }

    var category by remember { mutableStateOf<String?>(null) }
    var duration by remember { mutableStateOf(0) }
    var intensity by remember { mutableStateOf(0) }

    val ftpSet = settings?.ftp ?: 0
    val ftp = if (ftpSet > 0) ftpSet.toDouble() else 200.0   // preview FTP until the rider sets theirs
    val categories = remember(all) { all.map { it.category }.distinct() }
    val shown = remember(all, category, duration, intensity) {
        all.filter { (category == null || it.category == category) && durationOk(it, duration) && intensityOk(it, intensity) }
    }

    Column(Modifier.fillMaxSize().padding(pad).padding(horizontal = 16.dp)) {
        BackHeader("Workout library", onBack)

        if (settings != null && ftpSet <= 0) {
            ForgeCard {
                Text("Set your FTP to ride these workouts", fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, fontSize = 13.sp)
                Text("Watts are computed from your FTP. Charts below use 200 W as a preview.",
                    fontSize = 12.sp, color = Forge.Muted, modifier = Modifier.padding(top = 3.dp))
                GhostButton("Open Settings", Modifier.fillMaxWidth().padding(top = 10.dp)) { onSettings() }
            }
            Spacer(Modifier.height(8.dp))
        }

        FilterRow(listOf("All") + categories, category ?: "All") { category = if (it == "All") null else it }
        FilterRow(DURATIONS, DURATIONS[duration]) { duration = DURATIONS.indexOf(it) }
        FilterRow(INTENSITIES, INTENSITIES[intensity]) { intensity = INTENSITIES.indexOf(it) }

        when {
            loadError != null -> Text("Could not load the library: $loadError",
                color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 16.dp))
            shown.isEmpty() -> Text(if (all.isEmpty()) "Loading…" else "No workout matches these filters.",
                color = Forge.Muted, modifier = Modifier.padding(top = 16.dp))
            else -> LazyColumn(contentPadding = PaddingValues(top = 8.dp, bottom = 16.dp)) {
                items(shown, key = { it.id }) { lw ->
                    WorkoutCard(
                        lw.toPlanned(ftp), trainer, onPlayWorkout,
                        playable = ftpSet > 0,
                        source = "${lw.category} · TSS ${lw.tss}"
                    )
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
private fun FilterRow(options: List<String>, selected: String, onSelect: (String) -> Unit) {
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        options.forEach { FilterPill(it, it == selected) { onSelect(it) } }
    }
}

@Composable
private fun FilterPill(text: String, selected: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(20.dp)
    Box(
        Modifier.clip(shape)
            .background(if (selected) Forge.AccentChipBg else Forge.ChipBg)
            .border(1.dp, if (selected) Forge.AccentChipBorder else Forge.GhostBorder, shape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text, fontSize = 12.sp, color = if (selected) Forge.Amber else Forge.GhostText)
    }
}
