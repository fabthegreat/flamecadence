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
