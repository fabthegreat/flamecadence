/* FlameCadence - Player: Bluetooth devices (pairing, auto-connect, cranks) */
// ---- Bluetooth (Web Bluetooth) : ceinture FC = service 0x180D ; home trainer = FTMS 0x1826 (Indoor Bike Data 0x2AD2) ----
function runBtUI(){
  const dv = RUN.dev, nm = k => (dv[k].name || "BLE"), kinds = ["trainer", "hr"].filter(k => dv[k]);
  $("runFsDev").textContent = !dv.trainer && !dv.hr ? "" : [dv.trainer ? "🚴 " + nm("trainer") : "", dv.hr ? "❤ " + nm("hr") : ""].filter(Boolean).join(" · "); // résumé des appareils appariés pour le plein écran
  $("runDot").classList.toggle("on", !!kinds.length); $("runBtTxt").textContent = "";
  // un chip par appareil connecté, avec son propre bouton « Déconnecter » ; le bouton d'appairage correspondant disparaît tant que l'appareil est connecté
  const srch = ["trainer", "hr"].filter(k => AUTO.busy[k] && !dv[k]).map(k => `<span class="rchip"><span>🔎 ${esc(t("runBtSearch", devNm(k)))}</span><button type="button" class="alt small" data-ds="${k}">${esc(t("stopGen"))}</button></span>`).join("");
  $("runDevs").innerHTML = srch + kinds.map(k => { const lb = esc(t("runDiscT", nm(k))); return `<span class="rchip"><span>${k === "hr" ? "❤" : "🚴"} ${esc(nm(k))}</span><button type="button" class="alt small" data-dc="${k}" title="${lb}" aria-label="${lb}">✕ ${esc(t("runDisc"))}</button></span>`; }).join("");
  [["runPairT", "trainer"], ["runPairH", "hr"]].forEach(([id, k]) => { const b = $(id); b.hidden = !!dv[k]; b.style.display = dv[k] ? "none" : ""; });
  const m = $("runBtMsg"); m.hidden = !!navigator.bluetooth; if(!navigator.bluetooth) m.textContent = t("runNoBT");
  runErgBadge();
}
// Badge ERG : état de la commande envoyée au trainer (point de contrôle FTMS accordé + case ERG cochée + séance en cours)
function runErgBadge(){
  const b = $("runErgB"); if(!b || !RUN) return;
  let k = "", c = "";
  if(RUN.dev.trainer){
    if(!RUN.cp){ k = "ergNone"; c = "var(--mute)"; }
    else if(!$("runErg").checked){ k = "ergOff"; c = "#eab308"; }
    else if(RUN.paused){ k = "ergRdy"; c = "#3b82f6"; }
    else { k = "ergOn"; c = "#22c55e"; }
  }
  const sg = RUN.steps && RUN.steps[RUN.i]; b.hidden = !k; b.textContent = k ? (k === "ergOn" && sg && sg.g != null ? t("simOn") + " " + sg.g.toFixed(1) + "%" : t(k)) : ""; b.style.color = c;
}
function runDevGone(kind){ // nettoyage commun : événement GATT de déconnexion ou bouton « Déconnecter »
  const R = RUN; delete R.dev[kind];
  if(kind === "hr") R.live.h = null;
  else{ R.cp = null; R.fec = false; $("runErgL").hidden = true; R.live.p = null; R.live.c = null; R.crk = null; R.cadSrc = ""; R.cadAt = 0; }
  runBtUI();
}
async function runUnpair(kind){
  const R = RUN, d = R.dev[kind]; if(!d) return; AUTO.manual[kind] = true; // déconnexion volontaire : pas de reconnexion automatique
  if(kind !== "hr" && R.cp){ runCpSend([0x01]); try{ await R.cpq; }catch(e){} } // rend d'abord le trainer à l'état libre (sortie d'ERG)
  try{ if(d.gatt && d.gatt.connected) d.gatt.disconnect(); }catch(e){}
  setTimeout(() => { if(R.dev[kind] === d) runDevGone(kind); }, 500); // filet de sécurité si l'événement de déconnexion n'arrive pas
}
// Cadence depuis les tours de manivelle du Cycling Power Measurement (0x2A63) : repli quand l'Indoor Bike Data FTMS ne porte pas la cadence
function runCrank(v, extra){
  const R = RUN, f = v.getUint16(0, true); if(!(f & 32)) return;
  let o = 4; if(f & 1) o += 1; if(f & 4) o += 2; if(f & 16) o += 6;
  if(v.byteLength < o + 4) return;
  const rev = v.getUint16(o, true), tm = v.getUint16(o + 2, true), now = Date.now(), k = R.crk || {rev, tm, at: now, rpm: 0};
  const dr = (rev - k.rev) & 0xFFFF, dt = (tm - k.tm) & 0xFFFF; // compteurs 16 bits qui bouclent ; temps en 1/1024 s
  if(dt > 0){ const r = dr / (dt / 1024) * 60; if(r <= 250) k.rpm = r; k.rev = rev; k.tm = tm; k.at = now; }
  else if(now - k.at > 2500) k.rpm = 0; // plus d'événement de manivelle : on ne pédale plus
  R.crk = k;
  if(extra && R.cadSrc === "FTMS" && now - (R.cadAt || 0) < 3000) return; // FTMS fournit déjà la cadence : elle prime
  R.live.c = k.rpm; R.cadAt = now; R.cadSrc = "Power";
}
// Appareil déjà connu (autorisé auparavant) : retrouvé par getDevices() puis réveillé par sa publicité Bluetooth, sans ouvrir le sélecteur
// Renvoie l'appareil, null s'il n'a pas encore été vu (éteint, hors de portée), ou false si le navigateur ne le connaît plus (autorisation retirée).
async function runKnownDevice(kind){
  const id = store.get("si_dev_" + kind); if(!id || !navigator.bluetooth || !navigator.bluetooth.getDevices) return false;
  let dev = null; try{ dev = (await navigator.bluetooth.getDevices()).find(d => d.id === id) || null; }catch(e){ return false; }
  if(!dev) return false;
  if(dev.watchAdvertisements){ // Chrome exige d'avoir vu l'appareil annoncer sa présence avant de s'y connecter
    try{
      const ac = new AbortController();
      await new Promise((res, rej) => { const to = setTimeout(() => { ac.abort(); rej(new Error("timeout")); }, 8000); dev.addEventListener("advertisementreceived", () => { clearTimeout(to); ac.abort(); res(); }, {once: true}); dev.watchAdvertisements({signal: ac.signal}).catch(rej); });
    }catch(e){ return null; }
  }
  return dev;
}
// Reconnexion automatique : trainer et ceinture cherchés en parallèle, en boucle jusqu'à 3 minutes (on peut allumer le trainer ou mettre la ceinture après l'ouverture du lecteur) ;
// elle reprend aussi toute seule si un appareil décroche pendant la séance, sauf après un « Déconnecter » volontaire.
const AUTO = {busy: {}, stop: {}, manual: {}, wide: {}};
const devNm = k => store.get("si_devn_" + k) || t(k === "hr" ? "runPairH" : "runPairT");
async function runAutoKind(k){
  if(AUTO.busy[k] || !RUN) return; AUTO.busy[k] = true; AUTO.stop[k] = false; runBtUI();
  const end = Date.now() + 180000; let gone = false;
  try{
    while(RUN && !RUN.dev[k] && !AUTO.stop[k] && Date.now() < end && mode === "run" && store.get("si_dev_" + k)){
      let r = null; try{ r = await runPair(k, true); }catch(e){}
      if(r === true) break;
      if(r === "gone"){ gone = true; break; }
      await new Promise(res => setTimeout(res, 3000));
    }
  }finally{
    AUTO.busy[k] = false;
    if(RUN && !RUN.dev[k] && !AUTO.stop[k] && mode === "run" && store.get("si_dev_" + k)){
      const m = $("runBtMsg"); m.hidden = false; m.textContent = t("runBtGiveUp", devNm(k));
      if(gone){ store.set("si_dev_" + k, ""); store.set("si_devn_" + k, ""); } // le navigateur ne connaît plus cet appareil : on oublie, le bouton « Associer » reprend la main
    }
    runBtUI();
  }
}
async function runAutoConnect(){ // à l'ouverture du lecteur (et au retour dans l'appli) : reconnexion silencieuse aux appareils mémorisés
  if(!navigator.bluetooth || !RUN) return;
  const known = ["trainer", "hr"].filter(k => store.get("si_dev_" + k) && !RUN.dev[k]); if(!known.length) return;
  if(!navigator.bluetooth.getDevices){ const m = $("runBtMsg"); m.hidden = false; m.textContent = t("runBtNoAuto"); return; }
  known.forEach(k => runAutoKind(k)); // en parallèle
}
document.addEventListener("visibilitychange", () => { if(!document.hidden && typeof RUN !== "undefined" && RUN && mode === "run") runAutoConnect().catch(() => {}); });
async function runPair(kind, auto){
  const m = $("runBtMsg"), say = x => { m.hidden = false; m.textContent = x; };
  if(!navigator.bluetooth){ runBtUI(); return false; }
  const svcs = kind === "hr" ? ["heart_rate"] : ["fitness_machine", "cycling_power"], opt = kind === "hr" ? svcs : svcs.concat(FEC);
  // un trainer n'annonce pas toujours son service dans sa publicité Bluetooth (Tacx Neo…) : on accepte aussi par nom ; la case « tous les appareils » ne filtre plus rien
  const names = ["Tacx", "NEO", "KICKR", "Wahoo", "Elite", "Saris", "Zwift", "Wattbike", "JetBlack"];
  let opts = $("runAll").checked ? {acceptAllDevices: true, optionalServices: opt} : {filters: svcs.map(x => ({services: [x]})).concat(kind === "hr" ? [] : names.map(n => ({namePrefix: n}))), optionalServices: opt};
  let dev = null;
  if(auto){ dev = await runKnownDevice(kind); if(dev === false) return "gone"; if(!dev) return false; say(t("runBtAuto", dev.name || "BLE")); }
  else{
    const sn = store.get("si_devn_" + kind), narrow = !!sn && !AUTO.wide[kind] && !$("runAll").checked; // appareil déjà associé : le sélecteur ne propose que lui (un seul appui)
    if(narrow) opts = {filters: [{name: sn}], optionalServices: opt};
    try{ dev = await navigator.bluetooth.requestDevice(opts); AUTO.wide[kind] = false; }
    catch(err){ console.warn("BLE:", err); if(narrow && err.name === "NotFoundError"){ AUTO.wide[kind] = true; say(t("runBtNarrow", sn)); } else say(err.name === "NotFoundError" ? t("runBtNone") : err.name + ": " + err.message); return false; }
  }
  let note = "";
  try{
    const srv = await dev.gatt.connect();
    if(kind === "hr"){
      const ch = await (await srv.getPrimaryService("heart_rate")).getCharacteristic("heart_rate_measurement");
      ch.addEventListener("characteristicvaluechanged", e => { const v = e.target.value; RUN.live.h = (v.getUint8(0) & 1) ? v.getUint16(1, true) : v.getUint8(1); runPump(); });
      await ch.startNotifications();
    }else{
      let svc = null, sErr = ""; try{ svc = await srv.getPrimaryService("fitness_machine"); }catch(e){ sErr = e.name + ": " + e.message; }
      if(svc){
        const ch = await svc.getCharacteristic(0x2AD2);
        ch.addEventListener("characteristicvaluechanged", e => { // flags (16 bits) puis champs dans l'ordre de la spec FTMS
          const v = e.target.value, f = v.getUint16(0, true); let o = 2;
          if(!(f & 1)) o += 2; if(f & 2) o += 2;
          if(f & 4){ RUN.live.c = v.getUint16(o, true) / 2; RUN.cadAt = Date.now(); RUN.cadSrc = "FTMS"; o += 2; } if(f & 8) o += 2;
          if(f & 16) o += 3; if(f & 32) o += 2;
          if(f & 64){ RUN.live.p = v.getInt16(o, true); }
          runPump();
        });
        await ch.startNotifications();
        try{ // ERG : point de contrôle FTMS (facultatif : certains trainers n'en ont pas)
          const cp = await svc.getCharacteristic(0x2AD9);
          cp.addEventListener("characteristicvaluechanged", e => { const v = e.target.value; if(v.byteLength < 3 || v.getUint8(0) !== 0x80) return; const op = v.getUint8(1), res = v.getUint8(2); if(res === 1) return;
            console.warn("FTMS CP refus", op, res); // seul un refus de la prise de contrôle coupe l'ERG ; l'échec d'une autre commande (ex. « démarrer » déjà actif) est toléré
            if(op === 0x00){ RUN.cp = null; $("runErgL").hidden = true; say(t("runErgNo") + " (code " + res + ")"); runErgBadge(); }
            else if((op === 0x05 || op === 0x11) && res === 5 && (RUN.reqN = (RUN.reqN || 0) + 1) <= 3){ runCpSend([0x00]); RUN.sentW = null; RUN.sentG = null; } // contrôle perdu : on le redemande (3 fois max)
          });
          await cp.startNotifications(); RUN.cp = cp; RUN.cpq = null; RUN.sentW = null; $("runErgL").hidden = false; runCpSend([0x00]); if(!RUN.paused){ runCpSend([0x07]); }
        }catch(e){ console.warn("ERG indisponible", e); note = t("runErgFail", e.name + ": " + e.message); }
        try{ // cadence de repli via les tours de manivelle du Cycling Power (certains trainers ne mettent pas la cadence dans l'Indoor Bike Data)
          const pc = await (await srv.getPrimaryService("cycling_power")).getCharacteristic("cycling_power_measurement");
          pc.addEventListener("characteristicvaluechanged", e => runCrank(e.target.value, true)); await pc.startNotifications();
        }catch(e){ console.warn("Cycling Power (cadence) indisponible", e); }
      }else{ // repli : puissance seule via le service Cycling Power (pas de cadence ni d'ERG)
        const pw = await (await srv.getPrimaryService("cycling_power")).getCharacteristic("cycling_power_measurement");
        pw.addEventListener("characteristicvaluechanged", e => { RUN.live.p = e.target.value.getInt16(2, true); runCrank(e.target.value, false); runPump(); });
        await pw.startNotifications(); note = t("runNoFtms", sErr || "—");
        try{ // pas de FTMS : contrôle ERG via Tacx FE-C over BLE
          const fs = await srv.getPrimaryService(FEC), tx = await fs.getCharacteristic("6e40fec3-b5a3-f393-e0a9-e50e24dcca9e");
          try{ await (await fs.getCharacteristic("6e40fec2-b5a3-f393-e0a9-e50e24dcca9e")).startNotifications(); }catch(e){} // certains trainers veulent la notification activée
          RUN.cp = tx; RUN.fec = true; RUN.cpq = null; RUN.sentW = null; $("runErgL").hidden = false; note = t("runFec");
        }catch(e){ console.warn("FE-C indisponible", e); note = t("runNoFtms", (sErr || "—") + " / FE-C: " + e.name + ": " + e.message); }
      }
    }
    RUN.dev[kind] = dev; AUTO.manual[kind] = false; try{ store.set("si_dev_" + kind, dev.id); store.set("si_devn_" + kind, dev.name || ""); }catch(e){}
    dev.addEventListener("gattserverdisconnected", () => { if(RUN.dev[kind] === dev){ runDevGone(kind); if(!AUTO.manual[kind] && mode === "run") runAutoKind(kind); } }); // décrochage involontaire : on relance la recherche
    if(kind !== "hr") setTimeout(() => { if(RUN.dev.trainer === dev && !RUN.cadSrc) say(t("runNoCad")); }, 10000); // ni FTMS ni Cycling Power n'annoncent de cadence
    runBtUI(); if(note) say(note);
    return true;
  }catch(err){ console.warn("BLE:", err); try{ dev.gatt.disconnect(); }catch(e){} if(!auto) say(t("runBtFail", dev.name || "BLE", err.name + ": " + err.message)); return false; }
}
