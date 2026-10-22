package com.paceforge.trainer.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paceforge.trainer.R

/** Small rounded status badge, e.g. "Tacx NEO 2T · connected". */
@Composable
fun StatusPill(text: String, color: Color) {
    val shape = RoundedCornerShape(50)
    Row(
        Modifier
            .clip(shape)
            .background(color.copy(alpha = 0.12f))
            .border(1.dp, color.copy(alpha = 0.35f), shape)
            .padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Box(Modifier.size(7.dp).background(color, CircleShape))
        Text(text, fontSize = 11.sp, color = color)
    }
}

@Composable
fun ForgeCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    val shape = RoundedCornerShape(16.dp)
    Column(
        modifier
            .fillMaxWidth()
            .background(Forge.Card, shape)
            .border(1.dp, Forge.CardBorder, shape)
            .padding(14.dp),
        content = content
    )
}

/** Orange gradient call-to-action button. */
@Composable
fun PrimaryButton(text: String, modifier: Modifier = Modifier, enabled: Boolean = true, onClick: () -> Unit) {
    val brush = if (enabled) Brush.verticalGradient(listOf(Forge.Amber, Forge.Orange))
                else Brush.verticalGradient(listOf(Forge.Disabled, Forge.Disabled))
    Box(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .background(brush)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text, color = if (enabled) Forge.OnPrimary else Forge.Off,
            fontWeight = FontWeight.Bold, fontSize = 14.sp)
    }
}

/** Outlined secondary button. */
@Composable
fun GhostButton(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val shape = RoundedCornerShape(12.dp)
    Box(
        modifier
            .clip(shape)
            .border(1.dp, Forge.GhostBorder, shape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text, color = Forge.GhostText, fontWeight = FontWeight.Bold, fontSize = 14.sp)
    }
}

/** Compact control used in the player's button row (−10 W / +10 W / Pause / End). */
@Composable
fun ForgeChip(text: String, modifier: Modifier = Modifier, accent: Boolean = false, onClick: () -> Unit) {
    val shape = RoundedCornerShape(10.dp)
    Box(
        modifier
            .clip(shape)
            .background(if (accent) Forge.AccentChipBg else Forge.ChipBg)
            .border(1.dp, if (accent) Forge.AccentChipBorder else Forge.GhostBorder, shape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(vertical = 11.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text, fontSize = 13.sp, color = if (accent) Forge.Amber else Forge.GhostText)
    }
}

@Composable
fun SectionTitle(text: String) {
    Text(text, fontSize = 16.sp, fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(start = 4.dp, top = 14.dp, bottom = 10.dp))
}

/** "◀ Title" header for sub-screens. With onBack = null it renders the title only. */
@Composable
fun BackHeader(title: String, onBack: (() -> Unit)?, modifier: Modifier = Modifier) {
    val m = if (onBack != null)
        modifier.clip(RoundedCornerShape(8.dp)).clickable(role = Role.Button, onClick = onBack)
    else modifier
    Text(
        (if (onBack != null) "◀  " else "") + title,
        modifier = m.padding(horizontal = 4.dp, vertical = 10.dp),
        fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Forge.Header,
        maxLines = 1, overflow = TextOverflow.Ellipsis
    )
}

/** PaceForge flame + bolt on a dark rounded tile (reuses the launcher foreground). */
@Composable
fun ForgeLogo(size: Dp) {
    val shape = RoundedCornerShape(size * 0.28f)
    Box(
        Modifier.size(size).clip(shape).background(Color(0xFF10151C))
            .border(1.dp, Color(0xFF526170), shape)
    ) {
        Image(painterResource(R.drawable.ic_launcher_foreground), contentDescription = "PaceForge",
            modifier = Modifier.fillMaxSize())
    }
}
