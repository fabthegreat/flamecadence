package com.paceforge.trainer.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.paceforge.trainer.IcuRepository
import com.paceforge.trainer.PlannedWorkout
import com.paceforge.trainer.SettingsStore
import com.paceforge.trainer.WeekSummary
import com.paceforge.trainer.ble.FtmsCenter
import kotlinx.coroutines.launch

@Composable
fun App(onPlay: () -> Unit) {
    var screen by remember { mutableStateOf("home") }
    var selected by remember { mutableStateOf<PlannedWorkout?>(null) }

    BackHandler(enabled = screen == "settings" || screen == "devices") { screen = "home" }

    // Each screen draws its own header (see prototype); Scaffold only supplies the insets.
    Scaffold(containerColor = MaterialTheme.colorScheme.background) { pad ->
        when (screen) {
            "home" -> HomeScreen(pad,
                onSettings = { screen = "settings" },
                onDevices = { screen = "devices" },
                onPlayWorkout = { w -> selected = w; onPlay(); screen = "player" })
            "settings" -> SettingsScreen(pad) { screen = "home" }
            "devices" -> DevicesScreen(pad) { screen = "home" }
            "player" -> PlayerScreen(pad, selected, onExit = { screen = "home" })
        }
    }
}

// ------------------------------------------------------------------- HOME

@Composable
private fun HomeHeader(onSettings: () -> Unit, onDevices: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(start = 4.dp, end = 4.dp, top = 6.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ForgeLogo(34.dp)
            Text("PaceForge", fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
        Row {
            LinkText("Settings", onSettings)
            LinkText("Devices", onDevices)
        }
    }
}

@Composable
private fun LinkText(text: String, onClick: () -> Unit) {
    Text(text, fontSize = 12.sp, color = Forge.Link,
        modifier = Modifier.clip(RoundedCornerShape(8.dp))
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 10.dp))
}

@Composable
fun HomeScreen(
    pad: PaddingValues,
    onSettings: () -> Unit,
    onDevices: () -> Unit,
    onPlayWorkout: (PlannedWorkout) -> Unit
) {
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val settings by SettingsStore.flow(ctx).collectAsStateWithLifecycle(initialValue = null)
    var workouts by remember { mutableStateOf<List<PlannedWorkout>>(emptyList()) }
    var week by remember { mutableStateOf<WeekSummary?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var retry by remember { mutableStateOf(0) }
    val trainer by FtmsCenter.trainerState.collectAsState()
    val trainerName by FtmsCenter.trainerName.collectAsState()
    val ergOk by FtmsCenter.ergAvailable.collectAsState()

    // Fetch only once the settings are actually loaded from disk, and re-run on Retry.
    val apiKey = settings?.apiKey.orEmpty()
    val athleteId = settings?.athleteId ?: "0"
    LaunchedEffect(apiKey, athleteId, retry) {
        if (apiKey.isBlank()) return@LaunchedEffect
        loading = true; error = null
        try { workouts = IcuRepository.fetchUpcoming(apiKey, athleteId, 7) }
        catch (e: Exception) { error = e.message }
        loading = false
        if (error == null) week = IcuRepository.fetchWeek(apiKey, athleteId)
    }

    Column(Modifier.fillMaxSize().padding(pad).padding(horizontal = 16.dp)) {
        HomeHeader(onSettings, onDevices)
        TrainerPill(trainer, trainerName, ergOk)

        val s = settings
        when {
            s == null -> CenteredSpinner()
            s.apiKey.isBlank() -> Text("Set your intervals.icu API key in Settings first.",
                color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 16.dp))
            loading -> CenteredSpinner()
            error != null -> Column(Modifier.padding(top = 16.dp)) {
                Text("Error: $error", color = MaterialTheme.colorScheme.error)
                Spacer(Modifier.height(8.dp))
                GhostButton("Retry", Modifier.fillMaxWidth()) { retry++ }
            }
            workouts.isEmpty() -> Text("No planned workout in the next 7 days. Plan one on intervals.icu.",
                color = Forge.Muted, modifier = Modifier.padding(top = 16.dp))
            else -> LazyColumn(contentPadding = PaddingValues(bottom = 16.dp)) {
                val today = IcuRepository.todayIso()
                val todays = workouts.filter { it.date <= today }
                val later = workouts.filter { it.date > today }
                if (todays.isEmpty()) {
                    item { Text("No workout planned for today.", color = Forge.Muted,
                        modifier = Modifier.padding(top = 8.dp)) }
                } else {
                    item { SectionTitle("Today's planned workout${if (todays.size > 1) "s" else ""}") }
                    items(todays) { w ->
                        WorkoutCard(w, trainer, onPlayWorkout)
                        Spacer(Modifier.height(8.dp))
                    }
                }
                if (later.isNotEmpty()) {
                    item { SectionTitle("Coming up") }
                    items(later) { w ->
                        WorkoutCard(w, trainer, onPlayWorkout, playable = false, dayLabel = dayLabel(w.date))
                        Spacer(Modifier.height(8.dp))
                    }
                }
                val wk = week
                if (wk != null && (wk.ctlDelta != null || wk.nextName != null)) {
                    item { SectionTitle("This week") }
                    item { WeekCard(wk) }
                }
            }
        }
    }
}

@Composable
private fun CenteredSpinner() {
    Box(Modifier.fillMaxWidth().padding(top = 32.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
private fun TrainerPill(state: FtmsCenter.ConnState, name: String, ergOk: Boolean) {
    when (state) {
        FtmsCenter.ConnState.CONNECTED ->
            if (ergOk) StatusPill((name.ifBlank { "Smart trainer" }) + " · connected", Forge.Green)
            else StatusPill((name.ifBlank { "Smart trainer" }) + " · connected (read-only)", Forge.Warn)
        FtmsCenter.ConnState.CONNECTING -> StatusPill("Trainer connecting…", Forge.Warn)
        FtmsCenter.ConnState.DISCONNECTED -> StatusPill("No trainer connected", Forge.Muted)
    }
}

private fun dayLabel(date: String): String = try {
    val d = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).parse(date)!!
    java.text.SimpleDateFormat("EEE d MMM", java.util.Locale.getDefault()).format(d)
} catch (e: Exception) { date }

@Composable
private fun WorkoutCard(
    w: PlannedWorkout,
    trainer: FtmsCenter.ConnState,
    onPlay: (PlannedWorkout) -> Unit,
    playable: Boolean = true,
    dayLabel: String? = null
) {
    val connected = trainer == FtmsCenter.ConnState.CONNECTED
    ForgeCard {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically) {
            Text(w.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, modifier = Modifier.weight(1f))
            Spacer(Modifier.width(8.dp))
            if (!playable) StatusPill(dayLabel ?: "", Forge.Muted)
            else if (connected) StatusPill("Ready", Forge.Green) else StatusPill("No trainer", Forge.Muted)
        }
        Text("${w.totalSec / 60} min · ${w.segments.size} steps · from intervals.icu",
            fontSize = 12.sp, color = Forge.Muted, modifier = Modifier.padding(top = 3.dp))
        // Miniature power-profile preview
        WorkoutChart(w.segments, w.totalSec, 0, emptyList(),
            Modifier.fillMaxWidth().height(96.dp).padding(top = 10.dp), compact = true)
        if (w.description.isNotBlank())
            Text(w.description.take(140), fontSize = 12.sp, color = Forge.Faint, maxLines = 3,
                lineHeight = 17.sp, modifier = Modifier.padding(top = 7.dp))
        if (playable) PrimaryButton(
            if (connected) "▶  Play on trainer" else "Pair a trainer first (Devices)",
            Modifier.fillMaxWidth().padding(top = 12.dp), enabled = connected
        ) { onPlay(w) }
    }
}

@Composable
private fun WeekCard(wk: WeekSummary) {
    ForgeCard {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                wk.ctlDelta?.let {
                    Text("Fitness (CTL) ${"%+d".format(it)}", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                }
                val next = wk.nextName
                if (next != null)
                    Text("Next: $next${wk.nextWhen?.let { " · $it" } ?: ""}",
                        fontSize = 12.sp, color = Forge.Faint, modifier = Modifier.padding(top = 3.dp))
            }
            wk.loadLabel?.let { Spacer(Modifier.width(8.dp)); StatusPill("Load: $it", Forge.Warn) }
        }
    }
}

// --------------------------------------------------------------- SETTINGS

@Composable
fun SettingsScreen(pad: PaddingValues, onBack: () -> Unit) {
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val settings by SettingsStore.flow(ctx).collectAsStateWithLifecycle(initialValue = null)
    var key by remember { mutableStateOf<String?>(null) }
    var athlete by remember { mutableStateOf<String?>(null) }
    var autoUpload by remember { mutableStateOf<Boolean?>(null) }
    var beep by remember { mutableStateOf<Boolean?>(null) }
    var awake by remember { mutableStateOf<Boolean?>(null) }
    val scope = rememberCoroutineScope()

    // Don't touch the fields until the saved settings are loaded: previously the
    // screen could briefly show empty fields while DataStore was still reading,
    // and saving then would overwrite the key with a blank one.
    val loaded = settings
    val apiKey = key ?: loaded?.apiKey ?: ""
    val athleteId = athlete ?: loaded?.athleteId ?: ""

    Column(Modifier.fillMaxSize().padding(pad).padding(horizontal = 16.dp).verticalScroll(rememberScrollState())) {
        BackHeader("Settings", onBack)
        SectionTitle("intervals.icu connection")
        if (loaded == null) {
            CenteredSpinner()
        } else {
            FieldLabel(if (loaded.apiKey.isNotBlank()) "API KEY (SAVED)" else "API KEY")
            ForgeField(apiKey, { key = it }, password = true)
            Spacer(Modifier.height(10.dp))
            FieldLabel("ATHLETE ID (0 = KEY OWNER)")
            ForgeField(athleteId, { athlete = it })
            Text("Create your key on intervals.icu → Settings → Developer settings. It is stored " +
                "encrypted on this device only and never leaves it except to call the intervals.icu API.",
                fontSize = 11.sp, lineHeight = 16.sp, color = Forge.Faint,
                modifier = Modifier.padding(top = 8.dp))

            SectionTitle("Preferences")
            ToggleRow("Auto-upload finished rides", "Skip the save prompt",
                autoUpload ?: loaded.autoUpload) { autoUpload = it }
            ToggleRow("Beep at interval change", "Audio cue 3 s before",
                beep ?: loaded.beep) { beep = it }
            ToggleRow("Keep screen awake", "During workouts",
                awake ?: loaded.keepAwake) { awake = it }

            PrimaryButton("Save", Modifier.padding(top = 16.dp).widthIn(min = 160.dp)) {
                scope.launch {
                    SettingsStore.save(ctx, apiKey, athleteId,
                        autoUpload ?: loaded.autoUpload, beep ?: loaded.beep, awake ?: loaded.keepAwake)
                    onBack()
                }
            }
        }
    }
}

@Composable
private fun FieldLabel(text: String) {
    Text(text, fontSize = 11.sp, color = Forge.Muted, modifier = Modifier.padding(bottom = 5.dp))
}

@Composable
private fun ForgeField(value: String, onChange: (String) -> Unit, password: Boolean = false) {
    OutlinedTextField(
        value = value, onValueChange = onChange, singleLine = true,
        visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None,
        shape = RoundedCornerShape(10.dp),
        textStyle = androidx.compose.ui.text.TextStyle(fontSize = 13.sp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = Forge.Field, unfocusedContainerColor = Forge.Field,
            focusedBorderColor = MaterialTheme.colorScheme.primary, unfocusedBorderColor = Forge.FieldBorder),
        modifier = Modifier.fillMaxWidth()
    )
}

@Composable
private fun ToggleRow(title: String, desc: String, on: Boolean, onToggle: (Boolean) -> Unit) {
    Column {
        Row(
            Modifier.fillMaxWidth().clickable(role = Role.Switch) { onToggle(!on) }
                .padding(horizontal = 2.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(title, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Text(desc, fontSize = 11.sp, color = Forge.Faint, modifier = Modifier.padding(top = 2.dp))
            }
            Text(if (on) "ON" else "OFF", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold,
                letterSpacing = 0.5.sp, color = if (on) Color(0xFF2ECC71) else Forge.Off)
        }
        HorizontalDivider(color = Forge.RowLine)
    }
}

// ---------------------------------------------------------------- DEVICES

@Composable
fun DevicesScreen(pad: PaddingValues, onBack: () -> Unit) {
    val trainerState by FtmsCenter.trainerState.collectAsState()
    val hrState by FtmsCenter.hrState.collectAsState()
    val trainerName by FtmsCenter.trainerName.collectAsState()
    val hrName by FtmsCenter.hrName.collectAsState()
    val scanning by FtmsCenter.scanningState.collectAsState()
    val results by FtmsCenter.scanResults.collectAsState(initial = emptyList())

    // Start scanning on entry (the list is sorted by signal strength), stop on exit.
    DisposableEffect(Unit) {
        FtmsCenter.startScan()
        onDispose { FtmsCenter.stopScan() }
    }

    Column(Modifier.fillMaxSize().padding(pad).padding(horizontal = 16.dp).verticalScroll(rememberScrollState())) {
        BackHeader("Devices", onBack)
        SectionTitle("Paired devices")
        DeviceRow("Smart trainer", trainerName, trainerState)
        DeviceRow("Heart rate", hrName, hrState)

        SectionTitle("Scan")
        results.forEach { hit ->
            key(hit.device.address) {
                val kind = if (hit.isTrainer)
                    "Smart trainer" + if (hit.protocol.isNotBlank()) " (${hit.protocol})" else ""
                else "Heart rate"
                val shape = RoundedCornerShape(12.dp)
                Row(
                    Modifier.fillMaxWidth().padding(top = 8.dp)
                        .clip(shape).background(Forge.ChipBg).border(1.dp, Color(0xFF212C39), shape)
                        .clickable(role = Role.Button) { FtmsCenter.connect(hit) }
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(hit.name, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        Text("$kind · ${hit.rssi.toString().replace('-', '−')} dBm",
                            fontSize = 11.sp, color = Forge.Faint, modifier = Modifier.padding(top = 2.dp))
                    }
                    Text("CONNECT", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 0.5.sp, color = Forge.Warn)
                }
            }
        }
        Text("Tacx trainers that don't advertise FTMS are detected via Cycling Power / FE-C " +
            "and run in read-only mode (no ERG).",
            fontSize = 11.sp, lineHeight = 16.sp, color = Forge.Faint, modifier = Modifier.padding(top = 8.dp))
        GhostButton(if (scanning) "Stop scan" else "Scan for devices",
            Modifier.fillMaxWidth().padding(top = 12.dp)) {
            if (scanning) FtmsCenter.stopScan() else FtmsCenter.startScan()
        }
        if (scanning) {
            Box(Modifier.fillMaxWidth().padding(top = 14.dp, bottom = 16.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(Modifier.size(26.dp), strokeWidth = 3.dp)
            }
        }
    }
}

@Composable
private fun DeviceRow(label: String, name: String, state: FtmsCenter.ConnState) {
    val (text, color) = when (state) {
        FtmsCenter.ConnState.CONNECTED -> "CONNECTED" to Color(0xFF2ECC71)
        FtmsCenter.ConnState.CONNECTING -> "CONNECTING" to Forge.Warn
        FtmsCenter.ConnState.DISCONNECTED -> "NOT CONNECTED" to Forge.Off
    }
    Column {
        Row(Modifier.fillMaxWidth().padding(horizontal = 2.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(label, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Text(name.ifBlank { "—" }, fontSize = 11.sp, color = Forge.Faint, modifier = Modifier.padding(top = 2.dp))
            }
            Text(text, color = color, fontWeight = FontWeight.ExtraBold, fontSize = 11.sp, letterSpacing = 0.5.sp)
        }
        HorizontalDivider(color = Forge.RowLine)
    }
}
