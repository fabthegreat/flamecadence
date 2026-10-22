@file:OptIn(ExperimentalMaterial3Api::class)

package com.paceforge.trainer.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.paceforge.trainer.AppSettings
import com.paceforge.trainer.IcuRepository
import com.paceforge.trainer.PlannedWorkout
import com.paceforge.trainer.SettingsStore
import com.paceforge.trainer.ble.FtmsCenter
import kotlinx.coroutines.launch

@Composable
fun App(onPlay: () -> Unit) {
    var screen by remember { mutableStateOf("home") }
    var selected by remember { mutableStateOf<PlannedWorkout?>(null) }

    Scaffold(topBar = {
        TopAppBar(title = { Text("PaceForge", fontWeight = FontWeight.Bold) }, actions = {
            TextButton(onClick = { screen = "settings" }) { Text("Settings") }
            TextButton(onClick = { screen = "devices" }) { Text("Devices") }
        })
    }) { pad ->
        when (screen) {
            "home" -> HomeScreen(pad, onPlayWorkout = { w -> selected = w; onPlay(); screen = "player" })
            "settings" -> SettingsScreen(pad) { screen = "home" }
            "devices" -> DevicesScreen(pad) { screen = "home" }
            "player" -> PlayerScreen(pad, selected, onExit = { screen = "home" })
        }
    }
}

/** Small rounded status badge, e.g. "Tacx NEO 2T · connected". */
@Composable
fun StatusPill(text: String, color: Color) {
    Surface(
        shape = RoundedCornerShape(50),
        color = color.copy(alpha = 0.12f),
        border = androidx.compose.foundation.BorderStroke(1.dp, color.copy(alpha = 0.4f))
    ) {
        Row(
            Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            androidx.compose.foundation.Canvas(Modifier.size(7.dp)) { drawCircle(color) }
            Text(text, fontSize = 11.sp, color = color)
        }
    }
}

@Composable
fun HomeScreen(pad: PaddingValues, onPlayWorkout: (PlannedWorkout) -> Unit) {
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val settings by SettingsStore.flow(ctx).collectAsStateWithLifecycle(initialValue = null)
    var workouts by remember { mutableStateOf<List<PlannedWorkout>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var retry by remember { mutableStateOf(0) }
    val trainer by FtmsCenter.trainerState.collectAsState()
    val trainerName by FtmsCenter.trainerName.collectAsState()

    // Fetch only once the settings are actually loaded from disk, and re-run on Retry.
    val apiKey = settings?.apiKey.orEmpty()
    val athleteId = settings?.athleteId ?: "0"
    LaunchedEffect(apiKey, retry) {
        if (apiKey.isBlank()) return@LaunchedEffect
        loading = true; error = null
        try { workouts = IcuRepository.fetchToday(apiKey, athleteId) }
        catch (e: Exception) { error = e.message }
        loading = false
    }

    Column(Modifier.fillMaxSize().padding(pad).padding(16.dp)) {
        val s = settings
        when {
            s == null -> CircularProgressIndicator()   // settings still loading
            s.apiKey.isBlank() -> Text("Set your intervals.icu API key in Settings first.",
                color = MaterialTheme.colorScheme.error)
            loading -> CircularProgressIndicator()
            error != null -> Column {
                Text("Error: $error", color = MaterialTheme.colorScheme.error)
                Spacer(Modifier.height(8.dp))
                Button(onClick = { retry++ }) { Text("Retry") }
            }
            workouts.isEmpty() -> Text("No planned workout for today. Plan one on intervals.icu.")
            else -> {
                StatusPill(
                    when (trainer) {
                        FtmsCenter.ConnState.CONNECTED ->
                            (trainerName.ifBlank { "Smart trainer" }) + " · connected"
                        FtmsCenter.ConnState.CONNECTING -> "Trainer connecting…"
                        FtmsCenter.ConnState.DISCONNECTED -> "No trainer connected"
                    },
                    when (trainer) {
                        FtmsCenter.ConnState.CONNECTED -> Color(0xFF57D98A)
                        FtmsCenter.ConnState.CONNECTING -> Color(0xFFFFC24D)
                        FtmsCenter.ConnState.DISCONNECTED -> Color(0xFF8A97A3)
                    }
                )
                Spacer(Modifier.height(12.dp))
                Text("Today's planned workout${if (workouts.size > 1) "s" else ""}",
                    fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                LazyColumn {
                    items(workouts) { w ->
                        ElevatedCard(
                            Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(Modifier.padding(14.dp)) {
                                Text(w.name, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                                Text("${w.totalSec / 60} min · ${w.segments.size} steps · from intervals.icu",
                                    fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                // Miniature power-profile preview
                                WorkoutChart(w.segments, w.totalSec, 0, emptyList(),
                                    Modifier.fillMaxWidth().height(64.dp).padding(top = 10.dp),
                                    compact = true)
                                if (w.description.isNotBlank())
                                    Text(w.description.take(140), fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 3, modifier = Modifier.padding(top = 8.dp))
                                Spacer(Modifier.height(10.dp))
                                Button(
                                    enabled = trainer == FtmsCenter.ConnState.CONNECTED,
                                    onClick = { onPlayWorkout(w) },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(if (trainer == FtmsCenter.ConnState.CONNECTED) "▶  Play on trainer"
                                         else "Pair a trainer first (Devices)")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsScreen(pad: PaddingValues, onBack: () -> Unit) {
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val settings by SettingsStore.flow(ctx).collectAsStateWithLifecycle(initialValue = null)
    var key by remember { mutableStateOf<String?>(null) }
    var athlete by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    // Don't touch the fields until the saved settings are loaded: previously the
    // screen could briefly show empty fields while DataStore was still reading,
    // and saving then would overwrite the key with a blank one.
    val loaded = settings
    val apiKey = key ?: loaded?.apiKey ?: ""
    val athleteId = athlete ?: loaded?.athleteId ?: ""

    Column(Modifier.fillMaxSize().padding(pad).padding(16.dp)) {
        Text("intervals.icu connection", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))
        if (loaded == null) {
            CircularProgressIndicator()
        } else {
            OutlinedTextField(value = apiKey, onValueChange = { key = it },
                label = { Text(if (apiKey.isNotBlank()) "API key (saved)" else "API key") },
                modifier = Modifier.fillMaxWidth(), singleLine = true)
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(value = athleteId, onValueChange = { athlete = it },
                label = { Text("Athlete ID (0 = key owner)") },
                modifier = Modifier.fillMaxWidth(), singleLine = true)
            Spacer(Modifier.height(8.dp))
            Text("Create your key on intervals.icu → Settings → Developer settings. " +
                "It is stored on this device only.",
                fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(12.dp))
            Row {
                Button(onClick = {
                    scope.launch {
                        SettingsStore.save(ctx, apiKey, athleteId)
                        onBack()
                    }
                }) { Text("Save") }
                Spacer(Modifier.width(8.dp))
                OutlinedButton(onClick = onBack) { Text("Cancel") }
            }
        }
    }
}

@Composable
fun DevicesScreen(pad: PaddingValues, onBack: () -> Unit) {
    val trainerState by FtmsCenter.trainerState.collectAsState()
    val hrState by FtmsCenter.hrState.collectAsState()
    val trainerName by FtmsCenter.trainerName.collectAsState()
    val hrName by FtmsCenter.hrName.collectAsState()
    var scanning by remember { mutableStateOf(false) }
    val results by FtmsCenter.scanResults.collectAsState(initial = emptyList())

    Column(Modifier.fillMaxSize().padding(pad).padding(16.dp)) {
        Text("Paired devices", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        DeviceRow("Smart trainer", trainerName, trainerState)
        DeviceRow("Heart rate", hrName, hrState)
        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Button(onClick = {
                if (!scanning) FtmsCenter.startScan() else FtmsCenter.stopScan()
                scanning = !scanning
            }) { Text(if (scanning) "Stop scan" else "Scan for devices") }
            if (scanning) { Spacer(Modifier.width(10.dp)); CircularProgressIndicator(Modifier.size(18.dp)) }
        }
        Spacer(Modifier.height(12.dp))
        LazyColumn {
            items(results, key = { it.device.address }) { hit ->
                ListItem(headlineContent = { Text(hit.name) },
                    supportingContent = {
                        Text((if (hit.isTrainer) "Smart trainer (FTMS/FE-C)" else "Heart rate") + " · ${hit.rssi} dBm") },
                    trailingContent = { OutlinedButton(onClick = { FtmsCenter.connect(hit) }) { Text("Connect") } })
            }
        }
        Text("Trainers that don't advertise FTMS (e.g. some Tacx NEO firmware) are detected " +
                "via Cycling Power / FE-C and run in read-only mode (no ERG).",
            fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun DeviceRow(label: String, name: String, state: FtmsCenter.ConnState) {
    val color = when (state) {
        FtmsCenter.ConnState.CONNECTED -> Color(0xFF2ECC71)
        FtmsCenter.ConnState.CONNECTING -> Color(0xFFFFC24D)
        FtmsCenter.ConnState.DISCONNECTED -> MaterialTheme.colorScheme.error
    }
    ElevatedCard(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Row(Modifier.padding(14.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column { Text(label, fontWeight = FontWeight.SemiBold); Text(name.ifBlank { "—" },
                fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            Text(state.name, color = color, fontWeight = FontWeight.Bold, fontSize = 11.sp)
        }
    }
}
