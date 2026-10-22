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
import android.os.Handler
import android.os.Looper
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

    // Trainers such as the Tacx NEO series do NOT advertise the FTMS service;
    // they advertise Cycling Power (0x1818) and/or the Tacx FE-C-over-BLE
    // service instead, even when FTMS is available once connected.
    private val CYCLING_POWER   = UUID.fromString("00001818-0000-1000-8000-00805f9b34fb")
    private val CPS_MEASUREMENT = UUID.fromString("00002a63-0000-1000-8000-00805f9b34fb")
    private val TACX_FEC        = UUID.fromString("6e40fec1-b5a3-f393-e0a9-e50e24dcca9e")
    private val FEC_RX          = UUID.fromString("6e40fec2-b5a3-f393-e0a9-e50e24dcca9e") // write (commands)
    private val FEC_TX          = UUID.fromString("6e40fec3-b5a3-f393-e0a9-e50e24dcca9e") // notify (trainer data)

    // FE-C over BLE carries raw ANT+ messages: A4 | len | msgId | channel | 8 data bytes | xor checksum
    private const val ANT_SYNC = 0xA4
    private const val ANT_ACKNOWLEDGED = 0x4F   // commands; change to 0x4E (broadcast) if a trainer ignores them
    private const val ANT_BROADCAST = 0x4E
    private const val FEC_CHANNEL = 0x05
    private const val FEC_PAGE_TRAINER_DATA = 0x19   // specific trainer data: cadence + instantaneous power
    private const val FEC_PAGE_TARGET_POWER = 0x31   // command: target power in 0.25 W units

    // --- FTMS control point opcodes ---
    private const val OP_REQUEST_CONTROL = 0x00
    private const val OP_SET_TARGET_POWER = 0x05
    private const val OP_START_RESUME = 0x07
    private const val OP_RESPONSE = 0x80

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

    /** True once the trainer's FTMS control point is ready, i.e. ERG targets can be sent. */
    val ergAvailable = MutableStateFlow(false)

    /** Human-readable list of the services the trainer exposes (shown when ERG is unavailable). */
    val servicesInfo = MutableStateFlow("")

    /** Last connection problem (status codes etc.), shown under the trainer pill on Home. */
    val lastError = MutableStateFlow("")

    /** True while a BLE scan is running (drives the spinner on the Devices screen). */
    val scanningState = MutableStateFlow(false)

    // --- Scan results (device + kind) ---
    data class ScanHit(
        val device: BluetoothDevice, val name: String, val rssi: Int,
        val isTrainer: Boolean,
        /** "FTMS", "FE-C" or "Cycling Power" for trainers; empty for heart-rate straps. */
        val protocol: String = ""
    )
    private val _scanResults = MutableSharedFlow<List<ScanHit>>(
        replay = 1, extraBufferCapacity = 16, onBufferOverflow = BufferOverflow.DROP_OLDEST)
    val scanResults: SharedFlow<List<ScanHit>> = _scanResults

    private var appContext: Context? = null
    private var trainerGatt: BluetoothGatt? = null
    private var hrGatt: BluetoothGatt? = null
    private var scanning: Boolean
        get() = scanningState.value
        set(v) { scanningState.value = v }
    private val found = LinkedHashMap<String, ScanHit>()
    private val writeQueue = ConcurrentLinkedQueue<ByteArray>()
    @Volatile private var writeBusy = false   // a control-point write is in flight
    @Volatile private var useFec = false        // ERG through Tacx FE-C instead of FTMS
    private var lastTrainerHit: ScanHit? = null
    private var connectAttempts = 0
    private val main = Handler(Looper.getMainLooper())

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
            ScanFilter.Builder().setServiceUuid(ParcelUuid(HR_SERVICE)).build(),
            ScanFilter.Builder().setServiceUuid(ParcelUuid(CYCLING_POWER)).build(),
            ScanFilter.Builder().setServiceUuid(ParcelUuid(TACX_FEC)).build()
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
            val uuids = result.scanRecord?.serviceUuids
            val isTrainer = (uuids?.any { it.uuid == FTMS || it.uuid == TACX_FEC } ?: false) ||
                name.contains("tacx", ignoreCase = true) || name.contains("neo", ignoreCase = true)
            val protocol = when {
                uuids?.any { it.uuid == FTMS } == true -> "FTMS"
                uuids?.any { it.uuid == TACX_FEC } == true -> "FE-C"
                isTrainer -> "Cycling Power"
                else -> ""
            }
            found[dev.address] = ScanHit(dev, name.ifBlank { dev.address }, result.rssi, isTrainer, protocol)
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
            lastError.value = ""
            lastTrainerHit = hit
            connectAttempts = 0
            openTrainer(hit)
        } else {
            hrState.value = ConnState.CONNECTING
            hrName.value = hit.name
            hrGatt?.close()
            hrGatt = hit.device.connectGatt(ctx, false, hrCb, BluetoothDevice.TRANSPORT_LE)
        }
    }

    /** Open the trainer connection, with a timeout so a stuck attempt never stays "connecting". */
    @SuppressLint("MissingPermission")
    private fun openTrainer(hit: ScanHit) {
        val ctx = appContext ?: return
        trainerState.value = ConnState.CONNECTING
        trainerName.value = hit.name
        trainerGatt?.let { try { it.disconnect(); it.close() } catch (e: Exception) { Log.w(TAG, e) } }
        val gatt = hit.device.connectGatt(ctx, false, trainerCb, BluetoothDevice.TRANSPORT_LE)
        trainerGatt = gatt
        main.postDelayed({
            if (trainerGatt === gatt && trainerState.value == ConnState.CONNECTING)
                failTrainer(gatt, "Trainer connection timed out")
        }, 15000)
    }

    /** Release the GATT client (an unclosed one leaks and Android eventually refuses new connections). */
    @SuppressLint("MissingPermission")
    private fun failTrainer(g: BluetoothGatt, msg: String) {
        Log.w(TAG, msg)
        lastError.value = msg
        try { g.disconnect() } catch (e: Exception) { Log.w(TAG, e) }
        try { g.close() } catch (e: Exception) { Log.w(TAG, e) }
        if (trainerGatt === g) trainerGatt = null
        writeQueue.clear(); writeBusy = false; useFec = false
        ergAvailable.value = false
        trainerState.value = ConnState.DISCONNECTED
    }

    /** FE-C unusable: keep the connection alive in read-only mode through the Cycling Power Service. */
    private fun fallbackToCps(g: BluetoothGatt, why: String) {
        Log.w(TAG, why)
        useFec = false
        val cps = g.getService(CYCLING_POWER)?.getCharacteristic(CPS_MEASUREMENT)
        if (cps == null || !enableNotify(g, cps, indications = false)) { failTrainer(g, why); return }
        lastError.value = "$why - read-only fallback"
        ergAvailable.value = false
        trainerState.value = ConnState.CONNECTED
    }

    @SuppressLint("MissingPermission")
    fun disconnectAll() {
        trainerGatt?.let { g -> g.disconnect(); g.close() }
        hrGatt?.let { g -> g.disconnect(); g.close() }
        trainerGatt = null; hrGatt = null
        trainerState.value = ConnState.DISCONNECTED
        hrState.value = ConnState.DISCONNECTED
        ergAvailable.value = false
    }

    // --------------------------------------------------------------- GATT: trainer

    private val trainerCb = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> {
                    // A bonded trainer may have a stale cached service list (e.g. from before a
                    // firmware update added FTMS): drop it, then discover.
                    refreshCache(g)
                    main.postDelayed({ g.discoverServices() }, 600)
                }
                BluetoothProfile.STATE_DISCONNECTED -> {
                    val retry = trainerState.value == ConnState.CONNECTING &&
                        status != BluetoothGatt.GATT_SUCCESS && connectAttempts < 2 && lastTrainerHit != null
                    try { g.close() } catch (e: Exception) { Log.w(TAG, e) }   // never leak the client
                    if (trainerGatt === g) trainerGatt = null
                    writeQueue.clear(); writeBusy = false; useFec = false
                    ergAvailable.value = false
                    if (retry) {
                        connectAttempts++
                        lastError.value = "Connect failed (status $status), retrying…"
                        main.postDelayed({ lastTrainerHit?.let { openTrainer(it) } }, 800)
                    } else {
                        if (status != BluetoothGatt.GATT_SUCCESS) lastError.value = "Disconnected (status $status)"
                        trainerState.value = ConnState.DISCONNECTED
                    }
                }
            }
        }

        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) { failTrainer(g, "Service discovery failed (status $status)"); return }
            lastCrankRevs = -1
            Log.i(TAG, "Trainer services: " + g.services.joinToString { it.uuid.toString() })
            servicesInfo.value = g.services.mapNotNull {
                when (it.uuid) {
                    FTMS -> "FTMS"; CYCLING_POWER -> "Cycling Power"; TACX_FEC -> "FE-C"; else -> null
                }
            }.joinToString(", ").ifBlank { "none of FTMS / Cycling Power / FE-C" }
            val svc = g.getService(FTMS)
            useFec = false
            val fec = g.getService(TACX_FEC)
            val fecTx = fec?.getCharacteristic(FEC_TX)
            if (svc == null && fec != null && fecTx != null && fec.getCharacteristic(FEC_RX) != null) {
                // Tacx FE-C over BLE (e.g. Neo 2T without FTMS): power + cadence + ERG.
                Log.i(TAG, "No FTMS service; using Tacx FE-C over BLE")
                useFec = true
                if (!enableNotify(g, fecTx, indications = false)) fallbackToCps(g, "FE-C subscribe rejected")
                return
            }
            if (svc == null) {
                // Trainer without FTMS advertised/implemented (e.g. Tacx NEO on
                // older firmware): fall back to the Cycling Power Service for
                // read-only power. ERG control is not possible in this mode.
                val cps = g.getService(CYCLING_POWER)?.getCharacteristic(CPS_MEASUREMENT)
                if (cps == null) { failTrainer(g, "Trainer exposes no usable power service"); return }
                Log.w(TAG, "No FTMS service; read-only via Cycling Power Service (no ERG)")
                ergAvailable.value = false
                trainerState.value = ConnState.CONNECTED
                enableNotify(g, cps, indications = false)
                return
            }
            val bike = svc.getCharacteristic(INDOOR_BIKE)
            val cp = svc.getCharacteristic(CONTROL_POINT)
            if (bike == null || cp == null) { failTrainer(g, "FTMS service incomplete"); return }
            // Android allows ONE pending GATT operation: a second writeDescriptor issued right
            // away is rejected. Subscribe to bike data now, and to the control point in
            // onDescriptorWrite once this one has completed.
            if (!enableNotify(g, bike, indications = false)) failTrainer(g, "FTMS subscribe rejected")
        }

        override fun onDescriptorWrite(g: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
            val uuid = descriptor.characteristic?.uuid
            if (uuid == FEC_TX) {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    lastError.value = ""
                    trainerState.value = ConnState.CONNECTED
                    ergAvailable.value = true      // FE-C has no "request control": target power just works
                } else {
                    fallbackToCps(g, "FE-C subscribe failed (status $status)")
                }
            } else if (uuid == INDOOR_BIKE) {
                // step 2: now the control point (responses arrive as indications)
                g.getService(FTMS)?.getCharacteristic(CONTROL_POINT)?.let { enableNotify(g, it, indications = true) }
            } else if (uuid == CONTROL_POINT && status == BluetoothGatt.GATT_SUCCESS) {
                lastError.value = ""
                trainerState.value = ConnState.CONNECTED
                enqueue(byteArrayOf(OP_REQUEST_CONTROL.toByte()))  // ERG becomes available once granted
            }
        }

        // Pre-API 33 callback: value arrives via ch.value
        @Deprecated("Deprecated in Java")
        override fun onCharacteristicChanged(g: BluetoothGatt, ch: BluetoothGattCharacteristic) {
            val value = ch.value ?: return
            when (ch.uuid) {
                INDOOR_BIKE -> parseIndoorBike(value)
                CPS_MEASUREMENT -> parseCps(value)
                CONTROL_POINT -> onControlPointResponse(value)
                FEC_TX -> parseFec(value)
            }
        }

        override fun onCharacteristicWrite(g: BluetoothGatt, ch: BluetoothGattCharacteristic, status: Int) {
            writeBusy = false
            pump()
        }
    }

    private fun u16(b: ByteArray, i: Int) = (b[i].toInt() and 0xFF) or ((b[i + 1].toInt() and 0xFF) shl 8)
    private fun s16(b: ByteArray, i: Int): Int { val r = u16(b, i); return if (r > 0x7FFF) r - 0x10000 else r }

    // Crank state for cadence derived from Cycling Power Measurement
    private var lastCrankRevs = -1
    private var lastCrankTime = 0
    private var lastCrankChangeMs = 0L

    /**
     * Cycling Power Measurement (0x2A63): flags u16, power s16, then optional fields in this
     * order: pedal balance (1), accumulated torque (2), wheel rev data (6), crank rev data (4).
     * Cadence = delta crank revolutions / delta crank event time (1/1024 s).
     */
    private fun parseCps(b: ByteArray) {
        if (b.size < 4) return
        val flags = u16(b, 0)
        powerW.value = s16(b, 2)
        var i = 4
        if (flags and 0x0001 != 0) i += 1   // pedal power balance
        if (flags and 0x0004 != 0) i += 2   // accumulated torque
        if (flags and 0x0010 != 0) i += 6   // wheel revolution data
        if (flags and 0x0020 != 0 && i + 4 <= b.size) {
            val revs = u16(b, i)
            val t = u16(b, i + 2)
            val now = System.currentTimeMillis()
            if (lastCrankRevs >= 0) {
                val dRev = (revs - lastCrankRevs) and 0xFFFF
                val dT = (t - lastCrankTime) and 0xFFFF
                if (dRev > 0 && dT > 0) {
                    cadence.value = (dRev * 1024 * 60 + dT / 2) / dT
                    lastCrankChangeMs = now
                } else if (now - lastCrankChangeMs > 2500) {
                    cadence.value = 0   // no new crank event: pedalling stopped
                }
            } else lastCrankChangeMs = now
            lastCrankRevs = revs; lastCrankTime = t
        }
    }

    /**
     * Indoor Bike Data (0x2AD2): flags u16 LE, then optional fields in spec order.
     * Note bit 0 ("More Data") is inverted: instantaneous speed is present when it is 0.
     */
    private fun parseIndoorBike(b: ByteArray) {
        if (b.size < 2) return
        val flags = u16(b, 0)
        var i = 2
        if (flags and 0x0001 == 0) i += 2            // instantaneous speed
        if (flags and 0x0002 != 0) i += 2            // average speed
        if (flags and 0x0004 != 0) {                 // instantaneous cadence, 0.5 rpm
            if (i + 2 <= b.size) cadence.value = u16(b, i) / 2
            i += 2
        }
        if (flags and 0x0008 != 0) i += 2            // average cadence
        if (flags and 0x0010 != 0) i += 3            // total distance
        if (flags and 0x0020 != 0) i += 2            // resistance level
        if (flags and 0x0040 != 0 && i + 2 <= b.size) powerW.value = s16(b, i)  // instantaneous power
    }

    /** ERG mode: send a new target power (watts) to the trainer. */
    fun setTargetPower(watts: Int) {
        val g = trainerGatt ?: return
        if (useFec) {
            val q = (watts.coerceAtLeast(0) * 4).coerceAtMost(16000)   // 0.25 W units, max 4000 W
            val ff = 0xFF.toByte()
            enqueue(fecMessage(ANT_ACKNOWLEDGED, byteArrayOf(
                FEC_PAGE_TARGET_POWER.toByte(), ff, ff, ff, ff, ff,
                (q and 0xFF).toByte(), ((q shr 8) and 0xFF).toByte())))
            return
        }
        val svc = g.getService(FTMS) ?: return
        val cp = svc.getCharacteristic(CONTROL_POINT) ?: return
        val w = watts.coerceAtLeast(0)
        val payload = byteArrayOf(OP_SET_TARGET_POWER.toByte(), (w and 0xFF).toByte(), ((w shr 8) and 0xFF).toByte())
        enqueue(payload)
    }

    private fun enqueue(bytes: ByteArray) {
        if (writeQueue.size > 4) writeQueue.clear()   // slow trainer: keep only the freshest commands
        writeQueue.add(bytes)
        pump()
    }

    /** Send the next queued command if none is in flight. */
    private fun pump() {
        if (writeBusy) return
        val g = trainerGatt ?: return
        val cp = (if (useFec) g.getService(TACX_FEC)?.getCharacteristic(FEC_RX)
                  else g.getService(FTMS)?.getCharacteristic(CONTROL_POINT)) ?: return
        val next = writeQueue.poll() ?: return
        writeBusy = true
        if (!writeNow(g, cp, next)) { writeBusy = false; pump() }   // rejected: try the next one
    }

    @SuppressLint("MissingPermission")
    private fun writeNow(g: BluetoothGatt, cp: BluetoothGattCharacteristic, bytes: ByteArray): Boolean {
        cp.value = bytes
        cp.writeType = if (cp.properties and BluetoothGattCharacteristic.PROPERTY_WRITE != 0)
            BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT else BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
        return try { g.writeCharacteristic(cp) } catch (e: Exception) { Log.w(TAG, e); false }
    }

    /** Wrap an 8-byte ANT+ data page into a BLE FE-C message with the XOR checksum. */
    private fun fecMessage(msgId: Int, page: ByteArray): ByteArray {
        val m = ByteArray(13)
        m[0] = ANT_SYNC.toByte(); m[1] = 9; m[2] = msgId.toByte(); m[3] = FEC_CHANNEL.toByte()
        System.arraycopy(page, 0, m, 4, 8)
        var c = 0
        for (i in 0 until 12) c = c xor (m[i].toInt() and 0xFF)
        m[12] = c.toByte()
        return m
    }

    /** Parse FE-C notifications (one or several ANT messages per packet). Page 0x19 carries cadence and power. */
    private fun parseFec(b: ByteArray) {
        var i = 0
        while (i + 1 < b.size) {
            if ((b[i].toInt() and 0xFF) != ANT_SYNC) { i++; continue }
            val len = b[i + 1].toInt() and 0xFF
            val total = len + 4
            if (i + total > b.size) break
            val id = b[i + 2].toInt() and 0xFF
            if ((id == ANT_BROADCAST || id == ANT_ACKNOWLEDGED) && len == 9) {
                val d = i + 4   // start of the 8 data bytes
                if ((b[d].toInt() and 0xFF) == FEC_PAGE_TRAINER_DATA) {
                    val cad = b[d + 2].toInt() and 0xFF
                    if (cad != 0xFF) cadence.value = cad                      // 0xFF = invalid
                    powerW.value = (b[d + 5].toInt() and 0xFF) or ((b[d + 6].toInt() and 0x0F) shl 8)
                }
            }
            i += total
        }
    }

    /** FTMS control point response: 0x80, request opcode, result (0x01 = success). */
    private fun onControlPointResponse(v: ByteArray) {
        if (v.size < 3 || (v[0].toInt() and 0xFF) != OP_RESPONSE) return
        val op = v[1].toInt() and 0xFF
        val result = v[2].toInt() and 0xFF
        Log.i(TAG, "Control point: op=0x%02X result=0x%02X".format(op, result))
        if (op == OP_REQUEST_CONTROL) {
            if (result == 0x01) {
                enqueue(byteArrayOf(OP_START_RESUME.toByte()))   // required before target power on most trainers
                ergAvailable.value = true
            } else {
                ergAvailable.value = false   // e.g. another app already controls the trainer
            }
        }
    }

    /** Hidden-API cache refresh; harmless if the platform blocks it. */
    private fun refreshCache(g: BluetoothGatt) {
        try { g.javaClass.getMethod("refresh").invoke(g) } catch (e: Exception) { Log.w(TAG, "GATT cache refresh unavailable", e) }
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
            if (status != BluetoothGatt.GATT_SUCCESS) return
            val ch = g.getService(HR_SERVICE)?.getCharacteristic(HR_MEASUREMENT)
                ?: run { hrState.value = ConnState.DISCONNECTED; g.close(); return }
            enableNotify(g, ch, indications = false)
        }
        override fun onDescriptorWrite(g: BluetoothGatt, d: BluetoothGattDescriptor, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) hrState.value = ConnState.CONNECTED
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
    private fun enableNotify(g: BluetoothGatt, ch: BluetoothGattCharacteristic, indications: Boolean): Boolean {
        g.setCharacteristicNotification(ch, true)
        val cccd = ch.getDescriptor(CCCD) ?: return false
        cccd.value = if (indications) BluetoothGattDescriptor.ENABLE_INDICATION_VALUE
                     else BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
        return g.writeDescriptor(cccd)
    }
}
