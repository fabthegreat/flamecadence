package com.paceforge.trainer.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paceforge.trainer.IcuFtp
import com.paceforge.trainer.IcuRepository

/**
 * FTP chooser. When intervals.icu is connected it offers the Indoor / Outdoor FTP values read
 * from the account (plus "Custom"); otherwise (no key, or the request failed) it is an empty
 * box to fill in. [onChange] receives the FTP in watts (0 = cleared).
 */
@Composable
fun FtpPicker(apiKey: String, athleteId: String, current: Int, onChange: (Int) -> Unit) {
    var loading by remember(apiKey, athleteId) { mutableStateOf(apiKey.isNotBlank()) }
    var ftps by remember(apiKey, athleteId) { mutableStateOf<IcuFtp?>(null) }
    var custom by remember { mutableStateOf(false) }
    val onChangeNow by rememberUpdatedState(onChange)
    val currentNow by rememberUpdatedState(current)

    LaunchedEffect(apiKey, athleteId) {
        if (apiKey.isBlank()) { loading = false; ftps = null; return@LaunchedEffect }
        loading = true
        ftps = try { IcuRepository.fetchFtps(apiKey, athleteId.ifBlank { "0" }) } catch (e: Exception) { null }
        loading = false
        // Nothing chosen yet: start from the indoor FTP, as the web app does.
        ftps?.let { if (currentNow <= 0) onChangeNow(it.indoor.takeIf { v -> v > 0 } ?: it.outdoor) }
    }

    val f = ftps
    Column(Modifier.fillMaxWidth()) {
        when {
            loading -> Text("Reading your FTP from intervals.icu…", fontSize = 12.sp, color = Forge.Muted)
            f != null -> {
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (f.indoor > 0) FtpPill("Indoor ${f.indoor} W", !custom && current == f.indoor) { custom = false; onChange(f.indoor) }
                    if (f.outdoor > 0) FtpPill("Outdoor ${f.outdoor} W", !custom && current == f.outdoor && current != f.indoor) { custom = false; onChange(f.outdoor) }
                    val other = current > 0 && current != f.indoor && current != f.outdoor
                    FtpPill("Custom", custom || other) { custom = true }
                }
                if (custom || (current > 0 && current != f.indoor && current != f.outdoor)) {
                    Spacer(Modifier.height(8.dp))
                    FtpField(current, onChange)
                }
            }
            else -> {
                FtpField(current, onChange)
                if (apiKey.isNotBlank())
                    Text("Could not read the FTP from intervals.icu — enter it manually.",
                        fontSize = 11.sp, color = Forge.Faint, modifier = Modifier.padding(top = 5.dp))
            }
        }
    }
}

@Composable
private fun FtpField(current: Int, onChange: (Int) -> Unit) {
    var text by remember { mutableStateOf(current.takeIf { it > 0 }?.toString().orEmpty()) }
    OutlinedTextField(
        value = text,
        onValueChange = { v -> text = v.filter { it.isDigit() }.take(4); onChange(text.toIntOrNull() ?: 0) },
        singleLine = true,
        placeholder = { Text("FTP in watts", fontSize = 13.sp, color = Forge.Faint) },
        suffix = { Text("W", fontSize = 12.sp, color = Forge.Muted) },
        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
        shape = RoundedCornerShape(10.dp),
        textStyle = TextStyle(fontSize = 13.sp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = Forge.Field, unfocusedContainerColor = Forge.Field,
            focusedBorderColor = MaterialTheme.colorScheme.primary, unfocusedBorderColor = Forge.FieldBorder),
        modifier = Modifier.fillMaxWidth()
    )
}

@Composable
private fun FtpPill(text: String, selected: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(20.dp)
    Box(
        Modifier.clip(shape)
            .background(if (selected) Forge.AccentChipBg else Forge.ChipBg)
            .border(1.dp, if (selected) Forge.AccentChipBorder else Forge.GhostBorder, shape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) { Text(text, fontSize = 12.sp, color = if (selected) Forge.Amber else Forge.GhostText) }
}
