package com.paceforge.trainer.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val ForgeOrange = Color(0xFFFF6D00)

@Composable
fun Theme(content: @Composable () -> Unit) {
    val scheme = if (isSystemInDarkTheme())
        darkColorScheme(primary = ForgeOrange)
    else
        lightColorScheme(primary = ForgeOrange)
    MaterialTheme(colorScheme = scheme, content = content)
}
