/* FlameCadence - Player: trainer control (ERG/FE-C), finish dialogs, upload and retry pool, beeps */
// Tacx FE-C over BLE : messages ANT+ (sync A4, longueur 9, id 4E, canal 5, 8 octets, checksum XOR). Page 0x31 = puissance cible (0,25 W), page 0x30 = résistance de base (0 % = libre)
function fecMsg(b){ let d = null; if(b[0] === 0x05){ const q = Math.min(0xFFFF, (b[1] | b[2] << 8) * 4); d = [0x31, 255, 255, 255, 255, 255, q & 255, q >> 8]; } else if(b[0] === 0x11){ let gr = b[3] | b[4] << 8; if(gr > 32767) gr -= 65536; const raw = Math.max(0, Math.min(0xFFFF, gr + 20000)); d = [0x33, 255, 255, 255, 255, raw & 255, raw >> 8, 80]; } /* page 0x33 : pente (0,01 %, décalage −200 %) + coefficient de roulement */ else if(b[0] === 0x01 || b[0] === 0x08) d = [0x30, 255, 255, 255, 255, 255, 255, 0]; if(!d) return null; const m = [0xA4, 9, 0x4E, 5, ...d]; m.push(m.reduce((a, x) => a ^ x, 0)); return new Uint8Array(m); }
function runCpSend(b){ const R = RUN; if(!R.cp) return; const ch = R.cp, u = R.fec ? fecMsg(b) : new Uint8Array(b); if(!u) return; R.cpq = (R.cpq || Promise.resolve()).then(() => ch.writeValueWithResponse ? ch.writeValueWithResponse(u) : ch.writeValue(u)).catch(e => console.warn("ERG CP", e)); } // écritures GATT sérialisées
function runErgTarget(w){ const R = RUN; if(!R.cp || !$("runErg").checked || R.paused) return; w = Math.max(0, Math.round(w)); if(R.sentW === w) return; R.sentW = w; R.sentG = null; runCpSend([0x05, w & 255, (w >> 8) & 255]); }
// mode PENTE (FTMS 0x11 « paramètres de simulation » : vent 0, pente en 0,01 %, Crr 0,004, Cw 0,51) : remplace la cible de puissance, donc l'ERG est suspendu pendant ces étapes
function runErgGrade(g){ const R = RUN; if(!R.cp || !$("runErg").checked || R.paused) return; const gr = Math.round(Math.max(-40, Math.min(40, g)) * 100); if(R.sentG === gr) return; R.sentG = gr; R.sentW = null; runCpSend([0x11, 0, 0, gr & 255, (gr >> 8) & 255, 40, 51]); }
function runErgPause(pause){ const R = RUN; if(!R.cp || !$("runErg").checked) return; R.sentW = null; R.sentG = null; runCpSend(pause ? [0x08, 0x02] : [0x07]); }
// ---- enregistrement : une mesure par seconde, uniquement avec de vraies données Bluetooth (jamais la simulation)
function runTcx(rec, nm){
  const R = RUN, pts = rec || R.rec, iso8 = x => new Date(x).toISOString(), P = pts.filter(x => x.p != null).map(x => x.p), H = pts.filter(x => x.h != null).map(x => x.h), av = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;
  const tp = pts.map(x => `<Trackpoint><Time>${iso8(x.t)}</Time>${x.d != null ? `<DistanceMeters>${x.d}</DistanceMeters>` : ""}${x.h != null ? `<HeartRateBpm><Value>${Math.round(x.h)}</Value></HeartRateBpm>` : ""}${x.c != null ? `<Cadence>${Math.round(x.c)}</Cadence>` : ""}${x.p != null ? `<Extensions><ns3:TPX><ns3:Watts>${Math.round(x.p)}</ns3:Watts></ns3:TPX></Extensions>` : ""}</Trackpoint>`).join("");
  const tot = Math.round((pts[pts.length - 1].t - pts[0].t) / 1000), kj = Math.round(P.reduce((x, y) => x + y, 0) / 1000);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2"><Activities><Activity Sport="Biking"><Id>${iso8(pts[0].t)}</Id><Lap StartTime="${iso8(pts[0].t)}"><TotalTimeSeconds>${tot}</TotalTimeSeconds><DistanceMeters>${Math.round(pts[pts.length - 1].d || 0)}</DistanceMeters><Calories>${kj}</Calories>${H.length ? `<AverageHeartRateBpm><Value>${av(H)}</Value></AverageHeartRateBpm><MaximumHeartRateBpm><Value>${Math.round(Math.max(...H))}</Value></MaximumHeartRateBpm>` : ""}<Intensity>Active</Intensity><TriggerMethod>Manual</TriggerMethod><Track>${tp}</Track></Lap><Notes>${esc(nm || (R.cur && R.cur.name) || "FlameCadence")}</Notes></Activity></Activities></TrainingCenterDatabase>`;
}
// « Terminer et enregistrer » : on demande d'abord Enregistrer ou Abandonner (rien, ou presque, d'enregistré : pas de choix à proposer)
function runFinAsk(){
  const R = RUN, d = $("runFinDlg"), pts = (R && R.rec) || []; if(d.open || R.closing) return; // déjà enregistrée (ou en file d'attente) : pas de 2e envoi
  if(pts.length < 30){ runFinNoData(); return; }
  runFinDlgMode(false);
  const ps = pts.filter(x => x.p != null).map(x => x.p), avg = ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : 0;
  $("finSum").textContent = "⏱ " + runFmt(Math.round((pts[pts.length - 1].t - pts[0].t) / 1000)) + (avg ? " · ⌀ " + avg + " W" : "");
  d.showModal();
}
// abandon : l'enregistrement est supprimé (et retiré de la file d'attente s'il y était), le lecteur est masqué et remis au début de la séance
function runDiscard(){ if(RUN.pend){ poolDel(RUN.pend.id).then(poolRender); RUN.pend = null; } RUN.rec = []; $("runEnd").hidden = true; if(RUN.cur) runLoad(RUN.cur); runFs(false); runLaunchUI(); }
// sans données enregistrées (aucun appareil connecté) : la fenêtre ne propose que « Abandonner »
function runFinDlgMode(noData){
  ["finSave", "finHint"].forEach(id => { const e = $(id); if(e) e.hidden = noData; });
  const fb = $("finBack"); if(fb){ fb.hidden = false; fb.textContent = t(noData ? "finBackNo" : "finBack"); } // sans données : « Reprendre » (relance le lecteur) ; sinon « Continuer »
  $("finHintNo").hidden = !noData;
}
function runFinNoData(){
  const R = RUN, d = $("runFinDlg"); musStop(); R.paused = true; runErgPause(true); runUI();
  const pts = R.rec || [], el = Math.round(R.el || 0);
  $("finSum").textContent = "⏱ " + runFmt(pts.length ? Math.round((pts[pts.length - 1].t - pts[0].t) / 1000) : el);
  runFinDlgMode(true); if(!d.open) d.showModal();
}
function runFinish(){
  { const fd = $("runFinDlg"); if(fd && fd.open) fd.close(); } // fin automatique de la séance pendant que la question était affichée
  if(((RUN && RUN.rec) || []).length < 30){ runFinNoData(); return; } // rien d'enregistré : pas de résumé à afficher
  runFinDlgMode(false);
  musStop(); const R = RUN; R.paused = true; runErgPause(true); runUI();
  const pts = R.rec || [], box = $("runEnd"), m = $("runEndM"); box.hidden = false; m.textContent = ""; R.upDone = false; R.pend = null; runLaunchUI();
  $("runUp").hidden = true; $("runUp").disabled = false;
  const ev = R.cur && /^cal:(\d+)$/.exec(R.cur.id);
  R.pend = {id: "a" + pts[0].t, at: pts[0].t, name: (R.cur && R.cur.name) || "FlameCadence", ev: ev ? +ev[1] : null, rec: pts.slice(), dur: Math.round((pts[pts.length - 1].t - pts[0].t) / 1000), tries: 0};
  runAutoUp();
}
// ---- envoi automatique vers intervals.icu ; en cas d'échec (ou sans clé), l'activité va dans la file d'attente (IndexedDB) et repart toute seule plus tard
async function icuSendAct(a){
  const fd = new FormData(); fd.append("file", new File([runTcx(a.rec, a.name)], "flamecadence.tcx", {type: "application/vnd.garmin.tcx+xml"}));
  let r = await icuFetch(icuUrl("/activities"), {method: "POST", body: fd}); r = Array.isArray(r) ? r[0] : r; const id = r && r.id;
  if(id){ try{ // nom de la séance, type home trainer et rattachement à la séance planifiée (au mieux : l'envoi, lui, est réussi)
    const body = {name: a.name, type: "VirtualRide", trainer: true}; if(a.ev) body.paired_event_id = a.ev;
    await icuRaw("https://intervals.icu/api/v1/activity/" + encodeURIComponent(id), {method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
  }catch(e){ console.warn(e); } }
  return id || true;
}
const POOL = {db: null, busy: {}};
function poolDb(){ return POOL.db || (POOL.db = new Promise(res => { try{ if(!window.indexedDB){ res(null); return; } const r = indexedDB.open("flamecadence_pool", 1); r.onupgradeneeded = () => r.result.createObjectStore("a", {keyPath: "id"}); r.onsuccess = () => res(r.result); r.onerror = () => res(null); }catch(e){ res(null); } })); }
async function poolOp(mode, fn){ const db = await poolDb(); if(!db) return null; return new Promise(res => { try{ const tx = db.transaction("a", mode), rq = fn(tx.objectStore("a")); tx.oncomplete = () => res(rq && "result" in rq ? rq.result : true); tx.onerror = tx.onabort = () => res(null); }catch(e){ res(null); } }); }
const poolAll = async () => ((await poolOp("readonly", s => s.getAll())) || []).sort((x, y) => x.at - y.at), poolPut = a => poolOp("readwrite", s => s.put(a)), poolDel = id => poolOp("readwrite", s => s.delete(id));
async function runAutoUp(){
  const R = RUN, a = R.pend, m = $("runEndM"); if(!a || POOL.busy[a.id]) return;
  await poolPut(a); // d'abord en file d'attente : rien n'est perdu si la page se ferme pendant l'envoi
  $("runUp").hidden = true;
  if(!KEY()){ m.textContent = t("runUpNoKey"); runSaveClear(); poolRender(); runCloseMode(); return; } // en file d'attente : « Fermer » apparaît
  POOL.busy[a.id] = 1; m.textContent = "⏳ " + t("runUping");
  try{
    const id = await icuSendAct(a); await poolDel(a.id);
    m.innerHTML = esc(t("runUpOk")) + (id && id !== true ? ` · <a href="https://intervals.icu/activities/${encodeURIComponent(id)}" target="_blank" rel="noopener">intervals.icu ↗</a>` : "");
    R.upDone = true; R.pend = null; R.at = 0; runSaveClear(); runCloseMode();
    setTimeout(poolRetry, 1500);
  }catch(e){
    a.tries = (a.tries || 0) + 1; a.err = errText(e); await poolPut(a);
    m.textContent = t("runUpPend", errText(e)); $("runUp").hidden = false; $("runUp").textContent = t("runRetry"); runSaveClear(); runCloseMode(); // en file d'attente : « Fermer » apparaît, « Réessayer » reste possible
  }
  delete POOL.busy[a.id]; poolRender();
}
function runCloseMode(){ RUN.closing = true; runUI(); } // activité enregistrée : le bouton « Reprendre » devient « Fermer »
function runCloseNow(){ RUN.closing = true; runSaveClear(); try{ runFs(false); }catch(e){} runSaveClear(); location.reload(); } // ferme le lecteur et recharge la page : la liste des séances planifiées est remise à jour
function runUpload(){ return runAutoUp(); } // bouton « Réessayer l'envoi »
async function poolRetry(){
  if(!KEY() || navigator.onLine === false) return; let sent = 0;
  for(const a of await poolAll()){
    if(POOL.busy[a.id]) continue; POOL.busy[a.id] = 1;
    try{ await icuSendAct(a); await poolDel(a.id); sent++; if(RUN && RUN.pend && RUN.pend.id === a.id){ RUN.pend = null; RUN.upDone = true; $("runEndM").textContent = t("runUpOk"); $("runUp").hidden = true; runCloseMode(); } }
    catch(e){ a.tries = (a.tries || 0) + 1; a.err = errText(e); await poolPut(a); delete POOL.busy[a.id]; break; } // réseau ou clé en défaut : inutile d'insister sur les suivantes
    delete POOL.busy[a.id];
  }
  if(sent){ if(typeof loadCal === "function") loadCal(true).catch(() => {}); }
  poolRender();
}
async function poolRender(){
  const c = $("runPoolC"); if(!c) return; const list = await poolAll(); c.hidden = !list.length; if(!list.length){ $("poolRows").innerHTML = ""; return; }
  $("poolN").textContent = "(" + list.length + ")";
  $("poolRows").innerHTML = list.map(a => `<div class="prow"><span><b>${esc(a.name)}</b><small>${esc(new Date(a.at).toLocaleString(loc(), {dateStyle: "medium", timeStyle: "short"}))} · ${esc(fmtDur(a.dur || 0))}${a.err ? " · ⚠ " + esc(a.err) : ""}</small></span><button type="button" class="alt small" data-pu="${esc(a.id)}">${esc(t("poolUp"))}</button><button type="button" class="alt small" data-pd="${esc(a.id)}">${esc(t("poolDel"))}</button></div>`).join("");
}
document.addEventListener("click", e => {
  const u = e.target.closest && e.target.closest("[data-pu]"), d = e.target.closest && e.target.closest("[data-pd]");
  if(u){ u.disabled = true; poolRetry(); }
  if(d && confirm(t("poolQ"))){ const id = d.dataset.pd; if(RUN && RUN.pend && RUN.pend.id === id) RUN.pend = null; poolDel(id).then(poolRender); }
});
window.addEventListener("online", () => setTimeout(poolRetry, 1500));
setTimeout(() => { poolRender(); poolRetry(); }, 3500);
function runOn(on){
  if(on && !RUN) runInit();
  if(!RUN) return;
  if(on){ runList(false); if(!RUN.tm){ RUN.tm = runTmStart(); runUI(); } setTimeout(() => runAutoConnect().catch(() => {}), 600); }
  if(!on) runFs(false);
  if(!on && RUN.tm){ runTmStop(); if(!RUN.paused) runErgPause(true); RUN.paused = true; runUI(); }
}
function runJump(k){ if(k < 0 || k >= RUN.steps.length) return; RUN.i = k; runEnter(); RUN.el = RUN.steps.slice(0, k).reduce((a, s) => a + s.dur, 0); runUI(); }
// ---- bips : 3 courts bips pendant les 3 dernières secondes d'une étape, un bip long au changement d'étape (contexte audio séparé, créé lors d'un geste utilisateur)
let RUN_BC = null;
const runBeepOn = () => store.get("si_rm_beep") !== "0"; // activé par défaut
const runLead = () => { const v = parseFloat(String(store.get("si_rm_lead")).replace(",", ".")); return isFinite(v) ? Math.max(0, Math.min(10, v)) : 0; }; // avance des bips (s) pour compenser le retard du son diffusé
const runAutoPause = () => { const v = parseInt(store.get("si_rm_ap"), 10); return isFinite(v) ? Math.max(0, Math.min(600, v)) : 30; }; // secondes sans puissance avant la pause automatique (0 = désactivée, 30 par défaut)
function runBeepCtx(){
  try{
    if(!RUN_BC){ const C = window.AudioContext || window.webkitAudioContext; if(!C) return null; RUN_BC = new C(); }
    if(RUN_BC.state !== "running") RUN_BC.resume().catch(() => {});
    return RUN_BC;
  }catch(e){ return null; }
}
function runBeep(freq, dur, delay = 0){
  if(!runBeepOn()) return; const c = runBeepCtx(); if(!c) return;
  try{
    const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + delay;
    o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.5, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + .05);
  }catch(e){}
}
