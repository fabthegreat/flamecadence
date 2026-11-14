/* FlameCadence - App modes (AI/Edit/Lib) + planning shift, periods, contact form, AI coach chat, session analysis (kept together on purpose, see README) */
// ---------- Bascule des modes (AI / Edit / Lib) ----------
let mode = store.get("si_mode") || "lib"; // première visite : la bibliothèque fonctionne sans aucune clé
if(mode === "ses") mode = "calp"; // l'analyse d'une séance s'ouvre maintenant sous le calendrier (plus d'onglet dédié)
let sesUnder = false; // analyse de séance affichée sous le calendrier (après un clic sur une séance réalisée)
const GRP = {gen: ["lib", "edit", "ai", "imp", "act", "plan", "shift"], ana: ["per", "cmp", "exp", "chat"], cal: ["calp"], run: ["run"]}, curGrp = () => GRP.ana.includes(mode) ? "ana" : GRP.cal.includes(mode) ? "cal" : GRP.run.includes(mode) ? "run" : "gen";
const betaRunOn = () => store.get("si_beta_run") === "1";
// téléphone : le lecteur est prioritaire à l'ouverture — seuls le logo et le lecteur sont affichés, un bouton ramène au menu complet (pour la durée de la session)
const pmCan = () => matchMedia("(max-width:560px)").matches && betaRunOn();
const pmFull = () => { try{ return sessionStorage.getItem("si_fullmenu") === "1"; }catch(_){ return false; } };
const pmOn = () => pmCan() && !pmFull();
function pmApply(){ document.documentElement.classList.toggle("pm-only", pmOn()); const b = $("pmBack"); if(b) b.hidden = !(pmCan() && pmFull()); }
if(pmOn()) mode = "run";
if(mode === "run" && !betaRunOn()) mode = store.get("si_g_gen") || "ai"; // option désactivée : on ne reste pas sur un onglet masqué
function applyBeta(){ // menu « Lancer une activité » (bêta) : masqué par défaut
  try{ pmApply(); }catch(_){}
  const on = betaRunOn(), b = document.querySelector('#grp [data-g="run"]'); b.hidden = !on; b.style.display = on ? "" : "none";
  $("kaCfg").hidden = !on; // maintien en vie du lecteur : seulement si le lecteur est coché
  const pt = document.querySelector('.cfg-tabs [data-cfg="player"]'); pt.hidden = !on; pt.style.display = on ? "" : "none"; // réglages du lecteur proposés seulement si l'option bêta est cochée
  if(!on && pt.getAttribute("aria-selected") === "true") cfgTab("beta");
  if(!on && mode === "run"){ mode = store.get("si_g_gen") || "ai"; store.set("si_mode", mode); applyMode(); }
}
$("betaRun").checked = betaRunOn(); $("runKa").value = runKaMode(); $("runKa").onchange = e => { store.set("si_runka", e.target.value); if(typeof RUN !== "undefined" && RUN) { RUN.mk = ""; runKeepAlive(!!RUN.began && $("runEnd").hidden && !!RUN.tm); } }; $("betaRun").onchange = e => { store.set("si_beta_run", e.target.checked ? "1" : "0"); if(e.target.checked){ try{ sessionStorage.setItem("si_fullmenu", "1"); }catch(_){} } /* on règle les options : le menu complet reste affiché pour cette session */ applyBeta(); renderLibraryKeepOpen(); prevPlayBtn(); };
{ const rk = $("riderKg"); rk.value = store.get("si_rider_kg"); rk.placeholder = String(riderKg()); rk.onfocus = () => { rk.placeholder = String(riderKg()); };
  rk.onchange = () => { const v = parseFloat(String(rk.value).replace(",", ".")); store.set("si_rider_kg", v >= 30 && v <= 200 ? String(v) : ""); if(!(v >= 30 && v <= 200)) rk.value = ""; rk.placeholder = String(riderKg()); try{ renderChart(); }catch(e){} }; }
$("pm_map").checked = store.get("si_rm_map") !== "0"; $("pm_map").onchange = e => { store.set("si_rm_map", e.target.checked ? "1" : "0"); MAP.key = ""; };
$("pm_mus").checked = musShown(); $("pm_mus").onchange = e => { store.set("si_rm_mus", e.target.checked ? "1" : "0"); if(!e.target.checked) musStop(); musUI(); }; // masquer la musique l'arrête
{ const ld = $("pm_lead"); ld.value = runLead() || ""; ld.onchange = () => { const v = Math.max(0, Math.min(10, Math.round(parseFloat(String(ld.value).replace(",", ".")) * 2) / 2)); store.set("si_rm_lead", v > 0 ? String(v) : ""); ld.value = v > 0 ? v : ""; if(v > 0) runBeep(880, .12); }; }
$("pm_ap").value = String(runAutoPause()); $("pm_ap").onchange = e => store.set("si_rm_ap", e.target.value);
$("pm_voice").checked = runVoiceOn(); $("pm_voice").onchange = e => { store.set("si_rm_voice", e.target.checked ? "1" : "0"); if(e.target.checked) runSpeak(t("vTest")); };
$("pm_forget").onclick = () => { ["trainer", "hr"].forEach(k => store.set("si_dev_" + k, "")); say("pmForgot", "ok"); };
$("pm_beep").checked = runBeepOn(); $("pm_beep").onchange = e => { store.set("si_rm_beep", e.target.checked ? "1" : "0"); if(e.target.checked) runBeep(880, .12); }; // coché : un bip d'essai
["avg", "avgS", "kj", "dec", "dist"].forEach(k => { const el = $("pm_" + k); el.checked = store.get("si_rm_" + k) === "1"; el.onchange = () => { store.set("si_rm_" + k, el.checked ? "1" : "0"); runMxUI(); }; });
applyBeta();
$("fullMenu").onclick = () => { try{ sessionStorage.setItem("si_fullmenu", "1"); }catch(_){} pmApply(); scrollTo(0, 0); };
$("pmBack").onclick = () => { try{ sessionStorage.removeItem("si_fullmenu"); }catch(_){} const mo = $("more"); if(mo) mo.open = false; mode = "run"; store.set("si_mode", mode); applyMode(); pmApply(); scrollTo(0, 0); };
matchMedia("(max-width:560px)").addEventListener("change", () => pmApply());
pmApply();
document.querySelectorAll("#grp button").forEach(b => b.onclick = () => { const l = store.get("si_g_" + b.dataset.g); mode = GRP[b.dataset.g].includes(l) ? l : GRP[b.dataset.g][b.dataset.g === "gen" ? 2 : 0]; store.set("si_mode", mode); applyMode(); });
// ---------- Décaler les séances planifiées : toutes les séances du calendrier intervals.icu à partir d'une date, de N jours / semaines ----------
const SHIFT = {evs: [], tok: 0, busy: false, lbl: "", sig: ""};
function shiftDelta(){ const n = Math.max(1, Math.min(365, parseInt($("shAmt").value, 10) || 1)); return n * parseInt($("shUnit").value, 10) * parseInt($("shDir").value, 10); }
function shiftTo(e, delta){ const o = e.start_date_local || "", d = new Date(o.slice(0, 10) + "T12:00:00"); d.setDate(d.getDate() + delta); return iso(d) + (o.length > 10 ? o.slice(10) : "T00:00:00"); }
function shiftRender(){
  const box = $("shList"), go = $("shGo"), delta = shiftDelta(), E = SHIFT.evs, today = iso(new Date());
  const dl = x => new Date(x.slice(0, 10) + "T12:00:00").toLocaleDateString(loc(), {weekday: "short", day: "numeric", month: "short"});
  const word = t(delta > 0 ? "shiftLater" : "shiftEarlier").toLowerCase(), n = Math.abs(delta / (parseInt($("shUnit").value, 10))), unit = t(parseInt($("shUnit").value, 10) === 7 ? "shiftWeeks" : "shiftDays");
  const lbl = SHIFT.lbl = `${n} ${unit} ${word}`;
  $("shWarn").hidden = !E.some(e => shiftTo(e, delta).slice(0, 10) < today); $("shWarn").textContent = t("shiftPast");
  if(!E.length){ box.innerHTML = `<div class="hint">${esc(t("shiftNone"))}</div>`; go.disabled = true; go.textContent = t("shiftGo", 0, lbl); return; }
  const SHOW = 40;
  box.innerHTML = `<div class="hint">${esc(t("shiftCount", E.length))}</div>` + E.slice(0, SHOW).map(e => `<div class="act-row" style="cursor:default"><b>${esc(e.name || "")}</b><div class="hint">${esc(dl(e.start_date_local))} → ${esc(dl(shiftTo(e, delta)))}</div></div>`).join("") + (E.length > SHOW ? `<div class="hint">${esc(t("shiftMore", E.length - SHOW))}</div>` : "");
  go.disabled = SHIFT.busy; go.textContent = t("shiftGo", E.length, lbl);
}
const shiftSig = l => JSON.stringify(l.map(e => [e.id, e.start_date_local]));
async function shiftFetch(from){ // toujours les données actuelles du calendrier (jamais le cache du navigateur ni une liste ancienne : la séance a pu être déplacée entre-temps, par ex. avec le widget Calendrier)
  const end = new Date(from + "T12:00:00"); end.setDate(end.getDate() + 730);
  const evs = await icuFetch(icuUrl(`/events?oldest=${from}&newest=${iso(end)}&category=WORKOUT`), {cache: "no-store"});
  return (Array.isArray(evs) ? evs : []).filter(e => e && e.id != null && !e.paired_activity_id && (e.start_date_local || "").slice(0, 10) >= from).sort((x, y) => (x.start_date_local || "").localeCompare(y.start_date_local || ""));
}
async function shiftPreview(){
  if(!$("shDate").value) $("shDate").value = iso(new Date());
  if(!KEY()){ $("shList").innerHTML = `<div class="hint">${esc(t("needI"))}</div>`; $("shGo").disabled = true; $("shGo").textContent = t("shiftGo", 0, ""); return; }
  const from = $("shDate").value, tok = ++SHIFT.tok, end = new Date(from + "T12:00:00"); end.setDate(end.getDate() + 730);
  $("shList").innerHTML = `<div class="hint">${esc(t("shiftLoad"))}</div>`; $("shGo").disabled = true;
  try{
    const list = await shiftFetch(from);
    if(tok !== SHIFT.tok) return;
    SHIFT.evs = list; SHIFT.sig = shiftSig(list);
    shiftRender();
  }catch(err){ if(tok === SHIFT.tok){ $("shList").innerHTML = `<div class="hint" style="color:var(--err)">${esc(t("errI", errText(err)))}</div>`; } }
}
["shDate", "shAmt", "shUnit", "shDir"].forEach(id => $(id).addEventListener(id === "shDate" ? "change" : "input", () => id === "shDate" ? shiftPreview() : shiftRender()));
$("shGo").onclick = async () => {
  if(!SHIFT.evs.length || SHIFT.busy) return;
  SHIFT.busy = true; $("shGo").disabled = true;
  let E; // relecture juste avant d'appliquer : si le calendrier a changé depuis l'aperçu, on n'applique pas une liste périmée
  try{ E = await shiftFetch($("shDate").value); }catch(err){ SHIFT.busy = false; shiftRender(); say("errI", "err", errText(err)); return; }
  if(shiftSig(E) !== SHIFT.sig){ SHIFT.busy = false; SHIFT.evs = E; SHIFT.sig = shiftSig(E); shiftRender(); say("shiftStale", "err"); return; }
  const delta = shiftDelta();
  if(!confirm(t("shiftAsk", E.length, SHIFT.lbl))){ SHIFT.busy = false; shiftRender(); return; }
  let ok = 0, bad = 0, lastErr = "";
  for(const e of E){
    $("shGo").textContent = t("shiftBusy", ok + bad + 1, E.length);
    try{ await icuFetch(icuUrl("/events/" + e.id), {method: "PUT", headers: {...icuAuth(), "Content-Type": "application/json"}, body: JSON.stringify({...e, start_date_local: shiftTo(e, delta)})}); ok++; }
    catch(err){ bad++; lastErr = errText(err); }
  }
  SHIFT.busy = false;
  if(bad) say("shiftPart", "err", ok, bad, lastErr); else say("shiftDone", "ok", ok);
  try{ loadCal(true).catch(() => {}); }catch(e){}
  shiftPreview();
};
// sous-onglets de l'outil : décalage groupé / calendrier agrandi (le même que celui du widget Calendrier, même si ce widget est masqué ou dans un autre onglet latéral)
function openCalMax(){
  if(!KEY()){ say("needI", "err"); return; }
  const sec = document.querySelector('[data-block="cal"]');
  CAL.forced = sec.hidden || sec.classList.contains("wtabhid");
  sec.hidden = false; sec.classList.remove("wtabhid");
  setCalMax(true); loadCal().catch(() => {});
}
function setShTool(k){
  $("shTabs").querySelectorAll("[data-sh]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.sh === k)));
  $("shBulk").hidden = k !== "bulk"; $("shCalPane").hidden = k !== "cal";
  if(k === "bulk") shiftPreview(); else openCalMax();
}
$("shTabs").querySelectorAll("[data-sh]").forEach(b => b.onclick = () => setShTool(b.dataset.sh));
$("shCalOpen").onclick = openCalMax;
// ---------- Périodes : bilan de l'entraînement par semaine ou par mois (activités réalisées + séances encore prévues au calendrier) ----------
const PER = {unit: store.get("si_per_u") === "m" ? "m" : "w", n: 0, tok: 0};
function perPeriods(unit, n){
  const out = [], now = new Date(); now.setHours(12, 0, 0, 0);
  for(let i = n - 1; i >= 0; i--){
    let a, b;
    if(unit === "w"){ a = new Date(now); a.setDate(a.getDate() - ((a.getDay() + 6) % 7) - i * 7); b = new Date(a); b.setDate(b.getDate() + 6); }
    else { a = new Date(now.getFullYear(), now.getMonth() - i, 1, 12); b = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 12); }
    const A = iso(a), B = iso(b), cur = A <= iso(now) && iso(now) <= B;
    out.push({a: A, b: B, cur, label: unit === "w" ? a.toLocaleDateString(loc(), {day: "numeric", month: "short"}) : a.toLocaleDateString(loc(), {month: "short", year: "2-digit"}), n: 0, sec: 0, dist: 0, load: 0, plan: 0, planN: 0});
  }
  return out;
}
function perFillN(){
  const opts = PER.unit === "w" ? [8, 12, 26, 52] : [6, 12, 24], sel = $("perN"), keep = parseInt(store.get("si_per_n_" + PER.unit), 10);
  PER.n = opts.includes(keep) ? keep : (PER.unit === "w" ? 12 : 12);
  sel.innerHTML = opts.map(v => `<option value="${v}">${v} ${esc(t(PER.unit === "w" ? "perWeeks" : "perMonths").toLowerCase())}</option>`).join(""); sel.value = String(PER.n);
  document.querySelectorAll('[data-block="per"] [data-pu]').forEach(b => b.setAttribute("aria-pressed", String(b.dataset.pu === PER.unit)));
}
async function perLoad(){
  const box = $("perBox"); perFillN();
  if(!KEY()){ box.innerHTML = `<div class="hint">${esc(t("needI"))}</div>`; return; }
  const tok = ++PER.tok, P = perPeriods(PER.unit, PER.n), today = iso(new Date()), oldest = P[0].a, newest = P[P.length - 1].b;
  box.innerHTML = `<div class="hint">${esc(t("perLoading"))}</div>`;
  try{
    const [acts, evs] = await Promise.all([icu(`/activities?oldest=${oldest}&newest=${newest}`), icu(`/events?oldest=${today}&newest=${newest}&category=WORKOUT`).catch(() => [])]);
    if(tok !== PER.tok) return;
    const at = d => P.find(q => d >= q.a && d <= q.b);
    (Array.isArray(acts) ? acts : []).forEach(a => { const q = at((a.start_date_local || "").slice(0, 10)); if(!q) return; q.n++; q.sec += a.moving_time || 0; q.dist += a.distance || 0; q.load += a.icu_training_load || 0; });
    (Array.isArray(evs) ? evs : []).forEach(e => { if(e.paired_activity_id) return; const q = at((e.start_date_local || "").slice(0, 10)); if(!q) return; q.planN++; q.plan += e.icu_training_load || 0; });
    perRender(P);
  }catch(err){ if(tok === PER.tok) box.innerHTML = `<div class="hint" style="color:var(--err)">${esc(t("errI", errText(err)))}</div>`; }
}
function perRender(P){
  const box = $("perBox"), f = Math.round;
  if(!P.some(q => q.n || q.planN)){ box.innerHTML = `<div class="hint">${esc(t("perNone"))}</div>`; return; }
  const W = 600, H = 150, pad = 22, mx = Math.max(10, ...P.map(q => q.load + q.plan)), bw = (W - 10) / P.length, gap = Math.min(8, bw * .25);
  const lk = Math.max(1, Math.ceil((Math.max(...P.map(q => String(q.label).length)) * 5.6 + 8) / bw)); // une étiquette sur lk : assez d'espace pour que « Dec 24 » ne chevauche pas la suivante (la dernière période reste toujours étiquetée)
  const bars = P.map((q, i) => {
    const x = 5 + i * bw + gap / 2, w = bw - gap, hd = (H - pad) * q.load / mx, hp = (H - pad) * q.plan / mx;
    return `<rect x="${x.toFixed(1)}" y="${(H - hd).toFixed(1)}" width="${w.toFixed(1)}" height="${hd.toFixed(1)}" fill="var(--acc)"/>` +
      (q.plan ? `<rect x="${x.toFixed(1)}" y="${(H - hd - hp).toFixed(1)}" width="${w.toFixed(1)}" height="${hp.toFixed(1)}" fill="var(--acc)" opacity=".35"/>` : "") +
      ((P.length - 1 - i) % lk === 0 ? `<text x="${(x + w / 2).toFixed(1)}" y="${H + 14}" text-anchor="middle" font-size="10" fill="var(--mute)">${esc(q.label)}</text>` : "");
  }).join("");
  const tot = P.reduce((a, q) => ({n: a.n + q.n, sec: a.sec + q.sec, dist: a.dist + q.dist, load: a.load + q.load, plan: a.plan + q.plan}), {n: 0, sec: 0, dist: 0, load: 0, plan: 0});
  const row = q => `<tr${q.cur ? ' class="cur"' : ""}><td>${esc(q.label)}${q.cur ? " (" + esc(t("perNow")) + ")" : ""}</td><td>${q.n}</td><td>${q.sec ? hm(q.sec) : "\u2014"}</td><td>${q.dist ? (q.dist / 1000).toFixed(0) + " km" : "\u2014"}</td><td>${q.load ? f(q.load) : "\u2014"}</td><td>${q.plan ? f(q.plan) + " (" + q.planN + ")" : ""}</td></tr>`;
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H + 20}" style="width:100%;height:auto" role="img">${bars}</svg>` +
    `<div class="perleg"><span><i style="background:var(--acc)"></i>${esc(t("perLegDone"))}</span><span><i style="background:var(--acc);opacity:.35"></i>${esc(t("perLegPlan"))}</span></div>` +
    `<div style="overflow-x:auto"><table class="pertbl"><thead><tr><th>${esc(t("perCol"))}</th><th>${esc(t("perSess"))}</th><th>${esc(t("perTime"))}</th><th>${esc(t("perDist"))}</th><th>${esc(t("perLoadC"))}</th><th>${esc(t("perPlan"))}</th></tr></thead><tbody>${P.slice().reverse().map(row).join("")}</tbody>` +
    `<tfoot><tr><td>${esc(t("perTotal"))}</td><td>${tot.n}</td><td>${hm(tot.sec)}</td><td>${(tot.dist / 1000).toFixed(0)} km</td><td>${f(tot.load)}</td><td>${tot.plan ? f(tot.plan) : ""}</td></tr></tfoot></table></div>`;
}
document.querySelectorAll('[data-block="per"] [data-pu]').forEach(b => b.onclick = () => { PER.unit = b.dataset.pu; store.set("si_per_u", PER.unit); perLoad(); });
$("perN").onchange = e => { store.set("si_per_n_" + PER.unit, e.target.value); perLoad(); };
$("perRef").onclick = perLoad;
// ---------- Contact (Web3Forms) ----------
const WEB3FORMS_KEY = "0e7a22a5-8bd9-41af-9f2f-e7a7454f0f55"; // clé d'accès Web3Forms (web3forms.com) : conçue pour être publique côté navigateur ; les messages arrivent à l'adresse associée à la clé
// l'entrée « Me contacter » du menu « … » ouvre ce formulaire
$("mail").addEventListener("click", e => { e.preventDefault(); $("ctOut").textContent = ""; $("contactDlg").showModal(); }); // plus de lien mailto : le bouton ouvre seulement le formulaire
$("mail").addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); $("mail").click(); } });
$("ctClose").onclick = () => $("contactDlg").close();
$("ctSend").onclick = async () => {
  const name = $("ctName").value.trim(), email = $("ctEmail").value.trim(), msg = $("ctMsg").value.trim(), out = $("ctOut"), b = $("ctSend");
  if(!msg || !/^\S+@\S+\.\S+$/.test(email)){ out.textContent = t("ctNeed"); return; }
  if(!WEB3FORMS_KEY){ out.textContent = t("ctNoKey"); return; }
  b.disabled = true; out.textContent = t("ctSending");
  try{
    const r = await fetch("https://api.web3forms.com/submit", {method: "POST", headers: {"Content-Type": "application/json", Accept: "application/json"},
      body: JSON.stringify({access_key: WEB3FORMS_KEY, subject: "FlameCadence : message de " + (name || email), from_name: name || "FlameCadence", name, email, botcheck: $("ctBot").checked, message: msg + "\n\n--\nFlameCadence v" + APP_VERSION + " (" + lang + ")"})});
    const j = await r.json().catch(() => ({}));
    if(!r.ok || j.success === false) throw new Error(j.message || "HTTP " + r.status);
    out.textContent = t("ctOk"); $("ctMsg").value = "";
  }catch(err){ out.textContent = t("ctErr", err.name === "TypeError" ? t("cors") : err.message); }
  b.disabled = false;
};
// ---------- Coach IA : conversation complète conservée dans une base IndexedDB du navigateur (repli : stockage local) ----------
const CHAT = {msgs: [], db: null, loaded: false, busy: false, ctx: "", ctxAt: 0};
function chatOpenDb(){ return new Promise(res => { try{ if(!window.indexedDB){ res(null); return; } const r = indexedDB.open("flamecadence", 1); r.onupgradeneeded = () => { r.result.createObjectStore("chat", {keyPath: "id", autoIncrement: true}); }; r.onsuccess = () => res(r.result); r.onerror = () => res(null); }catch(e){ res(null); } }); }
function chatFit(){ // la conversation occupe tout l'espace jusqu'au bas de l'écran, zone de saisie comprise
  const log = $("chatLog"), sec = log && log.closest("section"); if(!log || !sec || sec.hidden) return;
  log.style.maxHeight = "none";
  const r = log.getBoundingClientRect(), below = sec.getBoundingClientRect().bottom - r.bottom;
  log.style.height = Math.max(240, Math.round(window.innerHeight - (r.top + window.scrollY) - below - 24)) + "px";
}
window.addEventListener("resize", () => { if(mode === "chat") chatFit(); });
async function chatInit(){
  if(!CHAT.loaded){
    CHAT.loaded = true; CHAT.db = await chatOpenDb();
    if(CHAT.db) CHAT.msgs = await new Promise(res => { const q = CHAT.db.transaction("chat").objectStore("chat").getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); });
    else{ try{ CHAT.msgs = JSON.parse(store.get("si_chat") || "[]") || []; }catch(e){ CHAT.msgs = []; } }
  }
  chatRender();
}
function chatAdd(m){
  CHAT.msgs.push(m);
  if(CHAT.db){ const rq = CHAT.db.transaction("chat", "readwrite").objectStore("chat").add(m); rq.onsuccess = () => { m.id = rq.result; }; }
  else store.set("si_chat", JSON.stringify(CHAT.msgs.slice(-300)));
}
const chatFmt = x => esc(x).replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
function chatRender(extra){
  const log = $("chatLog");
  log.innerHTML = CHAT.msgs.length ? CHAT.msgs.map(m => `<div class="cm ${m.role === "user" ? "u" : "a"}">${m.role === "user" ? esc(m.text) : chatFmt(m.text)}</div>`).join("") : `<div class="hint">${esc(t("chatEmpty"))}</div>`;
  if(extra) log.insertAdjacentHTML("beforeend", extra);
  log.scrollTop = log.scrollHeight;
}
// Contexte d'entraînement résumé pour le coach (8 semaines, 14 derniers jours, 3 semaines à venir, forme) ; mis en cache 10 minutes
async function chatContext(){
  if(CHAT.ctx && Date.now() - CHAT.ctxAt < 600000) return CHAT.ctx;
  const f = Math.round, today = iso(new Date()), fut = new Date(); fut.setDate(fut.getDate() + 21);
  const [acts, evs, well] = await Promise.all([icu(`/activities?oldest=${daysAgo(56)}&newest=${today}`).catch(() => []), icu(`/events?oldest=${today}&newest=${iso(fut)}&category=WORKOUT`).catch(() => []), icu(`/wellness?oldest=${daysAgo(42)}&newest=${today}`).catch(() => [])]);
  const A = (Array.isArray(acts) ? acts : []).filter(x => x.moving_time > 0), out = [`Today is ${today}.`];
  const prof = [ICU.ftpIn ? `FTP indoor ${ICU.ftpIn} W` : "", ICU.ftpOut ? `FTP outdoor ${ICU.ftpOut} W` : "", ICU.weight ? `weight ${ICU.weight} kg` : "", ICU.maxHr ? `max HR ${ICU.maxHr}` : "", ICU.lthr ? `LTHR ${ICU.lthr}` : ""].filter(Boolean);
  if(prof.length) out.push("Athlete: " + prof.join(", "));
  const W = (Array.isArray(well) ? well : []).filter(w => w.ctl != null).sort((x, y) => x.id < y.id ? -1 : 1);
  if(W.length){ const l = W[W.length - 1], o = W[0]; out.push(`Fitness on ${l.id}: CTL ${f(l.ctl)}, ATL ${f(l.atl || 0)}, form ${f(l.ctl - (l.atl || 0))}` + (o !== l ? ` (CTL was ${f(o.ctl)} on ${o.id})` : "")); }
  const wk = {}; A.forEach(a => { const d = new Date((a.start_date_local || "").slice(0, 10) + "T12:00:00"); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); const k = iso(d); const q = wk[k] = wk[k] || {n: 0, sec: 0, load: 0}; q.n++; q.sec += a.moving_time || 0; q.load += a.icu_training_load || 0; });
  const wks = Object.keys(wk).sort(); if(wks.length) out.push("Weekly totals (week starting Monday): " + wks.map(k => `${k}: ${wk[k].n} sessions, ${hm(wk[k].sec)}, load ${f(wk[k].load)}`).join(" | "));
  const line = x => `${(x.start_date_local || "").slice(0, 10)} ${x.type || ""} "${x.name || ""}" ${hm(x.moving_time || 0)}` + (x.icu_training_load ? `, load ${f(x.icu_training_load)}` : "") + (x.icu_weighted_avg_watts ? `, NP ${f(x.icu_weighted_avg_watts)} W` : "") + (x.average_heartrate ? `, avg HR ${f(x.average_heartrate)}` : "");
  const rec = A.filter(x => (x.start_date_local || "").slice(0, 10) >= daysAgo(14)).sort((x, y) => (x.start_date_local || "") < (y.start_date_local || "") ? -1 : 1);
  if(rec.length) out.push("Sessions of the last 14 days:\n" + rec.map(line).join("\n"));
  const pl = (Array.isArray(evs) ? evs : []).filter(e => !e.paired_activity_id).sort((x, y) => (x.start_date_local || "") < (y.start_date_local || "") ? -1 : 1).slice(0, 20);
  out.push(pl.length ? "Planned workouts (next 3 weeks):\n" + pl.map(e => `${(e.start_date_local || "").slice(0, 10)} "${e.name || ""}"` + (e.moving_time ? " " + hm(e.moving_time) : "") + (e.icu_training_load ? `, planned load ${f(e.icu_training_load)}` : "")).join("\n") : "No workout planned in the next 3 weeks.");
  CHAT.ctx = out.join("\n"); CHAT.ctxAt = Date.now(); return CHAT.ctx;
}
async function chatSend(){
  const inp = $("chatIn"), txt = inp.value.trim(); if(!txt || CHAT.busy) return;
  CHAT.busy = true; $("chatSend").disabled = true; inp.value = "";
  chatAdd({role: "user", text: txt, at: Date.now()}); chatRender(`<div class="cm a" style="opacity:.7">${esc(t("chatThink"))}</div>`);
  try{
    const ctx = KEY() ? await chatContext() : "(intervals.icu is not connected: no training data available)";
    const hist = CHAT.msgs.slice(-25, -1).map(m => `${m.role === "user" ? "Athlete" : "Coach"}: ${String(m.text).slice(0, 1500)}`).join("\n");
    const sys = `You are an experienced endurance cycling coach chatting with an athlete about their training: the past (what the data shows), the present (current form, fatigue) and the future (what to do next, planned workouts). Reply in ${lang === "fr" ? "French" : "English"}. Base every factual statement on the training data given; if something is not in the data, say so instead of guessing. Never invent sessions or numbers. Be concise, practical and specific; when proposing a workout give durations and intensities (% FTP or watts) and explain why. Plain text, short paragraphs, **bold** allowed, no tables.`;
    const reply = aiAnswer(await aiComplete(sys, `TRAINING DATA (from intervals.icu)\n${ctx}\n\nCONVERSATION SO FAR\n${hist || "(none)"}\n\nAthlete: ${txt}\n\nCoach:`));
    chatAdd({role: "assistant", text: reply || "…", at: Date.now()}); chatRender();
  }catch(err){ chatRender(`<div class="cm e">${esc(errText(err))}</div>`); }
  CHAT.busy = false; $("chatSend").disabled = false; inp.focus();
}
$("chatSend").onclick = chatSend;
$("chatIn").addEventListener("keydown", e => { if(e.key === "Enter" && !e.shiftKey && !e.isComposing){ e.preventDefault(); chatSend(); } });
$("chatClr").onclick = async () => {
  if(!CHAT.msgs.length || !confirm(t("chatSure"))) return;
  CHAT.msgs = []; if(CHAT.db){ CHAT.db.transaction("chat", "readwrite").objectStore("chat").clear(); } else store.set("si_chat", ""); chatRender();
};
$("chatExp").onclick = () => {
  const blob = new Blob([JSON.stringify(CHAT.msgs.map(m => ({role: m.role, text: m.text, at: new Date(m.at).toISOString()})), null, 2)], {type: "application/json"}), a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "flamecadence-coach-" + iso(new Date()) + ".json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
function applyMode(){
  if(mode !== "plan" && typeof PLAN !== "undefined" && PLAN.edit){ planEdEnd(); } // quitter le plan met fin à la modification d'une de ses séances
  if(mode !== "edit" && CALEDIT){ CALEDIT = null; calEdUI(); } // quitter l'éditeur manuel met fin à la modification d'une séance du calendrier
  document.querySelector('[data-block="req"]').hidden = mode !== "ai";
  document.querySelector('[data-block="edit"]').hidden = mode !== "edit";
  document.querySelector('[data-block="lib"]').hidden = mode !== "lib";
  if(mode === "lib" && (LIBF !== curFtp() || LIBFK !== ($("libform").checked ? feelEff() : ""))) renderLibrary();
  document.querySelector('[data-block="imp"]').hidden = mode !== "imp"; if(mode === "imp") impHistRender();
  document.querySelector('[data-block="act"]').hidden = mode !== "act";
  document.querySelector('[data-block="cmp"]').hidden = mode !== "cmp";
  document.querySelector('[data-block="exp"]').hidden = mode !== "exp";
  document.querySelector('[data-block="chat"]').hidden = mode !== "chat"; if(mode === "chat"){ chatInit(); requestAnimationFrame(chatFit); }
  document.querySelector('[data-block="per"]').hidden = mode !== "per"; if(mode === "per") perLoad();
  document.querySelector('[data-block="calp"]').hidden = mode !== "calp"; // le rendu (et l'ajustement à la fenêtre) se fait en fin de fonction, une fois les autres blocs masqués
  if(mode !== "calp") sesUnder = false; { const sv = mode === "calp" && sesUnder; document.querySelector('[data-block="ses"]').hidden = !sv; if(sv) sesInit(); } // l'analyse n'apparaît que sous le calendrier, une fois une séance réalisée cliquée
  document.querySelector('[data-block="plan"]').hidden = mode !== "plan";
  document.querySelector('[data-block="shift"]').hidden = mode !== "shift"; if(mode === "shift"){ if($("shTabs").querySelector('[data-sh="bulk"]').getAttribute("aria-selected") === "true") shiftPreview(); }
  document.querySelector('[data-block="run"]').hidden = mode !== "run"; if(typeof runOn === "function") runOn(mode === "run"); // le lecteur ne tourne que sur son onglet
  if(mode === "plan" && applyMode._prev !== "plan") planSyncDays();
  applyMode._prev = mode;
  { const g = curGrp(); store.set("si_g_" + g, mode); // groupe « Générer » / « Analyser » : seuls ses onglets sont affichés
    document.querySelectorAll("#grp button").forEach(b => { const on = b.dataset.g === g; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
    document.querySelectorAll(".mode:not(.cfg-tabs) button").forEach(b => { b.hidden = !GRP[g].includes(b.dataset.m); });
    document.querySelectorAll(".mode:not(.cfg-tabs)").forEach(m => m.classList.toggle("solo", m.querySelectorAll("button:not([hidden])").length <= 1)); } // un seul onglet : la barre de sous-menu est masquée sur téléphone
  document.documentElement.classList.toggle("m-cmp", mode === "cmp");
  document.documentElement.classList.toggle("m-ses", mode === "ses");
  document.documentElement.classList.toggle("m-exp", mode === "exp");
  document.documentElement.classList.toggle("m-plan", mode === "plan");
  document.documentElement.classList.toggle("m-run", mode === "run");
  document.documentElement.classList.toggle("m-calp", mode === "calp");
  document.documentElement.classList.toggle("no-prev", curGrp() !== "gen"); // l'aperçu de construction n'apparaît que dans le groupe « Générer »
  document.querySelectorAll('.mode:not(.cfg-tabs) button').forEach(b => { const on = b.dataset.m === mode, lb = t(b.querySelector("span").dataset.i); b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; b.title = lb; b.setAttribute("aria-label", lb); });
  if(mode === "calp"){ renderCalP(); loadCal().catch(() => {}); requestAnimationFrame(() => { try{ calFitP(); }catch(_){} }); } // après le masquage des autres blocs (sinon la hauteur est mesurée sous la page précédente) ; 2e passage une fois la mise en page stabilisée
}
document.querySelectorAll('.mode:not(.cfg-tabs) button').forEach(b => {
  b.onclick = () => { mode = b.dataset.m; store.set("si_mode", mode); applyMode(); };
  b.onkeydown = e => {
    const modes = GRP[curGrp()]; let idx = modes.indexOf(mode);
    if(e.key === "ArrowLeft") idx = (idx - 1 + modes.length) % modes.length;
    else if(e.key === "ArrowRight") idx = (idx + 1) % modes.length;
    else return;
    mode = modes[idx]; store.set("si_mode", mode); applyMode(); document.querySelector(`.mode [data-m="${mode}"]`).focus();
  };
});

// ---------- Analyse d'une séance : vue de type intervals.icu (stats, graphe puissance/FC, tableau des intervalles) ----------
const SES = {list: [], tok: 0, mt: 0, m: null, cur: "", ai: null};
async function sesInit(){ if(SES.m) return; SES.m = new Date(); SES.m.setDate(1); await sesMonth(true); }
async function sesMonth(pick, dir){ // petit calendrier du mois : une vignette (profil de puissance) par activité, un clic ouvre l'analyse
  const box = $("sesBox"), cal = $("sesCal"), m = SES.m;
  if(!KEY()){ box.innerHTML = `<div class="hint">${esc(t("needI"))}</div>`; return; }
  $("sesMT").textContent = m.toLocaleDateString(loc(), {month: "long", year: "numeric"});
  const mt = ++SES.mt; let acts;
  if(dir){ // changement de mois : la nouvelle page glisse depuis le côté dès le clic (grille vide), ce qui laisse le temps aux données d'arriver
    sesGrid(mt, true);
    if(cal.animate && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)){ cal.getAnimations().forEach(x => x.cancel()); cal.animate([{transform: `translateX(${dir * 90}px)`, opacity: 0}, {transform: "none", opacity: 1}], {duration: 600, easing: "cubic-bezier(.25,.8,.25,1)"}); }
  }else cal.innerHTML = `<div class="hint">${esc(t("sesLoad"))}</div>`;
  // mêmes données que le widget Calendrier : liste d'activités du mois en cache (CAL_CACHE), sinon une requête qui l'alimente aussi
  const now = new Date(), off = (m.getFullYear() - now.getFullYear()) * 12 + m.getMonth() - now.getMonth();
  try{ acts = (CAL_CACHE_KEY === KEY() && CAL_CACHE[off] ? CAL_CACHE[off] : await calFetch(off)).acts; }
  catch(e){ if(mt === SES.mt) cal.innerHTML = `<div class="hint">${esc(errText(e))}</div>`; return; }
  if(mt !== SES.mt) return;
  SES.list = (Array.isArray(acts) ? acts : []).filter(x => x.id != null).sort((x, y) => x.start_date_local < y.start_date_local ? -1 : 1);
  $("sesSel").innerHTML = SES.list.map(x => `<option value="${esc(x.id)}"></option>`).join("");
  let id = ""; if(pick){ const sv = store.get("si_sesid"); id = SES.list.some(x => String(x.id) === sv) ? sv : (SES.list.length ? String(SES.list[SES.list.length - 1].id) : ""); if(id) SES.cur = id; }
  if(!pick && SES.list.some(x => String(x.id) === SES.cur)) $("sesSel").value = SES.cur; // l'actualisation garde l'activité affichée
  sesGrid(mt);
  // préchargement des listes d'activités des mois voisins : le prochain changement de mois est alors immédiat
  setTimeout(() => { if(mt === SES.mt && CAL_CACHE_KEY === KEY()) [off - 1, off + 1].forEach(o => { if(!CAL_CACHE[o]) calFetch(o).catch(() => {}); }); }, 400);
  if(pick){ if(id){ $("sesSel").value = id; sesShow(); } else if(!SES.list.length) box.innerHTML = `<div class="hint">${esc(t("sesNone"))}</div>`; }
}
// ---------- icônes de type d'activité (calendrier « Séance seule ») : vélo, course, natation, ping-pong ; flamme pour le reste ----------
const SES_ICO = {
  ride: {c: "#3b82c4", d: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>'},
  run: {c: "#e8590c", d: '<circle cx="14.5" cy="4" r="1.8"/><path d="M12.5 8.5L10 12.5l3.5 2.5 1 5.5"/><path d="M10 12.5L6 14.5"/><path d="M12.8 9.5l3.7 2 2.5-1"/><path d="M11.8 14.2L8.5 18l-3.5.5"/>'},
  swim: {c: "#0e9fb5", d: '<circle cx="17" cy="6" r="1.8"/><path d="M4 12.5l5-2.5 3.5 2 3-3.5"/><path d="M2 16.5c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2"/><path d="M2 20.5c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2"/>'},
  rideIn: {c: "#5b5fc7", d: '<circle cx="5.5" cy="13.5" r="3"/><circle cx="18.5" cy="13.5" r="3"/><circle cx="15" cy="3.5" r="1"/><path d="M12 13.5V10l-3-3 4-3 2 3h2"/><path d="M3 21h18"/><path d="M5.5 16.5V21"/><path d="M18.5 16.5V21"/>'},
  pong: {c: "#c2255c", d: '<circle cx="9.5" cy="9.5" r="6.5"/><path d="M14.2 14.2L19.5 19.5"/><path d="M18.3 21l2.7-2.7"/><circle cx="19" cy="5" r="1.6"/>'},
  other: {c: "#f08c00", d: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'}
};
const sesKind = a => { const ty = (a && a.type) || ""; return /Ride|Bike|Cycl/i.test(ty) ? (a.trainer === true || ty === "VirtualRide" || /virtual|trainer|indoor|zwift/i.test(a.sub_type || "") ? "rideIn" : "ride") : /Run/i.test(ty) ? "run" : /Swim/i.test(ty) ? "swim" : /Table.?Tennis|Ping/i.test(ty) ? "pong" : "other"; };
const sesIco = k => `<svg class="sti" viewBox="0 0 24 24" aria-hidden="true">${SES_ICO[k].d}</svg>`;
function sesTh(b, svg){ const th = b.querySelector(".stth"); if(!th) return; th.classList.remove("ph"); th.style.color = ""; th.innerHTML = svg; } // le vrai profil remplace l'icône d'attente ; le badge de type prend le relais
function sesGrid(mt, skeleton){ // skeleton : grille vide du mois (affichée pendant le glissement, avant l'arrivée des activités)
  const m = SES.m, by = {}, nd = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate(), lead = (new Date(m.getFullYear(), m.getMonth(), 1).getDay() + 6) % 7;
  (skeleton ? [] : SES.list).forEach(a => { const k = (a.start_date_local || "").slice(0, 10); (by[k] = by[k] || []).push(a); });
  let h = [...Array(7)].map((_, i) => `<div class="dh">${esc(new Date(2024, 0, 1 + i).toLocaleDateString(loc(), {weekday: "narrow"}))}</div>`).join("") + "<div></div>".repeat(lead);
  for(let d = 1; d <= nd; d++){
    const L = by[iso(new Date(m.getFullYear(), m.getMonth(), d))] || [];
    h += `<div class="sesd${L.length ? " has" : ""}"><span>${d}</span>${L.map(a => `${(x => x ? `<i class="sesnp" data-if="${x.lv}" title="NP ${x.np} W"><span class="sesnpl">NP </span>${x.np}</i>` : "")(calNP(a, true))}<button type="button" data-id="${esc(a.id)}" title="${esc((a.name || a.type || "") + (a.type ? " · " + actT(a.type) : "") + (/^(ride|rideIn)$/.test(sesKind(a)) ? " · " + t(sesKind(a) === "rideIn" ? "indoor" : "outdoor") : ""))}" aria-label="${esc((a.name || "") + " " + actT(a.type || ""))}" class="${String(a.id) === SES.cur ? "on" : ""}">${(k => `<span class="stth ph" style="color:${SES_ICO[k].c}">${sesIco(k)}</span><span class="stb" style="background:${SES_ICO[k].c}">${sesIco(k)}</span>`)(sesKind(a))}</button>`).join("")}</div>`;
  }
  const cal = $("sesCal"); cal.innerHTML = `<div class="sesg">${h}</div>`;
  if(skeleton) return;
  cal.querySelectorAll("button[data-id]").forEach(b => {
    b.onclick = () => { $("sesSel").value = b.dataset.id; sesShow(); };
    const pf = () => sesPrefetch(SES.list.find(x => String(x.id) === b.dataset.id)); // la requête part avant le clic
    b.addEventListener("pointerenter", pf); b.addEventListener("pointerdown", pf); b.addEventListener("focus", pf);
  });
  // vignettes : même chargeur que le calendrier principal (actStreams : 4 requêtes max en parallèle, réessais, cache persistant partagé)
  // et même rendu (actPrevSvg, avec un profil de repli si l'activité n'a pas de flux exploitable) ; un échec transitoire est retenté plus tard
  const q = SES.list.map(a => ({a, n: 0})), run = async () => {
    while(q.length && mt === SES.mt){
      const it = q.shift(), a = it.a, b = cal.querySelector(`button[data-id="${a.id}"]`); if(!b) continue;
      let sw = null; try{ sw = await actStreams(String(a.id), a); }catch(e){}
      const sp = sw && !sw.transient ? (actPrevSvg(sw) || actFallbackSvg(a, sw)) : "";
      if(sp) sesTh(b, sp);
      else if((!sw || sw.transient) && ++it.n < 4){ await new Promise(r => setTimeout(r, 800 * it.n)); q.push(it); }
      else if(sw && !sw.transient){ const fb = actFallbackSvg(a, sw); if(fb) sesTh(b, fb); }
    }
  };
  Promise.all([run(), run(), run(), run()]).then(async () => { // vignettes des mois voisins : le changement de mois les trouve déjà prêtes
    if(mt !== SES.mt || (navigator.connection && navigator.connection.saveData)) return;
    const now = new Date(), off0 = (SES.m.getFullYear() - now.getFullYear()) * 12 + SES.m.getMonth() - now.getMonth();
    for(const o of [off0 - 1, off0 + 1]){
      let acts; try{ acts = (CAL_CACHE_KEY === KEY() && CAL_CACHE[o] ? CAL_CACHE[o] : await calFetch(o)).acts; }catch(e){ continue; }
      for(const x of (Array.isArray(acts) ? acts : [])){ if(mt !== SES.mt) return; if(x.id != null) await actStreams(String(x.id), x).catch(() => {}); }
    }
  });
  // préchauffage : les flux complets du mois sont récupérés en arrière-plan (un à la fois, le plus récent d'abord) ; ils vont au cache persistant,
  // si bien qu'un clic ultérieur est instantané. Désactivé en mode économie de données.
  if(!(navigator.connection && navigator.connection.saveData)){
    const warm = SES.list.filter(a => a.icu_average_watts || a.average_watts || a.average_heartrate).slice().reverse();
    setTimeout(async () => { for(const a of warm){ if(mt !== SES.mt) return; if(!CMP.streams[a.id]) await cmpStreams(a.id, a).catch(() => {}); } }, 2500);
  }
}
function sesStat(arr, s, e){ if(!arr) return null; let n = 0, sum = 0, mx = 0; for(let i = s; i < Math.min(e, arr.length); i++){ const v = arr[i] || 0; sum += v; n++; if(v > mx) mx = v; } return n ? {avg: sum / n, max: mx} : null; }
function sesNP(w, s, e){ if(!w || e - s < 30) return null; let acc = 0, n = 0, run = 0; for(let i = s; i < Math.min(e, w.length); i++){ run += w[i] || 0; if(i - s >= 30) run -= w[i - 30] || 0; if(i - s >= 29){ const m = run / 30; acc += m * m * m * m; n++; } } return n ? Math.pow(acc / n, 0.25) : null; }
function sesAiOn(){ const b = $("sesAi"); if(b) b.disabled = !SES.ai; }
// flux de vitesse (m/s) pleine résolution pour la course et la natation ; null si l'activité n'en a pas
function sesIv(id){
  SES.iv = SES.iv || {}; SES.ivp = SES.ivp || {};
  if(SES.iv[id]) return Promise.resolve(SES.iv[id]);
  return SES.ivp[id] || (SES.ivp[id] = icuFetch(`https://intervals.icu/api/v1/activity/${id}/intervals`).catch(() => null).then(v => { delete SES.ivp[id]; if(v) SES.iv[id] = v; return v; }));
}
function sesSpeed(id){ SES.spdp = SES.spdp || {}; return SES.spdp[id] || (SES.spdp[id] = sesSpeedRaw(id).finally(() => { delete SES.spdp[id]; })); }
// préchargement d'une activité (survol / toucher / focus d'une vignette, ou arrière-plan) : flux, intervalles et vitesse
function sesPrefetch(a){ if(!a || !KEY()) return; cmpStreams(a.id, a).catch(() => {}); sesIv(a.id); if(/Run|Swim/.test(a.type || "")) sesSpeed(a.id).catch(() => {}); }
async function sesSpeedRaw(id){
  SES.spd = SES.spd || {};
  if(SES.spd[id] !== undefined) return SES.spd[id];
  try{
    const l = await icuFetch(`https://intervals.icu/api/v1/activity/${id}/streams?types=velocity_smooth`), list = Array.isArray(l) ? l : (l && l.streams) || [];
    const d = (list.find(x => x.type === "velocity_smooth") || list.find(x => x.type === "speed") || {}).data;
    return SES.spd[id] = d && d.length ? Array.from(d, v => +v > 0 ? +v : 0) : null;
  }catch(e){ return null; }
}
// Tours (laps) enregistrés par l'appareil : lus dans le fichier d'origine de l'activité (messages « lap » du FIT), contrairement aux intervalles détectés par intervals.icu
function fitLaps(bytes){
  fitLaps.devs = null;
  if(bytes.length < 14 || String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) !== ".FIT") return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), hl = bytes[0], end = Math.min(bytes.length, hl + dv.getUint32(4, true));
  const defs = {}, laps = [], recT = [], recP = [], allT = [], allP = [], devs = {}; let t0 = null, pos = hl;
  try{
    while(pos < end){
      const h = bytes[pos++];
      if(h & 0x80){ const d = defs[(h >> 5) & 3]; if(!d) break; pos += d.size; continue; } // horodatage compressé
      if(h & 0x40){
        pos++; const big = bytes[pos++] === 1, g = dv.getUint16(pos, !big); pos += 2;
        const n = bytes[pos++], f = []; let size = 0;
        for(let k = 0; k < n; k++){ f.push([bytes[pos], bytes[pos + 1]]); size += bytes[pos + 1]; pos += 3; }
        if(h & 0x20){ const dn = bytes[pos++]; for(let k = 0; k < dn; k++){ size += bytes[pos + 1]; pos += 3; } } // champs développeur
        defs[h & 0x0f] = {g, f, big, size};
      }else{
        const d = defs[h & 0x0f]; if(!d) break;
        if(d.g === 19){
          let p = pos; const r = {};
          for(const [num, sz] of d.f){ if(sz === 4 && (num === 253 || num === 2 || num === 7)) r[num] = dv.getUint32(p, !d.big); p += sz; }
          if(r[2] != null && r[7] != null && r[7] !== 0xFFFFFFFF) laps.push({st: r[2], dur: r[7] / 1000});
        }else if(d.g === 23){ // device_info : capteurs et appareils ayant servi à l'enregistrement
          let p = pos; const r = {};
          for(const [num, sz] of d.f){
            if(num === 27) r.name = String.fromCharCode(...bytes.subarray(p, p + sz).filter(c => c >= 32 && c < 127));
            else if(sz === 1) r[num] = bytes[p]; else if(sz === 2) r[num] = dv.getUint16(p, !d.big); else if(sz === 4) r[num] = dv.getUint32(p, !d.big);
            p += sz;
          }
          devs[r[0] != null && r[0] !== 255 ? r[0] : "x" + Object.keys(devs).length] = r; // une même ligne revient au début et à la fin : on garde la dernière
        }else if(d.g === 20){ // enregistrement : horodatage + puissance, pour caler la base de temps sur le flux intervals.icu
          let p = pos, ts = null, pw = null;
          for(const [num, sz] of d.f){ if(num === 253 && sz === 4) ts = dv.getUint32(p, !d.big); else if(num === 7 && sz === 2) pw = dv.getUint16(p, !d.big); p += sz; }
          if(ts != null && ts !== 0xFFFFFFFF){ allT.push(ts); allP.push(pw != null && pw !== 0xFFFF ? pw : 0); }
          if(ts != null && ts !== 0xFFFFFFFF && pw != null && pw !== 0xFFFF){ recT.push(ts); recP.push(pw); }
        }
        pos += d.size;
      }
    }
  }catch(e){ /* fichier tronqué : on garde ce qui a été lu */ }
  fitLaps.devs = Object.values(devs);
  if(laps.length < 2) return null;
  // base de temps = début du premier tour (comme intervals.icu), pas le premier enregistrement du fichier
  t0 = Math.min(...laps.map(l => l.st));
  const out = laps.map(l => { const s = Math.max(0, Math.round(l.st - t0)); return {s, e: s + Math.max(1, Math.round(l.dur))}; }).filter(l => l.e > l.s).sort((x, y) => x.s - y.s);
  for(let i = 0; i < out.length - 1; i++) out[i].e = out[i + 1].s; // tours contigus
  const res = out.filter(l => l.e > l.s);
  if(res.length < 2) return null;
  res.t0 = t0; res.idx = {t: allT, p: allP}; // chaque enregistrement = 1 échantillon du flux (les pauses du chrono n'en créent pas)
  if(recT.length > 60){ let lo = Infinity, hi = -Infinity; for(const x of recT){ if(x < lo) lo = x; if(x > hi) hi = x; } if(hi - lo < 100000){ const P = new Float32Array(hi - lo + 1).fill(NaN); for(let i = 0; i < recT.length; i++) P[recT[i] - lo] = recP[i]; res.rec = {t0: lo, p: P}; } }
  return res;
}
// décalage (s) entre la base de temps des tours (début du 1er tour) et l'indice 0 du flux intervals.icu :
// on retrouve l'indice 0 en comparant la puissance du fichier FIT au flux (écart absolu moyen minimal)
function fitShift(lp, w){
  if(!lp || !lp.rec || !w || w.length < 120) return {sh: 0, cost: Infinity};
  const {t0: r0, p: P} = lp.rec, n = Math.min(w.length, 6000);
  let best = Infinity, bestC = null;
  for(let c = -30; c <= Math.min(600, lp.t0 - r0 + 60); c++){ // c : horodatage de l'indice 0 = r0 + c
    let sum = 0, k = 0;
    for(let i = 0; i < n; i++){ const j = c + i; if(j < 0 || j >= P.length) continue; const v = P[j]; if(v !== v) continue; sum += Math.abs((w[i] || 0) - v); k++; }
    if(k >= 60 && sum / k < best){ best = sum / k; bestC = c; }
  }
  return bestC == null ? {sh: 0, cost: Infinity} : {sh: lp.t0 - (r0 + bestC), cost: best};
}
// le flux intervals.icu compte les échantillons (1 par enregistrement), sans les pauses du chrono : on convertit l'horodatage de début de chaque tour
// en indice d'enregistrement, ou à défaut en décalage constant (flux rééchantillonné à 1 Hz), selon ce qui colle le mieux à la puissance du flux
function fitToStream(lp, w, N){
  const tm = fitShift(lp, w); let useIdx = false;
  if(lp.idx && w && w.length >= 120){
    const n = Math.min(w.length, lp.idx.p.length, 6000); let sum = 0;
    for(let i = 0; i < n; i++) sum += Math.abs((w[i] || 0) - lp.idx.p[i]);
    useIdx = n >= 60 && sum / n <= tm.cost + 0.01;
  }
  let L;
  if(useIdx){
    const T = lp.idx.t, at = ts => { let a = 0, b = T.length; while(a < b){ const m = (a + b) >> 1; if(T[m] < ts) a = m + 1; else b = m; } return a; };
    L = lp.map(x => ({s: at(lp.t0 + x.s), e: 0}));
    for(let i = 0; i < L.length; i++) L[i].e = i + 1 < L.length ? L[i + 1].s : N;
  }else L = lp.map(x => ({s: Math.max(0, x.s + tm.sh), e: x.e + tm.sh}));
  return L.filter(x => x.s < N && x.e > x.s).map(x => ({s: x.s, e: Math.min(N, x.e)}));
}
// capteurs d'après device_info : type ANT+ (source 0/1) ou BLE (source 2/3) -> rôle ; l'appareil créateur (index 0) est l'enregistreur
const FIT_MFR = {1: "Garmin", 6: "SRM", 7: "Quarq", 13: "Dynastream", 15: "Dynastream", 32: "Wahoo", 63: "Specialized", 69: "Stages", 70: "Sigma", 73: "Wattbike", 76: "Moxy", 81: "Bryton", 86: "Elite", 89: "Tacx", 95: "Stryd", 107: "Magene", 260: "Zwift", 294: "COROS"};
const FIT_TRAINER = new Set([89, 86, 32]), FIT_ANT = {11: 1, 120: 2, 121: 3, 122: 4, 123: 5, 17: 6, 35: 7, 36: 7, 40: 8, 34: 9}, FIT_BLE = {3: 1, 2: 2, 4: 3, 6: 4, 5: 5, 8: 6};
function sesDevices(list, a){
  // une ligne par rôle selon le type d'activité : vélo intérieur -> Trainer + HR ; vélo extérieur -> Power + HR ; course -> Speed ; natation -> Pace
  const kind = sesKind(a), L = t("sesDevL").split("|"), colon = lang === "fr" ? " : " : ": ";
  const clean = n => { n = (n || "").replace(/[^\x20-\x7e]/g, "").trim().replace(/\s+\d{5,}$/, "").trim(); return /^[\d\s\-_.\/]*$/.test(n) ? "" : n; }; // retire numéros de série (« Neo 2T 37404 ») et références (« 34860-1 »)
  const brand = r => FIT_MFR[r[2]] || clean(r.name);
  const role = r => { const src = r[25], ty = r[1]; return (src === 2 || src === 3 ? FIT_BLE[ty] : FIT_ANT[ty]) || null; };
  const all = list || [], head = all.find(r => r[0] === 0), sens = all.filter(r => r[0] !== 0 && r[25] !== 5); // capteurs externes seulement (source 5 = interne)
  const best = rs => { const c = rs.map(r => { const n = clean(r.name), m = FIT_MFR[r[2]]; return n ? (m && !n.toLowerCase().includes(m.toLowerCase()) ? m + " " + n : n) : (m || ""); }).filter(Boolean); return c.sort((x, y) => y.length - x.length)[0] || ""; };
  const uniq = rs => [...new Set(rs.map(brand).filter(Boolean))].join(" + ");
  const headName = clean(a && a.device_name) || (head ? best([head]) : "");
  const trainers = all.filter(r => r[25] !== 5 && (role(r) === 6 || (role(r) == null && (r[0] === 0 ? r[2] === 89 || r[2] === 86 : FIT_TRAINER.has(r[2])))));
  const trainer = trainers.length ? best(trainers) : "", power = uniq(sens.filter(r => role(r) === 1)), hr = uniq(sens.filter(r => role(r) === 2));
  const out = [];
  if(kind === "rideIn"){ if(trainer) out.push([L[0], trainer]); else if(power) out.push([L[1], power]); if(hr) out.push([L[2], hr]); }
  else if(kind === "ride"){ if(power) out.push([L[1], power]); else if(headName) out.push([L[3], headName]); if(hr) out.push([L[2], hr]); }
  else if(kind === "run"){ if(headName) out.push([L[3], headName]); if(hr) out.push([L[2], hr]); }
  else if(kind === "swim"){ if(headName) out.push([L[4], headName]); if(hr) out.push([L[2], hr]); }
  return out.map(([k, v]) => k + colon + v);
}
// cache persistant (IndexedDB, le même que celui du comparateur) du résultat de l'analyse du fichier FIT : tours + capteurs, les plus coûteux à obtenir
const lapPack = (res, devs) => ({v: 1, ts: Date.now(), devs: devs || [], laps: res ? res.map(x => [x.s, x.e]) : null,
  t0: res ? res.t0 : 0, it: res && res.idx ? Uint32Array.from(res.idx.t) : null, ip: res && res.idx ? Uint16Array.from(res.idx.p) : null, rec: res && res.rec ? res.rec : null});
function lapUnpack(c){
  if(!c.laps) return null;
  const out = c.laps.map(x => ({s: x[0], e: x[1]})); out.t0 = c.t0;
  out.idx = {t: c.it ? Array.from(c.it) : [], p: c.ip ? Array.from(c.ip) : []}; if(c.rec) out.rec = c.rec;
  return out;
}
async function sesLaps(id, a){
  SES.lap = SES.lap || {};
  if(SES.lap[id] !== undefined) return SES.lap[id];
  const key = "ses:" + id, c = await scGet(key);
  // absence de fichier / d'analyse : retenue un jour seulement (le fichier peut arriver plus tard)
  if(c && c !== true && c.v === 1 && (c.laps || (c.devs && c.devs.length) || Date.now() - c.ts < 864e5)){ (SES.dev = SES.dev || {})[id] = c.devs || []; return SES.lap[id] = lapUnpack(c); }
  let out = null, devs = null;
  try{
    const r = await icuRaw(`https://intervals.icu/api/v1/activity/${id}/file`);
    if(!r.ok){ if(r.status === 404 && !scFresh(a)) scPut(key, lapPack(null, null)); return SES.lap[id] = null; } // pas de fichier d'origine (activité Strava, saisie manuelle…) : on garde les intervalles intervals.icu
    let buf = new Uint8Array(await r.arrayBuffer());
    if(buf[0] === 0x1f && buf[1] === 0x8b && typeof DecompressionStream === "function") buf = new Uint8Array(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
    out = fitLaps(buf); devs = fitLaps.devs; (SES.dev = SES.dev || {})[id] = devs;
  }catch(e){ return null; }
  if(!scFresh(a)) scPut(key, lapPack(out, devs));
  return SES.lap[id] = out;
}
async function sesShow(again){ // again === true : second pass once the device file (laps, sensors) has arrived
  const a = (SES.list || []).find(x => String(x.id) === $("sesSel").value), box = $("sesBox"); if(!a) return;
  store.set("si_sesid", String(a.id)); SES.cur = String(a.id); if(again !== true) SES.ai = null; document.querySelectorAll("#sesCal button[data-id]").forEach(x => x.classList.toggle("on", x.dataset.id === SES.cur)); const tok = ++SES.tok;
  // l'en-tête (nom, type, date, lien) s'affiche tout de suite et reste seul quand l'activité n'a ni puissance ni FC (ping-pong, course…)
  const hdr = `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h3 class="ses-title">${esc(a.name || actT(a.type) || a.type || "")}</h3><button type="button" class="alt small aibtn" id="sesAi"${SES.ai && SES.ai.a === a ? "" : " disabled"}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/></svg><span>${esc(t("lastAi"))}</span></button></div><div class="hint ses-meta">${esc(actT(a.type))} · ${esc(new Date(a.start_date_local).toLocaleDateString(loc(), {weekday: "long", day: "numeric", month: "long", year: "numeric"}))} · <a href="https://intervals.icu/activities/${encodeURIComponent(a.id)}" target="_blank" rel="noopener">${esc(t("sesOpen"))}</a>${isBike(a.type) ? ` · <a href="#" data-rebuild="${esc(String(a.id))}">${esc(t("sesRebuild"))}</a>` : ""} · <a href="#" data-export="${esc(String(a.id))}" title="${esc(t("sesExpT"))}">${esc(t("sesExp"))}</a></div>`;
  const isSpd = /Run|Swim/.test(a.type || ""), noData = !(isSpd && a.average_speed) && !(a.icu_average_watts || a.average_watts || a.icu_weighted_avg_watts || a.average_heartrate || a.max_heartrate);
  if(again !== true){
    // affichage immédiat : les indicateurs viennent du résumé de l'activité (déjà en mémoire), le graphe est remplacé par un gabarit de même taille en attendant les flux
    let early = `<div class="hint">${esc(t("sesLoad"))}</div>`;
    if(!noData){
      const f0 = v => v == null ? "–" : Math.round(v), K = t("sesKv").split("|"), ifv = a.icu_intensity,
        kv = [fmtDur(a.moving_time), a.distance ? (a.distance / 1000).toFixed(1) + " km" : "–", f0(a.icu_average_watts || a.average_watts) + " W", f0(a.icu_weighted_avg_watts) + " W",
          ifv > 0 ? Math.round(ifv > 3 ? ifv : ifv * 100) + " %" : "–", f0(a.icu_training_load), f0(a.average_heartrate) + " bpm", f0(a.total_elevation_gain) + " m"];
      if(isSpd && a.average_speed){ const swim = /Swim/.test(a.type || ""), sa = a.average_speed; K[2] = t("lPace"); K[3] = t("lSpeed"); kv[2] = (sa > 0.2 ? mmss((swim ? 100 : 1000) / sa) : "–") + (swim ? " /100 m" : " /km"); kv[3] = (sa * 3.6).toFixed(1) + " km/h"; }
      early = `<div class="kv" style="grid-template-columns:repeat(4,1fr)">${kv.map((v, i) => `<div>${esc(K[i])}<b>${esc(v)}</b></div>`).join("")}</div><div class="ses-ph" role="status" aria-busy="true" aria-label="${esc(t("sesLoad"))}"></div>`;
    }
    box.innerHTML = hdr + early;
  }
  try{
    let st, iv = null, spd = null, lp = null, lapPending = false;
    // le graphe n'attend plus le fichier FIT d'origine (lourd : téléchargement + décompression + analyse) : il s'affiche dès que flux et intervalles sont là,
    // puis se redessine une fois les tours et capteurs lus. Intervalles et fichier sont mis en cache pour ce second passage.
    SES.lap = SES.lap || {};
    const ivP = sesIv(a.id),
      lapP = SES.lap[a.id] !== undefined || again === true ? null : sesLaps(a.id, a);
    try{ [st, iv, spd] = await Promise.all([cmpStreams(a.id, a), ivP, isSpd ? sesSpeed(a.id) : null]); lp = SES.lap[a.id] !== undefined ? SES.lap[a.id] : null;
      if(lapP){ const r = await Promise.race([lapP.then(x => ({x})), new Promise(res => setTimeout(() => res(null), 150))]); if(r) lp = r.x; else lapPending = true; } } // fichier FIT en cache : instantané ; sinon le tableau attend le fichier
    catch(e){ if(!noData) throw e; st = {}; } // pas de flux pour une activité sans capteur : on garde le nom seul
    if(tok !== SES.tok) return;
    if(!noData) SES.ai = {a, w: st.w, hr: st.hr}; // analyse IA : bouton à côté du nom de la séance, activé une fois les données chargées
    const w = st.w, hr = st.hr, cad = st.cad, N = Math.max((w || []).length, (hr || []).length, (spd || []).length), spdMode = !!(spd && spd.length);
    if(!N){ box.innerHTML = hdr + `<div class="hint">${esc(t("sesNoStr"))}</div>`; sesAiOn(); return; }
    const ftp = (a.type === "VirtualRide" ? ICU.ftpIn : ICU.ftpOut) || ICU.ftpIn || ICU.ftpOut || 0;
    let B = ((iv && iv.icu_intervals) || []).filter(x => x.end_index > x.start_index).map(x => ({s: x.start_index, e: x.end_index, label: x.label || "", work: !/REC/i.test(x.type || "")}));
    let lapsUsed = false;
    if(lp && lp.length >= 2){ // tours de l'appareil disponibles : ils remplacent les intervalles d'intervals.icu
      const L = fitToStream(lp, w, N);
      if(L.length >= 2){ lapsUsed = true; B = L.map((x, i) => { const sw = w && !spdMode ? sesStat(w, x.s, x.e) : null; return {s: x.s, e: x.e, label: t("sesLap", i + 1), work: sw ? sw.avg >= 0.75 * (ftp || 250) : i % 2 === 0}; }); }
    }
    if(!B.length && w && !spdMode){ let c = 0; B = detectSteps(w, ftp || 250).map(x => { const o = {s: c, e: c + x.d, label: "", work: x.a >= 0.75 * (ftp || 250)}; c += x.d; return o; }); }
    if(lapPending) B = []; // les tours viennent exclusivement du fichier FIT : ni bandes ni tableau (ni intervalles intervals.icu) tant qu'il n'est pas lu
    const f0 = v => v == null ? "–" : Math.round(v), K = t("sesKv").split("|"), H = t(spdMode ? "sesHdrS" : "sesHdr").split("|");
    const swim = /Swim/.test(a.type || ""), pu = swim ? " /100 m" : " /km", paceOf = v => v > 0.2 ? mmss((swim ? 100 : 1000) / v) : "–";
    const ifv = a.icu_intensity, kv = [fmtDur(a.moving_time), a.distance ? (a.distance / 1000).toFixed(1) + " km" : "–", f0(a.icu_average_watts || a.average_watts) + " W", f0(a.icu_weighted_avg_watts) + " W",
      ifv > 0 ? Math.round(ifv > 3 ? ifv : ifv * 100) + " %" : "–", f0(a.icu_training_load), f0(a.average_heartrate) + " bpm", f0(a.total_elevation_gain) + " m"];
    if(spdMode){ const sa = a.average_speed || (sesStat(spd, 0, spd.length) || {}).avg || 0; K[2] = t("lPace"); K[3] = t("lSpeed"); kv[2] = paceOf(sa) + pu; kv[3] = sa ? (sa * 3.6).toFixed(1) + " km/h" : "–"; }
    // graphe : puissance et FC moyennées par paquets, intervalles d'effort ombrés
    const W = 900, Hh = 240, bk = Math.max(1, Math.ceil(N / 700)), pts = (arr) => { if(!arr) return []; const o = []; for(let i = 0; i < N; i += bk){ let sum = 0, n = 0; for(let j = i; j < Math.min(i + bk, arr.length); j++){ sum += arr[j] || 0; n++; } o.push(n ? sum / n : 0); } return o; };
    const sp = spdMode ? pts(spd) : [], hrT = pts(hr), pw = spdMode ? [] : pts(w), hh = spdMode ? [] : hrT, pmax = Math.max(ftp * 1.5, ...pw, 100), hmax = Math.max(...hh, 100), smax = spdMode ? Math.max(...sp, 1) * 1.1 : 1, nb = spdMode ? sp.length : (pw.length || hh.length), X = i => i / Math.max(1, nb - 1) * W;
    const path = (v, mx) => v.map((y, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + (Hh - 14 - y / mx * (Hh - 24)).toFixed(1)).join("");
    const rects = B.map((b, i) => `<rect data-r="${i}" x="${(b.s / N * W).toFixed(1)}" width="${Math.max(1, (b.e - b.s) / N * W).toFixed(1)}" y="0" height="${Hh - 14}" data-f="${b.work ? "var(--acc)" : "none"}" fill="${b.work ? "var(--acc)" : "none"}" opacity=".13"/>`).join("");
    const svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(a.name || "")}">${rects}${ftp && !spdMode ? `<line x1="0" x2="${W}" y1="${Hh - 14 - ftp / pmax * (Hh - 24)}" y2="${Hh - 14 - ftp / pmax * (Hh - 24)}" stroke="var(--mute)" stroke-dasharray="4 4" opacity=".6"/>` : ""}` +
      (hh.length ? `<path d="${path(hh, hmax)}" fill="none" stroke="var(--err)" stroke-width="1.2" opacity=".75"/>` : "") + (pw.length ? `<path d="${path(pw, pmax)}" fill="none" stroke="var(--acc)" stroke-width="1.5"/>` : "") +
      (spdMode ? `<path d="${path(sp, smax)}" fill="none" stroke="var(--acc)" stroke-width="1.5"/><text x="4" y="12" font-size="11" fill="var(--mute)">${esc(t("lSpdMax"))} ${(Math.max(...sp) * 3.6).toFixed(1)} km/h</text>` : "") +
      `<text x="4" y="${Hh - 2}" font-size="11" fill="var(--mute)">0</text><text x="${W - 4}" y="${Hh - 2}" font-size="11" text-anchor="end" fill="var(--mute)">${esc(fmtDur(N))}</text></svg>`;
    const rows = B.map((b, i) => { if(spdMode){ const ss = sesStat(spd, b.s, b.e), sh = sesStat(hr, b.s, b.e), sc = sesStat(cad, b.s, b.e);
        return `<tr data-ri="${i}"><td>${i + 1}</td><td>${esc(b.label || t(b.work ? "sesWork" : "sesRec"))}</td><td>${mmss(b.e - b.s)}</td><td>${paceOf(ss && ss.avg)}</td><td>${ss ? (ss.avg * 3.6).toFixed(1) : "–"}</td><td>${paceOf(ss && ss.max)}</td><td>${f0(sh && sh.avg)}</td><td>${f0(sh && sh.max)}</td><td>${f0(sc && sc.avg)}</td></tr>`; }
      const sw = sesStat(w, b.s, b.e), sh = sesStat(hr, b.s, b.e), sc = sesStat(cad, b.s, b.e), np = sesNP(w, b.s, b.e);
      return `<tr data-ri="${i}"><td>${i + 1}</td><td>${esc(b.label || t(b.work ? "sesWork" : "sesRec"))}</td><td>${mmss(b.e - b.s)}</td><td>${f0(sw && sw.avg)}</td><td>${f0(np)}</td><td>${sw && ftp ? Math.round(sw.avg / ftp * 100) : "–"}</td><td>${f0(sh && sh.avg)}</td><td>${f0(sh && sh.max)}</td><td>${f0(sc && sc.avg)}</td><td>${f0(sw && sw.max)}</td></tr>`; }).join("");
    const devL = sesDevices((SES.dev || {})[a.id], a);
    box.innerHTML = hdr +
      `<div class="kv" style="grid-template-columns:repeat(4,1fr)">${kv.map((v, i) => `<div>${esc(K[i])}<b>${esc(v)}</b></div>`).join("")}</div>` +
      (devL.length ? `<div class="hint" style="margin:6px 0 0">${esc(t("sesDev"))} · ${devL.map(esc).join(" · ")}</div>` : "") + svg +
      (lapPending ? `<div class="ses-ph" role="status" aria-busy="true" style="aspect-ratio:auto;height:110px;margin-top:14px"></div>` : B.length ? `<h3 style="margin:14px 0 6px;font-size:.95rem">${esc(t(lapsUsed ? "sesLaps" : "sesIv"))}</h3><div style="overflow-x:auto"><table class="sest"><thead><tr>${H.map(x => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>` : "");
    sesAiOn();
    chartHover(box, box.querySelector("svg[role=img]"), nb, i => {
      const s0 = i * bk, s1 = Math.min(N, s0 + bk), sc = sesStat(cad, s0, s1), k = B.findIndex(b => s0 >= b.s && s0 < b.e), b = k >= 0 ? B[k] : null;
      const hv = hrT[i], L = spdMode ? [`${esc(t("lPace"))} : ${paceOf(sp[i])}${pu}`, `${esc(t("lSpeed"))} : ${(sp[i] * 3.6).toFixed(1)} km/h`, hv ? `${esc(t("lHRs"))} : ${Math.round(hv)} bpm` : "", sc && sc.avg ? `${esc(t("lCad"))} : ${Math.round(sc.avg)} rpm` : "", b ? `#${k + 1} · ${esc(b.label || t(b.work ? "sesWork" : "sesRec"))}` : ""].filter(Boolean) : [pw.length ? `${esc(t("lPow"))} : ${Math.round(pw[i])} W` + (ftp ? ` (${Math.round(pw[i] / ftp * 100)} %)` : "") : "", hh.length && hh[i] ? `${esc(t("lHRs"))} : ${Math.round(hh[i])} bpm` : "", sc && sc.avg ? `${esc(t("lCad"))} : ${Math.round(sc.avg)} rpm` : "", b ? `#${k + 1} · ${esc(b.label || t(b.work ? "sesWork" : "sesRec"))}` : ""].filter(Boolean);
      return {html: `<b>${esc(fmtDur(s0))}</b>` + L.join("\n")};
    });
    // surbrillance des plages : une seule fonction recalcule l'aspect de chaque bande (sélection par clic + survol) à partir de son état de base,
    // pour que tout revienne à l'identique quand on désélectionne (les récupérations « sans remplissage » reprennent leur état invisible)
    let hov = null;
    const paint = () => {
      const sel = box.querySelector("tr.on"), si = sel ? sel.dataset.ri : null;
      box.querySelectorAll("rect[data-r]").forEach(c => {
        const hi = c.dataset.r === si || c.dataset.r === hov;
        c.setAttribute("opacity", hi ? ".4" : ".13");
        c.setAttribute("fill", hi && c.dataset.f === "none" ? "var(--mute)" : c.dataset.f);
      });
    };
    box.querySelectorAll("tr[data-ri]").forEach(r => {
      r.onclick = () => { const on = !r.classList.contains("on"); box.querySelectorAll("tr.on").forEach(x => x.classList.remove("on")); if(on) r.classList.add("on"); paint(); };
      r.addEventListener("mouseenter", () => { hov = r.dataset.ri; paint(); });
      r.addEventListener("mouseleave", () => { hov = null; paint(); });
    });
    if(lapPending) lapP.then(() => { if(tok === SES.tok) sesShow(true); }); // second passage : tableau et bandes issus du fichier FIT (repli sur intervals.icu seulement s'il n'y a pas de fichier exploitable)
  }catch(e){ if(tok === SES.tok) box.innerHTML = `<div class="hint">${esc(errText(e))}</div>`; }
}
// Construit un FIT d'activité (avec courbes) depuis les flux intervals.icu ; null si l'activité n'a ni puissance ni FC
async function sesBuildFit(a){
  if(!a) return null;
  let j = null;
  for(const u of [`https://intervals.icu/api/v1/activity/${encodeURIComponent(a.id)}/streams?types=time,watts,heartrate,cadence,distance,velocity_smooth,fixed_altitude,altitude`, `https://intervals.icu/api/v1/activity/${encodeURIComponent(a.id)}/streams`]){
    try{ j = await icuFetch(u); if(j) break; }catch(e){}
  }
  const list = Array.isArray(j) ? j : (j && j.streams) || [], get = (...tys) => { for(const ty of tys){ const d = (list.find(x => x.type === ty) || {}).data; if(d && d.length) return d; } return null; };
  const w = get("watts", "power"), h = get("heartrate", "hr"), c = get("cadence"), d = get("distance"), v = get("velocity_smooth"), al = get("fixed_altitude", "altitude"), tm = get("time");
  const N = Math.max(...[w, h, c, d, v, al].map(x => x ? x.length : 0)); if(!N || (!(w && w.some(x => x > 0)) && !(h && h.some(x => x > 0)))) return null;
  const sd = a.start_date || (a.start_date_local ? String(a.start_date_local) : ""), iso = /(Z|[+-]\d\d:?\d\d)$/.test(sd) ? sd : sd.replace(/\.\d+$/, "") + "Z", st0 = Date.parse(iso) / 1000; if(!isFinite(st0)) return null;
  const pts = []; for(let i = 0; i < N; i++) pts.push({t: st0 + (tm && tm[i] != null ? tm[i] : i), p: w ? w[i] : null, h: h ? h[i] : null, c: c ? c[i] : null, d: d ? d[i] : null, s: v ? v[i] : null, a: al ? al[i] : null});
  if(pts.length < 2) return null;
  const bike = isBike(a.type || ""), indoor = !!a.trainer || /Virtual/.test(a.type || "");
  return buildActFit(pts, {sport: bike ? 2 : /Run/.test(a.type || "") ? 1 : /Swim/.test(a.type || "") ? 5 : 0, sub: bike && indoor ? 6 : 0});
}
// Ouvre une activité donnée dans l'analyse d'une séance (depuis le calendrier) : bon mois, bonne activité, onglet « Séance seule »
async function sesOpenAct(a){
  if(CAL.big) setCalMax(false); // le calendrier agrandi recouvre l'analyse
  const d = new Date((a.start_date_local || "").slice(0, 10) + "T12:00:00");
  SES.m = new Date(d.getFullYear(), d.getMonth(), 1); // défini avant applyMode : sesInit() ne recharge alors pas le mois courant
  store.set("si_sesid", String(a.id));
  const now = new Date(), off = (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth();
  sesUnder = true;
  if(mode === "calp" && CAL.m === off) document.querySelector('[data-block="ses"]').hidden = false; // déjà sur le bon mois : le calendrier n'est pas redessiné
  else{ CAL.m = off; mode = "calp"; store.set("si_mode", mode); applyMode(); }
  const toBox = () => { const l = document.querySelector('[data-block="ses"] .ses-lbl2'); if(l) l.scrollIntoView({behavior: "smooth", block: "start"}); };
  toBox();
  await sesMonth(true);
  toBox(); setTimeout(toBox, 400); // le détail de la séance est ciblé, pas le calendrier
}
$("sesClose").onclick = () => { sesUnder = false; document.querySelector('[data-block="ses"]').hidden = true; scrollTo({top: 0, behavior: "smooth"}); };
// lien « Reconstruire cette séance » de l'analyse : reconstruction dans l'aperçu (onglet « Depuis une activité »)
$("sesBox").addEventListener("click", async e => {
  const ai = e.target.closest && e.target.closest("#sesAi"); if(ai){ const x = SES.ai; if(x) analyzeAct(x.a, x.w, x.hr, ai); return; }
  const ex = e.target.closest && e.target.closest("[data-export]"); // export FIT : fichier généré par intervals.icu (repli : fichier d'origine)
  if(ex){
    e.preventDefault(); if(ex.dataset.busy) return; const a = (SES.list || []).find(x => String(x.id) === ex.dataset.export), txt = ex.textContent; ex.dataset.busy = "1"; ex.textContent = "…";
    try{
      const nm = ((a && a.start_date_local ? String(a.start_date_local).slice(0, 10) + " " : "") + ((a && (a.name || a.type)) || "activity")).replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
      // fichier généré ici à partir des flux (puissance, FC, cadence…) : l'export d'intervals.icu n'embarque pas toujours ces courbes, et Strava n'affiche alors rien
      let built = null; try{ built = await sesBuildFit(a); }catch(err){ console.warn("FIT", err); }
      if(built){ saveBlob(new Blob([built], {type: "application/octet-stream"}), nm + ".fit"); ex.textContent = txt; delete ex.dataset.busy; return; }
      let r = null;
      for(const u of ["fit-file", "file"]){ try{ const q = await icuRaw(`https://intervals.icu/api/v1/activity/${encodeURIComponent(ex.dataset.export)}/${u}`); if(q.ok){ r = q; break; } }catch(err){} }
      if(!r) throw new Error("export");
      const b = await r.blob(), u8 = new Uint8Array(await b.slice(0, 2).arrayBuffer()), gz = u8[0] === 0x1f && u8[1] === 0x8b;
      const l = document.createElement("a"); l.href = URL.createObjectURL(b); l.download = nm + (gz ? ".fit.gz" : ".fit"); document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(l.href), 4000);
      ex.textContent = txt;
    }catch(err){ ex.textContent = t("sesExpErr"); setTimeout(() => { ex.textContent = txt; }, 5000); }
    delete ex.dataset.busy; return;
  }
  const l = e.target.closest && e.target.closest("[data-rebuild]"); if(!l) return; e.preventDefault();
  const a = (SES.list || []).find(x => String(x.id) === l.dataset.rebuild); if(!a) return;
  if(mode !== "act"){ mode = "act"; store.set("si_mode", mode); applyMode(); }
  buildFromAct(a, {disabled: false});
});
