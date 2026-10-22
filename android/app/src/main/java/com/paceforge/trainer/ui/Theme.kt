package com.paceforge.trainer.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * PaceForge forge theme: dark steel-blue background, flame-orange primary,
 * matching the logo. Used by MainActivity: `Theme { App(...) }`.
 */
private val ForgeColors = darkColorScheme(
    primary = Color(0xFFFF9D00),
    onPrimary = Color(0xFF1A0E00),
    primaryContainer = Color(0xFF241A0C),
    onPrimaryContainer = Color(0xFFFFB84D),
    secondary = Color(0xFFFFC24D),
    onSecondary = Color(0xFF1A0E00),
    background = Color(0xFF10151C),
    onBackground = Color(0xFFE7EDF2),
    surface = Color(0xFF151C26),
    onSurface = Color(0xFFE7EDF2),
    surfaceVariant = Color(0xFF141B24),
    onSurfaceVariant = Color(0xFF8A97A3),
    outlineVariant = Color(0xFF232E3B),
    error = Color(0xFFE2574C)
)

@Composable
fun Theme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = ForgeColors, content = content)
}

/** Extra palette taken from the UI prototype (cards, chips, pills, fields). */
object Forge {
    val Card = Color(0xFF151C26)
    val CardBorder = Color(0xFF232E3B)
    val Amber = Color(0xFFFFB84D)
    val Orange = Color(0xFFFF7A00)
    val Warn = Color(0xFFFFC24D)
    val Green = Color(0xFF57D98A)
    val Muted = Color(0xFF8A97A3)
    val Faint = Color(0xFF6D7B8A)
    val Off = Color(0xFF5A6A7A)
    val Link = Color(0xFF8FB7FF)
    val Header = Color(0xFF9DB1C2)
    val GhostBorder = Color(0xFF33414F)
    val GhostText = Color(0xFFC6D2DE)
    val ChipBg = Color(0xFF141B24)
    val AccentChipBg = Color(0xFF241A0C)
    val AccentChipBorder = Color(0xFF7A4A12)
    val Field = Color(0xFF0E141C)
    val FieldBorder = Color(0xFF2A3846)
    val RowLine = Color(0xFF1D2733)
    val Disabled = Color(0xFF1B232E)
    val OnPrimary = Color(0xFF1A0E00)
}
