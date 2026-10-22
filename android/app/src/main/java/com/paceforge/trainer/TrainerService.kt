package com.paceforge.trainer

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import com.paceforge.trainer.ble.FtmsCenter
import com.paceforge.trainer.engine.WorkoutEngine
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/**
 * Foreground service (connectedDevice type) that keeps BLE alive while a
 * workout runs, even if the UI is backgrounded or the screen is off.
 */
class TrainerService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    override fun onCreate() {
        super.onCreate()
        FtmsCenter.init(this)
        WorkoutEngine.attach(scope)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIF_ID, buildNotification())
        return START_STICKY
    }

    override fun onDestroy() {
        WorkoutEngine.stop()
        FtmsCenter.disconnectAll()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildNotification(): Notification {
        val mgr = getSystemService(NotificationManager::class.java)
        mgr.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "Workout", NotificationManager.IMPORTANCE_LOW)
        )
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("PaceForge Trainer")
            .setContentText("Workout running — ERG mode active")
            .setSmallIcon(android.R.drawable.ic_menu_directions)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val CHANNEL_ID = "workout"
        private const val NOTIF_ID = 1
    }
}
