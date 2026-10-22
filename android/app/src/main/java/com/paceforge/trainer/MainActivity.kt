package com.paceforge.trainer

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.paceforge.trainer.ble.FtmsCenter
import com.paceforge.trainer.ui.App
import com.paceforge.trainer.ui.Theme

class MainActivity : ComponentActivity() {
    private val perms = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        FtmsCenter.init(this) // BLE must be usable before the workout service ever starts
        requestNeededPermissions()
        setContent { Theme { App(onPlay = { startTrainerService() }) } }
    }

    private fun requestNeededPermissions() {
        val wanted = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= 31) {
            wanted += Manifest.permission.BLUETOOTH_SCAN
            wanted += Manifest.permission.BLUETOOTH_CONNECT
        } else {
            wanted += Manifest.permission.ACCESS_FINE_LOCATION
        }
        if (Build.VERSION.SDK_INT >= 33) wanted += Manifest.permission.POST_NOTIFICATIONS
        perms.launch(wanted.toTypedArray())
    }

    private fun startTrainerService() {
        val i = Intent(this, TrainerService::class.java)
        if (Build.VERSION.SDK_INT >= 29) startForegroundService(i) else startService(i)
    }
}
