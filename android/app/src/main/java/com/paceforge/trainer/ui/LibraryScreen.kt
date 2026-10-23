package com.paceforge.trainer.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.paceforge.trainer.LibTheme
import com.paceforge.trainer.LibWorkout
import com.paceforge.trainer.Library
import com.paceforge.trainer.PlannedWorkout
import com.paceforge.trainer.SettingsStore
import com.paceforge.trainer.ble.FtmsCenter
import kotlinx.coroutines.launch

/** Duration buckets of the web app: (label, lo min, hi min) — a workout matches when lo < duration <= hi. */
private data class DurBucket(val label: String, val lo: Int, val hi: Int)

private val DURATIONS = listOf(
    DurBucket("≤ 30 min", 0, 30), DurBucket("30–45 min", 30, 45), DurBucket("45–60 min", 45, 60),
    DurBucket("60–75 min", 60, 75), DurBucket("75–90 min", 75, 90), DurBucket("90–105 min", 90, 105),
    DurBucket("105–120 min", 105, 120), DurBucket("> 120 min", 120, Int.MAX_VALUE)
)

/** Built-in workout library (same workouts and filters as the PaceForge web app). */
@Composable
fun LibraryScreen(
    pad: PaddingValues,
    onBack: () -> Unit,
    onSettings: () -> Unit,
    onPlayWorkout: (PlannedWorkout) -> Unit
) {
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val scope = rememberCoroutineScope()
    val settings by SettingsStore.flow(ctx).collectAsStateWithLifecycle(initialValue = null)
    val trainer by FtmsCenter.trainerState.collectAsState()
    val fr = remember { Library.isFrench() }

    var all by remember { mutableStateOf<List<LibWorkout>>(emptyList()) }
    var loadError by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        try { all = Library.load(ctx) } catch (e: Exception) { loadError = e.message }
    }

    var query by remember { mutableStateOf("") }
    var theme by remember { mutableStateOf<LibTheme?>(null) }
    var duration by remember { mutableStateOf<DurBucket?>(null) }
    var starOnly by remember { mutableStateOf(false) }

    val stars = settings?.stars ?: emptySet()
    val ftpSet = settings?.ftp ?: 0
    val ftp = if (ftpSet > 0) ftpSet.toDouble() else 200.0   // preview FTP until the rider sets theirs

    val durSel = duration
    val shown = remember(all, query, theme, durSel, starOnly, stars, fr) {
        val words = query.trim().lowercase().split(Regex("\\s+")).filter { it.isNotEmpty() }
        all.filter { w ->
            (theme == null || w.theme == theme) &&
                (!starOnly || w.id in stars) &&
                (durSel == null || (w.durationSec > durSel.lo * 60L && w.durationSec <= durSel.hi * 60L)) &&
                (words.isEmpty() || "${w.nameEn} ${w.nameFr} ${w.infoEn} ${w.infoFr}".lowercase().let { hay -> words.all { it in hay } })
        }
    }
    val groups = remember(shown) { LibTheme.values().map { t -> t to shown.filter { it.theme == t } }.filter { it.second.isNotEmpty() } }
    val s0 = settings

    Column(Modifier.fillMaxSize().padding(pad).padding(horizontal = 16.dp)) {
        BackHeader("Workout library", onBack)

        // Everything scrolls together so the list keeps room on small screens.
        LazyColumn(contentPadding = PaddingValues(bottom = 16.dp)) {
            if (s0 != null) item(key = "ftp") {
                ForgeCard {
                    Text("Your FTP", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Text(if (ftpSet > 0) "Watts are computed from it." else "Set it to ride these workouts — charts use 200 W as a preview until then.",
                        fontSize = 12.sp, color = Forge.Muted, modifier = Modifier.padding(top = 3.dp, bottom = 8.dp))
                    FtpPicker(s0.apiKey, s0.athleteId, ftpSet) { v -> scope.launch { SettingsStore.saveFtp(ctx, v) } }
                }
                Spacer(Modifier.height(8.dp))
            }
            item(key = "filters") {
                Column {
                    OutlinedTextField(
                        value = query, onValueChange = { query = it }, singleLine = true,
                        placeholder = { Text("Search workouts…", fontSize = 13.sp, color = Forge.Faint) },
                        shape = RoundedCornerShape(10.dp), textStyle = TextStyle(fontSize = 13.sp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Forge.Field, unfocusedContainerColor = Forge.Field,
                            focusedBorderColor = MaterialTheme.colorScheme.primary, unfocusedBorderColor = Forge.FieldBorder),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(4.dp))
                    FilterRow(listOf("All") + LibTheme.values().map { "${it.icon} ${it.label(fr)}" },
                        theme?.let { "${it.icon} ${it.label(fr)}" } ?: "All") { sel ->
                        theme = LibTheme.values().firstOrNull { "${it.icon} ${it.label(fr)}" == sel }
                    }
                    FilterRow(listOf("All durations") + DURATIONS.map { it.label }, durSel?.label ?: "All durations") { sel ->
                        duration = DURATIONS.firstOrNull { it.label == sel }
                    }
                    FilterRow(listOf(if (starOnly) "★ Starred only" else "☆ Starred only"), if (starOnly) "★ Starred only" else "") { starOnly = !starOnly }
                }
            }
            when {
                loadError != null -> item(key = "err") { Text("Could not load the library: $loadError",
                    color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 16.dp)) }
                all.isEmpty() -> item(key = "loading") { Text("Loading…", color = Forge.Muted, modifier = Modifier.padding(top = 16.dp)) }
                shown.isEmpty() -> item(key = "none") { Text("No workout matches these filters.", color = Forge.Muted, modifier = Modifier.padding(top = 16.dp)) }
                else -> {
                    item(key = "count") {
                        Text("${all.size} workouts" + if (shown.size != all.size) " · ${shown.size} shown" else "",
                            fontSize = 12.sp, color = Forge.Muted, modifier = Modifier.padding(vertical = 6.dp))
                    }
                    groups.forEach { (t, list) ->
                        item(key = "h-${t.id}") {
                            Text("${t.icon}  ${t.label(fr)}  ·  ${list.size}", fontWeight = FontWeight.Bold,
                                fontSize = 13.sp, color = Forge.Amber, modifier = Modifier.padding(top = 10.dp, bottom = 8.dp))
                        }
                        items(list.size, key = { list[it].id }) { i ->
                            val lw = list[i]
                            val planned = remember(lw.id, ftp, fr) { lw.toPlanned(ftp, fr) }
                            Column {
                                WorkoutCard(
                                    planned, trainer, onPlayWorkout,
                                    playable = ftpSet > 0,
                                    source = t.label(fr),
                                    starred = lw.id in stars,
                                    onStar = { scope.launch { SettingsStore.toggleStar(ctx, lw.id) } }
                                )
                                Spacer(Modifier.height(8.dp))
                            }
                        }
                    }
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
