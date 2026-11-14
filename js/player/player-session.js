/* FlameCadence - Player: FTP basis, steps, session list, loading and init wiring */
// ---------- Lancer une activité : lecteur de séance (étape 1 : maquette HUD + détection Bluetooth) ----------
// TODO : audio (Jamendo), export .fit natif, tableau de bord de fin de séance.
var RUN = null;
// FTP des cibles en % (choix sur la page de lancement) : « in » = FTP indoor, « out » = FTP extérieur, « cus » = valeur saisie ; repli sur la FTP indoor puis 250 W
function runFtpMode(){ const m = store.get("si_run_ftpm"); return m === "out" || m === "cus" ? m : "in"; }
function runFtp(){ const m = runFtpMode(); let f = 0; try{ f = m === "cus" ? +store.get("si_run_ftpc") : m === "out" ? +ftpFor("Ride") : +ftpFor("VirtualRide"); }catch(e){} if(!(f > 0)){ try{ f = +ftpFor("VirtualRide"); }catch(e){} } return f > 0 ? f : 250; }
function runFtpUI(){
  const s = $("runFtpSel"), c = $("runFtpC"); if(!s || !c) return;
  const m = runFtpMode(), lab = (k, f) => t(k) + (f ? ` (${f} W)` : "");
  s.innerHTML = `<option value="in">${esc(lab("sVirt", ftpFor("VirtualRide")))}</option><option value="out">${esc(lab("sRide", ftpFor("Ride")))}</option><option value="cus">${esc(t("runFtpCusL"))}</option>`;
  s.value = m; c.hidden = m !== "cus"; if(m === "cus") c.value = store.get("si_run_ftpc") || runFtp();
  const lock = !!(typeof RUN !== "undefined" && RUN && RUN.began); s.disabled = c.disabled = lock;
}
function runFtpApply(){ runFtpUI(); if(!RUN.began){ RUN.at = 0; runList(true); } try{ runUI(); }catch(e){} }
const runFmt = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
const runZC = z => ["#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444", "#a855f7", "#ec4899"][Math.min(7, Math.max(1, z)) - 1];
// description intervals.icu → étapes du lecteur (même analyseur que le reste de l'app : %, watts, zones, rampes, répétitions « 3x », durées et distances)
// le nom d'une étape = le texte de sa ligne SANS valeur de puissance (%, W, % LTHR) : ces valeurs (écrites à la création, par l'IA ou à la main, avec la FTP du moment) peuvent ne pas correspondre à la cible calculée par le lecteur
const runNoPw = s => s.replace(/\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?\s*(?:%\s*(?:lthr|ftp)?|w(?:atts?)?\b)/gi, "").replace(/\bramp\b/gi, "").replace(/\(\s*[~≈]?\s*\)/g, "").replace(/\s@(?=\s|$)/g, "").replace(/\s{2,}/g, " ").replace(/^[\s,;:@·–—-]+|[\s,;:@·–—-]+$/g, "").trim();
function runSteps(desc, ftp){
  const raw = parseWorkout(desc || "", "Ride", ftp); if(!raw.length) return [];
  const lines = desc.split("\n"), hdr = [], rx = /\d(?:[.,]\d+)?\s*%|\d(?:[.,]\d+)?\s*w\b|\bz[1-7]\b/i; let cur = "";
  lines.forEach((r, i) => { const l = r.trim(); if(!l){ cur = ""; return; } if(l.startsWith("-") || rx.test(l)){ hdr[i] = cur; return; } cur = l; });
  const tot = {}, seen = {}; raw.forEach(x => tot[x.line] = (tot[x.line] || 0) + 1);
  return raw.map(x => {
    const k = x.line, n = (seen[k] = (seen[k] || 0) + 1), txt = (lines[k] || "").replace(/^\s*-\s*/, "").trim(), cm = txt.match(/(\d+)(?:\s*-\s*(\d+))?\s*rpm/i);
    const h = (hdr[k] || "").replace(/\s*\d+\s*x\s*$/i, "").trim();
    return {name: [h, runNoPw(txt.replace(/\s*\d+(?:\s*-\s*\d+)?\s*rpm/i, ""))].filter(Boolean).join(" · ") + (tot[k] > 1 ? " (" + n + "/" + tot[k] + ")" : ""), d: Math.max(1, Math.round(x.d)), a: x.a, b: x.b, aw: x.aw, bw: x.bw, g: x.g != null ? x.g : null, m: x.g != null && x.m > 0 ? Math.round(x.m) : 0, cad: cm ? (cm[2] ? cm[1] + "-" + cm[2] : cm[1]) : ""};
  });
}
// séance de la bibliothèque → étapes du lecteur ; pour les cols, chaque étape porte sa pente (g, en %) et son libellé (km, pente)
function runStepsOf(item, ftp){
  const st = runSteps(item.desc_en, ftp), cl = item.climb;
  if(cl && cl.g.length === st.length) st.forEach((x, i) => { x.name = (lang === "fr" ? cl.nf : cl.ne)[i] || x.name; });
  return st;
}
function runMk(src, id, name, date, st){
  if(!st || !st.length) return null;
  const dur = st.reduce((a, x) => a + x.d, 0), ifx = Math.sqrt(st.reduce((a, x) => a + x.d * Math.pow((x.a + x.b) / 2, 2), 0) / dur) / 100;
  return {src, id, name: name || "—", date: date || "", st, dur, ifx, tss: Math.round(dur / 3600 * ifx * ifx * 100), z: zoneTimes(st)};
}
// ---- liste des séances exécutables : calendrier intervals.icu (7 j passés non réalisés → 60 j à venir), plan généré non envoyé, bibliothèque (vélo), préréglages
function runAssemble(){
  const R = RUN, ftp = runFtp(), out = [];
  out.push(...R.cal);
  PLAN.items.forEach((x, i) => { const e = runMk("plan", "plan:" + i + x.date, lang === "fr" ? x.w.name_fr : x.w.name_en, x.date, runSteps(planDesc(x.w), ftp)); if(e) out.push(e); });
  R.items = out; runRender();
}
async function runList(force){
  const R = RUN; if(R.busy) return; if(!force && R.at && Date.now() - R.at < 300000){ runAssemble(); return; }
  R.busy = true; R.err = ""; const ftp = runFtp(), today = iso(new Date()); R.ftpAt = ftp;
  if(KEY()){
    $("runLsMsg").textContent = t("runLoadL");
    try{
      const evs = await icu(`/events?oldest=${daysAgo(7)}&newest=${daysAgo(-60)}&category=WORKOUT`);
      R.cal = (evs || []).filter(e => !e.paired_activity_id && (!e.type || /ride|cycl|bike/i.test(e.type)))
        .sort((x, y) => (x.start_date_local || "").localeCompare(y.start_date_local || ""))
        .map(e => runMk("cal", "cal:" + e.id, e.name, (e.start_date_local || "").slice(0, 10), runSteps(e.description, ftp))).filter(Boolean);
    }catch(err){ R.err = t("errI", errText(err)); R.cal = []; }
  }else R.cal = [];
  R.at = Date.now(); R.busy = false; runAssemble();
  if(R.cur && !R.began && !R.el){ const nw = R.items.find(x => x.id === R.cur.id); if(nw){ R.cur = nw; runLoad(nw); runRender(); } } // séance déjà choisie : cibles recalculées avec la FTP du moment
  const td = R.cal.find(e => e.date === today) || R.cal.find(e => e.date > today); if(td && !R.touched && !R.el && !(R.cur && R.cur.id === td.id)) runPick(td, true); // séance du jour (sinon la prochaine) chargée d'office tant que rien n'a été lancé
}
// aperçu de la séance : une barre par étape (largeur = durée, hauteur = % FTP, rampes en trapèze), couleur = zone
function runMini(st, dur){
  const H = 30, W = 200, mx = Math.max(110, ...st.map(x => Math.max(x.a, x.b))); let x0 = 0, o = "";
  st.forEach(x => {
    const w = x.d / dur * W, ha = Math.max(1, x.a / mx * H), hb = Math.max(1, x.b / mx * H);
    o += `<polygon fill="${runZC(zoneOf((x.a + x.b) / 2))}" points="${x0.toFixed(2)},${H} ${x0.toFixed(2)},${(H - ha).toFixed(2)} ${(x0 + w).toFixed(2)},${(H - hb).toFixed(2)} ${(x0 + w).toFixed(2)},${H}"/>`; x0 += w;
  });
  return `<svg class="wmini" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${o}</svg>`;
}
// barres verticales : temps passé dans chaque zone (Z1 → Z7)
function runZV(z){
  const mx = Math.max(...z.slice(1)); if(!(mx > 0)) return "";
  return `<div class="wz" role="img" aria-label="${esc(t("runZoneTime"))}">${[1, 2, 3, 4, 5, 6, 7].map(k => `<div class="zc${z[k] > 0.5 ? "" : " e"}" title="${esc("Z" + k + " · " + fmtDur(z[k]))}"><span class="zbw"><i style="height:${(z[k] / mx * 100).toFixed(1)}%;background:${runZC(k)}"></i></span><b>Z${k}</b></div>`).join("")}</div>`;
}
function runRender(){
  const R = RUN, q = R.q.trim().toLowerCase(), all = R.items, today = iso(new Date());
  const chips = [["all", "runSrcAll", all.length]].concat(["cal", "plan"].map(k => [k, {cal: "runSrcCal", plan: "runSrcPlan"}[k], all.filter(e => e.src === k).length])).filter(c => c[0] === "all" || c[2]);
  if(chips.length < 3) R.f = "all"; // un seul type de séance : pas de filtre à afficher
  $("runChips").innerHTML = chips.length < 3 ? "" : chips.map(c => `<button type="button" class="alt small" data-s="${c[0]}" aria-pressed="${R.f === c[0]}">${esc(t(c[1]))} · ${c[2]}</button>`).join("");
  const rows = all.filter(e => (R.f === "all" || e.src === R.f) && (!q || e.name.toLowerCase().includes(q)));
  const dt = d => new Date(d + "T12:00:00").toLocaleDateString(loc(), {weekday: "short", day: "numeric", month: "short"});
  $("runRows").innerHTML = rows.map(e => {
    const bd = e.src === "cal" ? (e.date === today ? t("runToday") : e.date < today ? t("runMissed") : "") : e.src === "plan" ? t("runSrcPlan") : "";
    return `<div class="wr${R.cur && R.cur.id === e.id ? " sel" : ""}" data-k="${R.items.indexOf(e)}" role="button" tabindex="0"><div class="wm"><div class="wn">${esc(e.name)}</div><small>${e.date ? esc(dt(e.date)) + " · " : ""}${esc(fmtDur(e.dur))} · IF ${e.ifx.toFixed(2)} · TSS ${e.tss}${e.src === "plan" ? " · " + esc(t("runPlanNote")) : ""}</small><div class="wc">${runMini(e.st, e.dur)}${runZV(e.z)}</div></div>${bd ? `<span class="rbadge">${esc(bd)}</span>` : ""}</div>`;
  }).join("");
  $("runLsCnt").textContent = rows.length + " / " + all.length; $("runLsMsg").textContent = R.err || (rows.length ? "" : t(KEY() ? (all.length ? "runNoMatch" : "runNoPlanned") : "needI"));
}
function runPick(e, auto){
  if(!auto && RUN.el > 0 && RUN.el < RUN.total && !confirm(t("runConfirm"))) return;
  if(!auto) RUN.touched = true;
  RUN.cur = e; runLoad(e); $("runWkName").textContent = $("runFsName").textContent = e.name; if(!auto) $("runLs").open = false; runRender();
}
function runLoad(e){
  const ftp = runFtp();
  RUN.steps = e.st.map(x => ({name: x.name, dur: x.d, pw: x.aw != null ? Math.round(x.aw) : Math.round(ftp * x.a / 100), pw2: x.bw != null ? Math.round(x.bw) : Math.round(ftp * x.b / 100), cad: x.cad || "—", z: zoneOf((x.a + x.b) / 2), g: x.g != null ? x.g : null, m: x.g != null && x.m > 0 ? Math.round(x.m) : 0}));
  RUN.i = 0; RUN.left = RUN.steps[0].dur; RUN.mleft = RUN.steps[0].m; RUN.vs = 0; RUN.hasM = RUN.steps.some(x => x.m > 0); RUN.el = 0; RUN.nudge = 0; RUN.paused = true; RUN.rec = []; RUN.dist = 0; RUN.began = false; RUN.closing = false; runSaveClear(); $("runEnd").hidden = true; RUN.total = RUN.steps.reduce((a, x) => a + x.dur, 0); $("runPlay").disabled = false; $("runWkChart").innerHTML = runMini(e.st, e.dur); runUI(); try{ mapSync(true); }catch(err){}
}
function runProg(){ // avancement de la séance en « secondes équivalentes » : une étape à distance avance selon les mètres parcourus
  const R = RUN; if(!R || !R.steps.length) return 0; let p = 0; for(let k = 0; k < R.i; k++) p += R.steps[k].dur;
  const st = R.steps[R.i]; if(st) p += st.m > 0 ? st.dur * (1 - Math.max(0, R.mleft) / st.m) : st.dur - R.left;
  return Math.max(0, Math.min(R.total, p));
}
function runEnter(){ const st = RUN.steps[RUN.i]; RUN.left = st.dur; RUN.mleft = st.m > 0 ? st.m : 0; } // entrée dans une étape
const runTgt = (st, left) => Math.round(st.pw + (st.pw2 - st.pw) * (1 - left / st.dur)) + RUN.nudge; // rampes : la cible suit la progression dans l'étape
function runInit(){
  RUN = {steps: [], i: 0, left: 0, mleft: 0, vs: 0, hasM: false, el: 0, nudge: 0, total: 0, paused: true, tm: 0, ap: 0, hr: 120, cad: 0, live: {p: null, h: null, c: null}, dev: {}, items: [], cal: [], f: "all", q: "", cur: null, at: 0, touched: false, rec: [], dist: 0, cp: null, crk: null, cadSrc: "", cadAt: 0};
  document.querySelectorAll("[data-rn]").forEach(b => b.onclick = () => { RUN.nudge = +b.dataset.rn ? RUN.nudge + +b.dataset.rn : 0; runUI(); });
  $("runPlay").onclick = () => { if(RUN.closing){ runCloseNow(); return; } runBeepCtx(); if(runVoiceOn()){ try{ speechSynthesis.speak(new SpeechSynthesisUtterance("")); }catch(e){} } /* le premier son vocal doit être déclenché par un geste (iOS) */ RUN.began = true; RUN.paused = !RUN.paused; RUN.last = Date.now(); RUN.acc = 0; RUN.touched = true; runErgPause(RUN.paused); if(!RUN.paused && !$("runEnd").hidden){ $("runEnd").hidden = true; runLaunchUI(); } /* reprise après « Terminer » par erreur : la carte de fin (dont Abandonner) disparaît */ if(!RUN.paused){ runBeep(660, .1); runBeep(990, .1, .13); runBeep(1320, .22, .26); } /* départ / reprise : petit motif montant */ runUI(); };
  $("runFtpSel").onchange = () => { store.set("si_run_ftpm", $("runFtpSel").value); if($("runFtpSel").value === "cus" && !(+store.get("si_run_ftpc") > 0)) store.set("si_run_ftpc", String(runFtp())); runFtpApply(); };
  $("runFtpC").onchange = () => { const v = Math.round(+$("runFtpC").value); if(v >= 50 && v <= 600) store.set("si_run_ftpc", String(v)); runFtpApply(); };
  runFtpUI();
  $("runNext").onclick = () => runJump(RUN.i + 1); $("runPrev").onclick = () => runJump(RUN.i - 1);
  // le graphique du profil n'est plus cliquable : un toucher accidentel changeait d'étape ; on utilise les boutons Précédent / Suivant
  $("runQ").oninput = e => { RUN.q = e.target.value; runRender(); };
  $("runRef").onclick = () => runList(true);
  $("runChips").onclick = e => { const b = e.target.closest("[data-s]"); if(b){ RUN.f = b.dataset.s; runRender(); } };
  const pick = e => { const r = e.target.closest(".wr"); if(r) runPick(RUN.items[+r.dataset.k]); };
  $("runRows").onclick = pick; $("runRows").onkeydown = e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); pick(e); } };
  $("runFs").onclick = () => runFs(); $("runGo").onclick = runGo;
  $("runFin").onclick = runFinAsk; $("runUp").onclick = runUpload;
  $("finSave").onclick = () => { $("runFinDlg").close(); runFinish(); };
  $("finDis").onclick = () => { $("runFinDlg").close(); runDiscard(); };
  $("finBack").onclick = () => $("runFinDlg").close();
  $("runErg").onchange = e => { if(e.target.checked){ runCpSend([0x00]); RUN.sentW = null; if(!RUN.paused){ runCpSend([0x07]); runUI(); } }else runCpSend([0x01]); runErgBadge(); };
  document.addEventListener("fullscreenchange", () => {
    if(!RUN || !RUN.fsApi || document.fullscreenElement) return;
    RUN.fsApi = false;
    // changement d'application : le navigateur quitte le plein écran natif, mais le lecteur reste affiché en recouvrement ; le plein écran natif revient au prochain toucher
    if(RUN.began && $("runEnd").hidden){ runWant(true); runFit(); setTimeout(runFit, 150); setTimeout(runFit, 600); }
    else runFs(false);
  }); // Échap natif
  document.querySelector('[data-block="run"]').addEventListener("pointerdown", () => {
    if(RUN.began && $("runEnd").hidden) runKeepAlive(true); // un toucher relance aussi le maintien en vie après une reprise
  });
  document.querySelector('[data-block="run"]').addEventListener("click", () => { // le plein écran natif ne revient qu'après un vrai toucher (clic), pas au début d'un balayage depuis le bord : sinon il masquait aussitôt les barres système que l'on venait de faire apparaître
    const el = document.querySelector('[data-block="run"]');
    if(RUN.wantFs && !runPwaFs() && el.classList.contains("rfs") && !document.fullscreenElement && el.requestFullscreen){ runWant(false); el.requestFullscreen().then(() => { RUN.fsApi = true; runFit(); }).catch(() => {}); }
  });
  document.addEventListener("keydown", e => { if(e.key === "Escape" && RUN && !RUN.fsApi) runFs(false); }); // Échap en mode recouvrement
  $("runPairT").onclick = () => runPair("trainer"); $("runPairH").onclick = () => runPair("hr");
    $("runDevs").onclick = e => { const b = e.target.closest("[data-dc]"); if(b){ runUnpair(b.dataset.dc); return; } const q = e.target.closest("[data-ds]"); if(q){ AUTO.stop[q.dataset.ds] = true; runBtUI(); } }; // un bouton « Déconnecter » par appareil
  window.addEventListener("pagehide", () => runSave(true)); window.addEventListener("resize", () => RUN && mode === "run" && (runFit(), runDraw())); window.addEventListener("orientationchange", () => [150, 500].forEach(d => setTimeout(() => RUN && mode === "run" && (runFit(), runDraw()), d))); if(window.visualViewport) visualViewport.addEventListener("resize", () => RUN && mode === "run" && runFit()); // rotation du téléphone
  runAssemble(); $("runWkName").textContent = "—"; $("runPlay").textContent = "▶ " + t("runStart"); $("runPlay").disabled = true; runBtUI(); runRestore(); musBind();
}
