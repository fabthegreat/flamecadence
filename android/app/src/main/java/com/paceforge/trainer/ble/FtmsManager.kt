package com.paceforge.trainer.ble

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.ParcelUuid
import android.util.Log
import androidx.core.content.ContextCompat
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import java.util.UUID
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * BLE hub for FTMS (Fitness Machine Service, 0x1826) smart trainers and
 * standard Heart Rate monitors (0x180D).
 *
 * - Scans for both service UUIDs
 * - Connects to one trainer + one HR strap
 * - Reads Indoor Bike Data (0x2AD2): instantaneous power & cadence
 * - Writes Fitness Machine Control Point (0x2AD9): Request Control + Set Target Power (ERG)
 */
object FtmsCenter {
    private const val TAG = "FtmsCenter"

    // --- GATT UUIDs ---
    private val FTMS            = UUID.fromString("00001826-0000-1000-8000-00805f9b34fb")
    private val HR_SERVICE      = UUID.fromString("0000180d-0000-1000-8000-00805f9b34fb")
    private val INDOOR_BIKE     = UUID.fromString("00002ad2-0000-1000-8000-00805f9b34fb")
    private val CONTROL_POINT  = UUID.fromString("00002ad9-0000-1000-8000-00805f9b34fb")
    private val HR_MEASUREMENT = UUID.fromString("00002a37-0000-1000-8000-00805f9b34fb")
    private val CCCD           = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

    // --- FTMS control point opcodes ---
    private const val OP_REQUEST_CONTROL = 0x00
    private const val OP_SET_TARGET_POWER = 0x05

    enum class ConnState { DISCONNECTED, CONNECTING, CONNECTED }

    // --- Live data ---
    val powerW = MutableStateFlow(0)
    val cadence = MutableStateFlow(0)
    val hrBpm = MutableStateFlow(0)

    // --- Connection state ---
    val trainerState = MutableStateFlow(ConnState.DISCONNECTED)
    val trainerName = MutableStateFlow("")
    val hrState = MutableStateFlow(ConnState.DISCONNECTED)
    val hrName = MutableStateFlow("")

    // --- Scan results (device + kind) ---
    data class ScanHit(val device: BluetoothDevice, val name: String, val rssi: Int, val isTrainer: Boolean)
    private val _scanResults = MutableSharedFlow<List<ScanHit>>(
        replay = 1, extraBufferCapacity = 16, onBufferOverflow = BufferOverflow.DROP_OLDEST)
    val scanResults: SharedFlow<List<ScanHit>> = _scanResults

    private var appContext: Context? = null
    private var trainerGatt: BluetoothGatt? = null
    private var hrGatt: BluetoothGatt? = null
    private var scanning = false
    private val found = LinkedHashMap<String, ScanHit>()
    private val writeQueue = ConcurrentLinkedQueue<ByteArray>()

    /** Must be called once (TrainerService) before any BLE operation. */
    fun init(ctx: Context) { appContext = ctx.applicationContext }

    private fun adapter(): BluetoothAdapter? =
        (appContext?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

    private fun hasPermission(p: String): Boolean =
        appContext?.let { ContextCompat.checkSelfPermission(it, p) == PackageManager.PERMISSION_GRANTED } ?: false

    // ---------------------------------------------------------------- scanning

    @SuppressLint("MissingPermission")
    fun startScan() {
        val ctx = appContext ?: return
        if (scanning) return
        if (!hasPermission(Manifest.permission.BLUETOOTH_SCAN)) return
        val sc = adapter()?.bluetoothLeScanner ?: return
        found.clear()
        scanning = true
        val filters = listOf(
            ScanFilter.Builder().setServiceUuid(ParcelUuid(FTMS)).build(),
            ScanFilter.Builder().setServiceUuid(ParcelUuid(HR_SERVICE)).build()
        )
        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
            .build()
        sc.startScan(filters, settings, scanCb)
    }

    @SuppressLint("MissingPermission")
    fun stopScan() {
        if (!scanning) return
        scanning = false
        try { adapter()?.bluetoothLeScanner?.stopScan(scanCb) } catch (e: Exception) { Log.w(TAG, e) }
    }

    private val scanCb = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val dev = result.device
            val name = dev.name ?: result.scanRecord?.deviceName ?: found[dev.address]?.name ?: dev.address
            val isTrainer = result.scanRecord?.serviceUuids?.any { it.uuid == FTMS } ?: false
            found[dev.address] = ScanHit(dev, name.ifBlank { dev.address }, result.rssi, isTrainer)
            _scanResults.tryEmit(found.values.sortedByDescending { it.rssi })
        }
        override fun onScanFailed(errorCode: Int) { Log.e(TAG, "Scan failed: $errorCode"); scanning = false }
    }

    // ------------------------------------------------------------- connections

    @SuppressLint("MissingPermission")
    fun connect(hit: ScanHit) {
        val ctx = appContext ?: return
        if (!hasPermission(Manifest.permission.BLUETOOTH_CONNECT)) return
        stopScan()
        if (hit.isTrainer) {
            trainerState.value = ConnState.CONNECTING
            trainerName.value = hit.name
            trainerGatt?.close()
            trainerGatt = hit.device.connectGatt(ctx, false, trainerCb)
        } else {
            hrState.value = ConnState.CONNECTING
            hrName.value = hit.name
            hrGatt?.close()
            hrGatt = hit.device.connectGatt(ctx, false, hrCb)
        }
    }

    @SuppressLint("MissingPermission")
    fun disconnectAll() {
        trainerGatt?.let { g -> g.disconnect(); g.close() }
        hrGatt?.let { g -> g.disconnect(); g.close() }
        trainerGatt = null; hrGatt = null
        trainerState.value = ConnState.DISCONNECTED
        hrState.value = ConnState.DISCONNECTED
    }

    // --------------------------------------------------------------- GATT: trainer

    private val trainerCb = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> { g.discoverServices() }
                BluetoothProfile.STATE_DISCONNECTED -> {
                    trainerGatt = null
                    trainerState.value = ConnState.DISCONNECTED
                }
            }
        }

        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.STATUS_SUCCESS) return
            val svc = g.getService(FTMS) ?: run {
                trainerState.value = ConnState.DISCONNECTED; g.close(); return
            }
            val bike = svc.getCharacteristic(INDOOR_BIKE)
            val cp = svc.getCharacteristic(CONTROL_POINT)
            if (bike == null || cp == null) {
                trainerState.value = ConnState.DISCONNECTED; g.close(); return
            }
            enableNotify(g, bike, indications = false)
            enableNotify(g, cp, indications = true) // control point responses arrive as indications
        }

        override fun onDescriptorWrite(g: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
            if (descriptor.characteristic?.uuid == CONTROL_POINT && status == BluetoothGatt.STATUS_SUCCESS) {
                trainerState.value = ConnState.CONNECTED
                enqueue(byteArrayOf(OP_REQUEST_CONTROL))  // take control before ERG writes
            }
        }

        // Pre-API 33 callback: value arrives via ch.value
        @Deprecated("Deprecated in Java")
        override fun onCharacteristicChanged(g: BluetoothGatt, ch: BluetoothGattCharacteristic) {
            val value = ch.value ?: return
            when (ch.uuid) {
                INDOOR_BIKE -> parseIndoorBike(value)
                CONTROL_POINT -> { /* opcode response codes; future: surface errors */ }
            }
        }

        override fun onCharacteristicWrite(g: BluetoothGatt, ch: BluetoothGattCharacteristic, status: Int) {
            val next = writeQueue.poll()
            if (next != null) writeNow(g, ch, next)
        }
    }

    /** Indoor Bike Data (0x2AD2): flags u16 LE, then optional fields. */
    private fun parseIndoorBike(b: ByteArray) {
        if (b.size < 4) return
        val flags = (b[0].toInt() and 0xFF) or ((b[1].toInt() and 0xFF) shl 8)
        var i = 2
        if (flags and 0x0002 != 0) i += 2            // instantaneous speed
        if (flags and 0x0004 != 0) {                 // instantaneous cadence
            if (i + 2 <= b.size) {
                val raw = ((b[i].toInt() and 0xFF) or ((b[i + 1].toInt() and 0xFF) shl 8))
                cadence.value = raw / 2              // 0.5 rpm resolution
                i += 2
            }
        }
        if (flags and 0x0008 != 0) i += 2            // average cadence
        if (flags and 0x0010 != 0) i += 3            // total distance
        if (flags and 0x0020 != 0) i += 3            // resistance level
        if (flags and 0x0040 != 0 && i + 2 <= b.size) { // instantaneous power (s16)
            val raw = ((b[i].toInt() and 0xFF) or ((b[i + 1].toInt() and 0xFF) shl 8))
            powerW.value = if (raw > 0x7FFF) raw - 0x10000 else raw
        }
    }

    /** ERG mode: send a new target power (watts) to the trainer. */
    fun setTargetPower(watts: Int) {
        val g = trainerGatt ?: return
        val svc = g.getService(FTMS) ?: return
        val cp = svc.getCharacteristic(CONTROL_POINT) ?: return
        val w = watts.coerceAtLeast(0)
        val payload = byteArrayOf(OP_SET_TARGET_POWER, (w and 0xFF).toByte(), ((w shr 8) and 0xFF).toByte())
        enqueue(payload)
    }

    private fun enqueue(bytes: ByteArray) {
        val g = trainerGatt ?: return
        val svc = g.getService(FTMS) ?: return
        val cp = svc.getCharacteristic(CONTROL_POINT) ?: return
        if (writeQueue.isEmpty()) writeNow(g, cp, bytes) else writeQueue.add(bytes)
    }

    @SuppressLint("MissingPermission")
    private fun writeNow(g: BluetoothGatt, cp: BluetoothGattCharacteristic, bytes: ByteArray) {
        cp.value = bytes
        cp.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
        val ok = try { g.writeCharacteristic(cp) } catch (e: Exception) { Log.w(TAG, e); false }
        if (!ok) writeQueue.poll()?.let { writeNow(g, cp, it) } // avoid stuck queue
    }

    // --------------------------------------------------------------- GATT: heart rate

    private val hrCb = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> g.discoverServices()
                BluetoothProfile.STATE_DISCONNECTED -> { hrGatt = null; hrState.value = ConnState.DISCONNECTED }
            }
        }
        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.STATUS_SUCCESS) return
            val ch = g.getService(HR_SERVICE)?.getCharacteristic(HR_MEASUREMENT)
                ?: run { hrState.value = ConnState.DISCONNECTED; g.close(); return }
            enableNotify(g, ch, indications = false)
        }
        override fun onDescriptorWrite(g: BluetoothGatt, d: BluetoothGattDescriptor, status: Int) {
            if (status == BluetoothGatt.STATUS_SUCCESS) hrState.value = ConnState.CONNECTED
        }
        @Deprecated("Deprecated in Java")
        override fun onCharacteristicChanged(g: BluetoothGatt, ch: BluetoothGattCharacteristic) {
            val value = ch.value ?: return
            if (ch.uuid == HR_MEASUREMENT && value.isNotEmpty()) {
                val flags = value[0].toInt()
                hrBpm.value = if (flags and 0x01 == 0) (value[1].toInt() and 0xFF)
                               else ((value[1].toInt() and 0xFF) or ((value[2].toInt() and 0xFF) shl 8))
            }
        }
    }

    /**
     * Subscribe to a characteristic. Indoor Bike Data and HR Measurement use
     * notifications; the FTMS Control Point uses indications.
     */
    @SuppressLint("MissingPermission")
    private fun enableNotify(g: BluetoothGatt, ch: BluetoothGattCharacteristic, indications: Boolean) {
        g.setCharacteristicNotification(ch, true)
        val cccd = ch.getDescriptor(CCCD) ?: return
        cccd.value = if (indications) BluetoothGattDescriptor.ENABLE_INDICATION_VALUE
                     else BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
        g.writeDescriptor(cccd)
    }
}
