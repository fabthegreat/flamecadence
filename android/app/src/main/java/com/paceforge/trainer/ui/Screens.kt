@file:OptIn(ExperimentalMaterial3Api::class)

package com.paceforge.trainer.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
        TopAppBar(title = { Text("PaceForge Trainer") }, actions = {
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

@Composable
fun HomeScreen(pad: PaddingValues, onPlayWorkout: (PlannedWorkout) -> Unit) {
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val settings by SettingsStore.flow(ctx).collectAsStateWithLifecycle(initialValue = AppSettings("", "0"))
    var workouts by remember { mutableStateOf<List<PlannedWorkout>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val trainer by FtmsCenter.trainerState.collectAsState()

    LaunchedEffect(settings.apiKey) {
        if (settings.apiKey.isBlank()) return@LaunchedEffect
        loading = true; error = null
        try { workouts = IcuRepository.fetchToday(settings.apiKey, settings.athleteId) }
        catch (e: Exception) { error = e.message }
        loading = false
    }

    Column(Modifier.fillMaxSize().padding(pad).padding(16.dp)) {
        when {
            settings.apiKey.isBlank() -> Text("Set your intervals.icu API key in Settings first.",
                color = MaterialTheme.colorScheme.error)
            loading -> CircularProgressIndicator()
            error != null -> Text("Error: $error", color = MaterialTheme.colorScheme.error)
            workouts.isEmpty() -> Text("No planned workout for today. Plan one on intervals.icu.")
            else -> {
                Text("Today's planned workout(s)", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                LazyColumn {
                    items(workouts) { w ->
                        Card(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                            Column(Modifier.padding(14.dp)) {
                                Text(w.name, fontWeight = FontWeight.SemiBold)
                                Text("${w.totalSec / 60} min · ${w.segments.size} steps",
                                    fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                if (w.description.isNotBlank())
                                    Text(w.description.take(140), fontSize = 12.sp, maxLines = 3)
                                Spacer(Modifier.height(8.dp))
                                Button(
                                    enabled = trainer == FtmsCenter.ConnState.CONNECTED,
                                    onClick = { onPlayWorkout(w) }
                                ) {
                                    Text(if (trainer == FtmsCenter.ConnState.CONNECTED) "Play on trainer"
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
    val settings by SettingsStore.flow(ctx).collectAsStateWithLifecycle(initialValue = AppSettings("", "0"))
    var key by remember { mutableStateOf<String?>(null) }
    var athlete by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val apiKey = key ?: settings.apiKey
    val athleteId = athlete ?: settings.athleteId

    Column(Modifier.fillMaxSize().padding(pad).padding(16.dp)) {
        Text("intervals.icu connection", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(value = apiKey, onValueChange = { key = it }, label = { Text("API Key") },
            modifier = Modifier.fillMaxWidth(), singleLine = true)
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(value = athleteId, onValueChange = { athlete = it },
            label = { Text("Athlete ID (0 = key owner)") },
            modifier = Modifier.fillMaxWidth(), singleLine = true)
        Spacer(Modifier.height(8.dp))
        Text("Settings → Developer Settings on intervals.icu to find your API key.",
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
                        Text((if (hit.isTrainer) "Smart trainer (FTMS)" else "Heart rate") + " · ${hit.rssi} dBm") },
                    trailingContent = { OutlinedButton(onClick = { FtmsCenter.connect(hit) }) { Text("Connect") } })
            }
        }
    }
}

@Composable
private fun DeviceRow(label: String, name: String, state: FtmsCenter.ConnState) {
    val color = when (state) {
        FtmsCenter.ConnState.CONNECTED -> Color(0xFF1D7A3A)
        FtmsCenter.ConnState.CONNECTING -> Color(0xFFB8860B)
        FtmsCenter.ConnState.DISCONNECTED -> MaterialTheme.colorScheme.error
    }
    Card(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Row(Modifier.padding(14.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column { Text(label, fontWeight = FontWeight.SemiBold); Text(name.ifBlank { "—" }) }
            Text(state.name, color = color, fontWeight = FontWeight.Bold)
        }
    }
}
