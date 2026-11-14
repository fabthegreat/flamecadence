/* FlameCadence - Player: wake lock, session save/restore, live metrics and drawing */
async function runWake(on){
  try{
    if(on && !RUN_WL && "wakeLock" in navigator && !document.hidden){ RUN_WL = await navigator.wakeLock.request("screen"); RUN_WL.addEventListener("release", () => { RUN_WL = null; }); }
    else if(!on && RUN_WL){ const w = RUN_WL; RUN_WL = null; await w.release(); }
  }catch(_){ RUN_WL = null; }
}
// ---- lecteur : bloque le « tirer pour actualiser » (navigateurs qui ignorent overscroll-behavior) : un glissement vers le bas depuis le haut de la page est annulé
(function(){ let y0 = 0;
  document.addEventListener("touchstart", e => { if(e.touches.length === 1) y0 = e.touches[0].clientY; }, {passive: true});
  document.addEventListener("touchmove", e => {
    if(typeof mode === "undefined" || mode !== "run" || e.touches.length !== 1 || e.touches[0].clientY <= y0 || !e.cancelable) return;
    if((document.scrollingElement || document.documentElement).scrollTop > 0) return; // la page n'est pas tout en haut : défilement normal
    if(e.target.closest && e.target.closest("input,select,textarea")) return; // curseurs et champs : on ne gêne pas
    for(let n = e.target; n && n !== document.body && n.nodeType === 1; n = n.parentElement) if(n.scrollTop > 0 && n.scrollHeight > n.clientHeight) return; // zone interne déjà défilée
    e.preventDefault();
  }, {passive: false});
})();
document.addEventListener("visibilitychange", () => { if(!document.hidden && typeof RUN !== "undefined" && RUN && mode === "run") [0, 150, 600].forEach(d => setTimeout(() => runFit(), d)); /* retour d'une autre application : la hauteur visible se stabilise avec un léger retard */ if(document.hidden) runSave(true); if(!document.hidden && typeof RUN !== "undefined" && RUN && RUN.tm) runTick(); }); // retour au premier plan : rattrapage immédiat
// ---- reprise après rechargement : Android peut décharger la page en arrière-plan ; la séance (étape, temps, enregistrement) est sauvegardée et reprise
const RUN_SAVE = "si_runsess";
function runSave(force){
  if(!RUN || !RUN.began || !RUN.cur || RUN.closing) return; const now = Date.now(); // RUN.closing : activité terminée et enregistrée → ne plus sauvegarder, sinon pagehide/visibilitychange recrée la session « terminée » et le lecteur se rouvre après le rechargement
  if(!force && now - (RUN.sv || 0) < 4000) return; RUN.sv = now;
  try{ localStorage.setItem(RUN_SAVE, JSON.stringify({v: 1, at: now, cur: {id: RUN.cur.id, name: RUN.cur.name, st: RUN.cur.st}, i: RUN.i, left: RUN.left, ml: RUN.mleft, el: RUN.el, nudge: RUN.nudge, paused: RUN.paused, last: RUN.last || now, done: !$("runEnd").hidden, rec: (RUN.rec || []).slice(-20000)})); }catch(e){}
}
const runSaveClear = () => { try{ localStorage.removeItem(RUN_SAVE); }catch(e){} };
function runRestore(){
  let sn = null; try{ sn = JSON.parse(localStorage.getItem(RUN_SAVE) || "null"); }catch(e){}
  if(!sn || sn.v !== 1 || !sn.cur || !Array.isArray(sn.cur.st) || !sn.cur.st.length || Date.now() - sn.at > 12 * 3600 * 1000) return;
  RUN.touched = true; RUN.cur = sn.cur; runLoad(sn.cur);
  $("runWkName").textContent = $("runFsName").textContent = sn.cur.name; $("runLs").open = false;
  Object.assign(RUN, {began: true, i: Math.min(sn.i || 0, RUN.steps.length - 1), left: sn.left, el: sn.el, nudge: sn.nudge || 0, paused: !!sn.paused, rec: sn.rec || [], dist: ((sn.rec || []).length ? (sn.rec[sn.rec.length - 1].d || 0) : 0), last: sn.last, acc: 0}); // le premier tick rattrape le temps écoulé depuis la dernière sauvegarde
  { const sr = RUN.steps[RUN.i]; RUN.mleft = sr && sr.m > 0 ? (sn.ml != null ? sn.ml : sr.m) : 0; }
  runUI(); if(sn.done) runFinish();
  runFs(true); runWant(true); runSave(true); // lecteur directement à l'écran ; le plein écran natif revient au premier toucher
}
function runWant(v){ RUN.wantFs = v; $("runFsHint").hidden = !v; }
function runLaunchUI(){ // hors plein écran : un seul bouton (Lancer l'activité / Retour au lecteur) ; les données ne s'affichent qu'en plein écran
  const b = $("runGo"); if(!RUN || !b) return;
  $("runLaunch").hidden = !$("runEnd").hidden; b.disabled = !RUN.cur || !RUN.steps.length;
  b.textContent = RUN.began ? "↩ " + t("runBack") : "▶ " + t("runGoT");
}
function runGo(){
  if(!RUN || !RUN.cur || !RUN.steps.length) return; runBeepCtx(); // geste utilisateur : prépare le son
  runFs(true); // geste utilisateur : plein écran natif ; la séance ne démarre pas ici : l'utilisateur appuie sur Démarrer une fois installé sur le home trainer
  RUN.touched = true;
  runUI();
}
const RUNMX = ["avg", "avgS", "kj", "dec", "dist"]; // mesures optionnelles du lecteur, cochées dans Réglages > Lecteur (clé si_rm_<id>)
function runMxUI(){
  if(typeof RUN === "undefined" || !RUN || !$("runMx")) return;
  const on = {}; RUNMX.forEach(k => { on[k] = store.get("si_rm_" + k) === "1"; $("runMx_" + k).hidden = !on[k]; });
  const any = RUNMX.some(k => on[k]); $("runMx").hidden = !any; if(!any) return;
  const rec = RUN.rec || [], P = rec.filter(x => x.p != null), sum = a => a.reduce((x, y) => x + y, 0), avg = a => a.length ? Math.round(sum(a) / a.length) : "--", set = (k, v, sm) => { $("runMxV_" + k).textContent = v; $("runMxS_" + k).textContent = sm || ""; }; // vraies données seulement
  if(on.avgS) set("avgS", avg(P.map(x => x.p)), "W");
  if(on.avg) set("avg", avg(P.filter(x => x.i === RUN.i).map(x => x.p)), "W");
  if(on.kj){ const kj = sum(P.map(x => x.p)) / 1000; set("kj", P.length ? kj.toFixed(kj < 100 ? 1 : 0) : "--", "kJ"); }
  if(on.dist) set("dist", ((RUN.dist || 0) / 1000).toFixed(2), "km"); // approximative : modèle physique à partir de la puissance
  if(on.dec){
    const B = rec.filter(x => x.p != null && x.h > 0), h = B.length >> 1, ef = a => sum(a.map(x => x.p)) / sum(a.map(x => x.h)); // efficacité = puissance / FC
    const e1 = B.length >= 600 ? ef(B.slice(0, h)) : 0, e2 = B.length >= 600 ? ef(B.slice(h)) : 0;
    if(e1 > 0 && e2 > 0) set("dec", ((e1 - e2) / e1 * 100).toFixed(1) + "%", t("runMxDecS")); else set("dec", "--", t("runMxDecW"));
  }
}
// cible de cadence d'une étape ("90" ou "90-100") → [min, max] tolérés ; marge de 5 rpm autour d'une valeur seule, 3 rpm autour d'une plage
function runCadRange(c){ const m = /^(\d+)(?:-(\d+))?$/.exec(String(c || "").trim()); if(!m) return null; const a = +m[1], b = m[2] ? +m[2] : a; return a === b ? [a - 5, a + 5] : [Math.min(a, b) - 3, Math.max(a, b) + 3]; }
function runUI(){
  runLaunchUI();
  if(!RUN || !RUN.steps.length) return;
  runWake((!RUN.paused || document.querySelector('[data-block="run"]').classList.contains("rfs")) && !!RUN.tm); // écran maintenu allumé aussi pendant l'attente avant le départ
  runKeepAlive(!!RUN.began && $("runEnd").hidden && !!RUN.tm); runMedia(); musSync();
  const st = RUN.steps[RUN.i], tgt = runTgt(st, RUN.left), ftp = runFtp(), ap = Math.round(RUN.ap || 0), d = ap - tgt;
  $("runNum").textContent = (RUN.i + 1) + "/" + RUN.steps.length; $("runName").textContent = runTitle(st.name);
  $("runBar").style.setProperty("--rzc", runZC(st.z));
  $("runTimer").textContent = st.m > 0 ? fmtDistShort(RUN.mleft) : runFmt(RUN.left); $("runElapsed").textContent = runFmt(RUN.el); $("runDur").textContent = (RUN.hasM ? "~" : "") + runFmt(RUN.total); $("runRem").textContent = (RUN.hasM ? "~" : "") + runFmt(Math.max(0, Math.round(RUN.total - RUN.el)));
  if(st.g != null) runErgGrade(st.g); else runErgTarget(tgt); $("runTP").textContent = tgt; $("runPct").textContent = Math.round(tgt / ftp * 100) + "% FTP" + (RUN.nudge ? " (" + (RUN.nudge > 0 ? "+" : "") + RUN.nudge + " W)" : "") + (st.pw !== st.pw2 ? " ↗" : "") + (st.g != null ? " · ⛰ " + st.g.toFixed(1) + "%" : "");
  $("runAP").textContent = ap; $("runZone").textContent = "Z" + st.z;
  { const zk = (id, z) => { const c = $(id).closest(".rcard"); if(!c) return; if(z){ c.style.setProperty("--zc", runZC(z)); c.classList.add("zk"); }else c.classList.remove("zk"); }; // cadres colorés selon la zone de travail
    zk("runTP", zoneOf(tgt / ftp * 100)); zk("runAP", ap > 0 ? zoneOf(ap / ftp * 100) : 1); const hz = RUN.hr ? runHrZ(RUN.hr) : 0; zk("runHRv", hz); }
  const vb = $("runVar"), ok = Math.abs(d) <= 10; const gd = st.g != null; vb.textContent = t((ok ? "runOn" : d > 0 ? "runHi" : "runLo") + (gd ? "G" : "")); $("runTgtL").textContent = t(gd ? "runGuide" : "runTgt"); $("runTP").title = gd ? t("edGuideT") : ""; vb.style.color = ok ? "#22c55e" : d > 0 ? "#eab308" : "#ef4444";
  $("runHRv").textContent = RUN.hr ? Math.round(RUN.hr) : "--"; $("runCV").textContent = RUN.live.c != null || RUN.cad ? Math.round(RUN.cad) : "--"; $("runCT").textContent = "rpm · " + st.cad; $("runCT").title = RUN.cadSrc ? "Source: " + RUN.cadSrc : "";
  { const cr = runCadRange(st.cad); RUN.cadOk = cr && !RUN.paused && RUN.live.c != null ? (RUN.cad >= cr[0] && RUN.cad <= cr[1] ? 1 : 2) : 0; const cc = $("runCV").closest(".rcard"); if(cc){ cc.classList.toggle("cok", RUN.cadOk === 1); cc.classList.toggle("cbad", RUN.cadOk === 2); } } // vert : cadence dans la cible, rouge : hors cible (rien sans capteur, en pause ou sans cible)
  $("runFin").disabled = !!RUN.closing;
  $("runPlay").textContent = RUN.closing ? "✕ " + t("runClose") : RUN.paused ? "▶ " + t(RUN.el ? "runResume" : "runStart") : "⏸ " + t("runPause");
  $("runPct").title = runFtpTxt(); runTm();
  const nx = RUN.steps[RUN.i + 1]; $("runNx").style.visibility = nx ? "visible" : "hidden"; if(nx) $("runNxT").textContent = runNxTxt(nx);
  if(!RUN.paused) RUN.apz = 0; const ab = $("runAutoP"); ab.hidden = !(RUN.paused && RUN.apz); if(!ab.hidden) ab.textContent = "⏸ " + t("runAutoP", RUN.apz);
  runErgBadge(); runMxUI(); runDraw();
}
const runClock = () => new Date().toLocaleTimeString(loc(), {hour: "2-digit", minute: "2-digit"});
function runTm(){ const e = $("runFsTm"); if(!e) return; const x = "🕐 " + runClock(); if(e.textContent !== x) e.textContent = x; } // heure dans la barre de titre : aucune ligne en plus
function runHrZ(b){ const L = +ICU.lthr || 0; if(!(b > 0 && L > 0)) return 0; const x = b / L * 100; return x < 68 ? 1 : x < 83 ? 2 : x < 94 ? 3 : x < 105 ? 4 : x < 115 ? 5 : x < 130 ? 6 : 7; }
function runHrZone(){ // cadre FC coloré par zone ; neutre sans FC mesurée ou sans FC seuil (LTHR) dans le profil
  const b = parseInt($("hzHr").textContent, 10), L = +ICU.lthr || 0, k = $("hzHk"); if(!k) return;
  if(!(b > 0 && L > 0)){ k.classList.remove("zk"); return; }
  const x = b / L * 100, z = x < 68 ? 1 : x < 83 ? 2 : x < 94 ? 3 : x < 105 ? 4 : x < 115 ? 5 : x < 130 ? 6 : 7;
  k.style.setProperty("--zc", runZC(z)); k.classList.add("zk");
}
// FTP utilisée par le lecteur pour toutes les cibles en % : FTP indoor (home trainer), à défaut FTP extérieur, à défaut 250 W
function runFtpTxt(){ const i = +ICU.ftpIn || 0, o = +ICU.ftpOut || 0, m = runFtpMode(); if(m === "cus") return t("runFtpCus", runFtp()); if(m === "out" && o > 0) return t("runFtpOutS", o); return i > 0 ? t("runFtpIn", i) : o > 0 ? t("runFtpOut", o) : t("runFtpDef", runFtp()); }
// étape suivante : durée · puissance cible (avec l'ajustement ± W) · nom
function runTitle(n){ n = String(n || ""); const k = n.split(/\s+·\s+/); while(k.length > 1 && /^\d+([.,]\d+)?\s*(h|min|m|s|km|mi|%|w)?$/i.test(k[k.length - 1].trim())) k.pop(); return (k.length > 1 ? k[0] : k[0]).trim(); } // titre seul de l'étape (« Warmup · 10m » → « Warmup »)
function runNxTxt(s){ const n = RUN.nudge || 0, a = Math.max(0, s.pw + n), b = Math.max(0, s.pw2 + n); return (s.m > 0 ? fmtDistShort(s.m) : runFmt(s.dur)) + " · " + (s.g != null ? "≈ " : "") + (a === b ? a + " W" : a + "→" + b + " W") + (s.g != null ? " · ⛰ " + s.g.toFixed(1) + "%" : "") + (s.name ? " · " + runTitle(s.name) : ""); }
function runDraw(){
  const c = $("runCv"); if(!c || !RUN || !RUN.steps.length) return; const r = c.getBoundingClientRect(); if(!r.width) return;
  c.width = r.width; c.height = r.height; const g = c.getContext("2d"), cs = getComputedStyle(document.documentElement), dim = cs.getPropertyValue("--line").trim() || "#8884", ink = cs.getPropertyValue("--ink").trim() || "#000", H = c.height;
  const mx = (Math.max(...RUN.steps.map(s => Math.max(s.pw, s.pw2))) + Math.max(0, RUN.nudge)) * 1.15; let x = 0;
  // courbe de FC en arrière-plan (uniquement avec de vraies mesures Bluetooth) ; temps = secondes de séance (e), repli sur l'index pour les anciennes sauvegardes
  const hp = []; (RUN.rec || []).forEach((q, k) => { if(q.h > 0) hp.push([q.x != null ? q.x : q.e != null ? q.e : k, q.h]); });
  const hasHr = hp.length > 1;
  if(hasHr){
    const hs = hp.map(q => q[1]), lo = Math.max(30, Math.min(...hs) - 10), hi = Math.max(...hs) + 10, y = v => H * .94 - (v - lo) / (hi - lo) * H * .86;
    g.save(); g.beginPath(); let pe = -1;
    hp.forEach(([e, v]) => { const px = e / RUN.total * c.width; if(e <= pe || e - pe > 5 || pe < 0) g.moveTo(px, y(v)); else g.lineTo(px, y(v)); pe = e; });
    g.strokeStyle = "#ef4444"; g.lineWidth = 2; g.lineJoin = "round"; g.globalAlpha = .9; g.stroke(); g.restore();
    g.globalAlpha = .72; // barres légèrement translucides pour laisser voir la courbe derrière
  }
  RUN.steps.forEach((s, k) => {
    const w = s.dur / RUN.total * c.width, n = RUN.nudge, h1 = Math.max(0, s.pw + n) / mx * H, h2 = Math.max(0, s.pw2 + n) / mx * H; // l'ajustement de puissance s'applique à toute la séance
    g.beginPath(); g.moveTo(x, H); g.lineTo(x, H - h1); g.lineTo(x + w - 1, H - h2); g.lineTo(x + w - 1, H); g.closePath();
    g.fillStyle = k === RUN.i ? runZC(s.z) : dim; g.fill(); if(k === RUN.i){ g.strokeStyle = ink; g.lineWidth = 2; g.stroke(); } x += w;
  });
  g.globalAlpha = 1;
  const cx = runProg() / RUN.total * c.width; g.fillStyle = ink; g.fillRect(cx - 1.5, 0, 3, H);
}
