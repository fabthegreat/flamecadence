/* FlameCadence - intervals.icu access: direct API calls, FlameCadence backend mirror, profile and FTP helpers */
// ---------- intervals.icu ----------
// ---- Source des données : intervals.icu direct, ou backend FlameCadence (fca_api) d'abord / seul (Réglages > Backend) ----
// Tous les appels de données passent par icuFetch() (JSON) ou icuRaw() (Response : fichiers, écritures avec statut) : ils décident où va la requête.
// Les adresses restent écrites « intervals.icu » dans le code : le backend reprend la même forme d'API, seules quelques routes sont adaptées (beMap, beCurves).
const ICU_API = "https://intervals.icu/api/v1";
const beNorm = v => { let u = String(v || "").trim().replace(/\/+$/, "").replace(/\/api\/v1$/i, ""); if(u && !/^https?:\/\//i.test(u)) u = "https://" + u; return u; };
const beMixed = u => location.protocol === "https:" && /^http:\/\//i.test(u) && !/^http:\/\/(localhost|127\.\d+\.\d+\.\d+|\[::1\])(:|\/|$)/i.test(u);
class BeDown extends Error{}   // le backend ne répond pas (réseau, délai, 5xx, clé refusée) : on peut basculer sur intervals.icu
const BE = {
  mode(){ const m = store.get("si_bmode"); return m === "first" || m === "only" ? m : "icu"; },   // icu = comportement historique
  url(){ return beNorm(store.get("si_burl")); },
  key(){ return store.get("si_bkey").trim(); },
  on(){ return this.mode() !== "icu"; },   // mode choisi mais adresse vide : backend « injoignable » (en mode seul, jamais de bascule silencieuse sur intervals.icu)
  sig(){ return this.on() ? this.mode() + "@" + this.url() : "icu"; },
  wantWrites(){ return store.get("si_bwrite") === "be"; },
  down: 0, why: "", info: null, caps: {writes: false, known: false},
  isDown(){ return Date.now() < this.down; },                      // backend en panne : on ne réessaie qu'au bout d'une minute (sinon chaque requête attend le délai)
  setDown(why){ const was = this.isDown(); this.down = Date.now() + 60000; this.why = why; if(!was) beBarUpdate(); },
  setUp(){ if(this.down){ this.down = 0; beBarUpdate(); } },
  reset(){ this.down = 0; this.why = ""; this.info = null; this.caps = {writes: false, known: false}; beBarUpdate(); }
};
// KEY() = « une source de données est configurée » (clé intervals.icu ou backend) ; sa valeur change avec la source, ce qui invalide les caches (CAL_CACHE_KEY)
const ICUKEY = () => store.get("si_ikey"), AID = () => store.get("si_aid") || "0";
const KEY = () => ICUKEY() || BE.on() ? ICUKEY() + "|" + BE.sig() : "";
const ICU = {ftpIn: 0, ftpOut: 0, weight: 0, age: null, name: "", city: "", country: "", lthr: 0, maxHr: 0, loaded: false}, LAST = {}, NEXT = {ev: null, loaded: false, tok: 0};
const icuAuth = () => ({Authorization: "Basic " + btoa("API_KEY:" + ICUKEY())});
const icuUrl = path => `https://intervals.icu/api/v1/athlete/${encodeURIComponent(AID())}${path}`;
// File d'attente des appels intervals.icu : au démarrage, une dizaine de requêtes partaient en même temps (bien-être, courbes de puissance, événements, activités, flux…) et l'API répondait HTTP 429 (limitation de débit).
// Le navigateur affiche alors une « erreur CORS » : la réponse 429 n'a pas d'en-tête CORS, donc fetch() lève une TypeError au lieu de donner le statut.
// → 3 requêtes à la fois au maximum, espacées de 120 ms (≈ 8 par seconde) ; une lecture (GET) refusée est rejouée après une attente (Retry-After si fourni, sinon 1,5 s, 3 s, 6 s) et toute la file attend.
const ICUQ = {n: 0, q: [], t: 0, hold: 0, max: 3, base: 120, gap: 120}; // gap s'adapte : ×1,5 à chaque refus (max 400 ms), puis redescend de 4 ms par succès jusqu'à base
function icuPump(){
  while(ICUQ.n < ICUQ.max && ICUQ.q.length){
    ICUQ.n++; const go = ICUQ.q.shift(), now = Date.now(), at = Math.max(now, ICUQ.t + ICUQ.gap, ICUQ.hold);
    ICUQ.t = at; setTimeout(go, at - now);
  }
}
const icuSlot = () => new Promise(res => { ICUQ.q.push(res); icuPump(); });
const icuFree = () => { ICUQ.n--; icuPump(); };
async function icuDirect(url, opt){   // intervals.icu, avec file d'attente et reprise sur 429
  if(!ICUKEY()) throw new Error(t("keyMissing"));
  const method = (opt && opt.method) || "GET";
  for(let k = 0; ; k++){
    await icuSlot();
    let r = null, err = null;
    try{ r = await fetch(url, {headers: icuAuth(), ...(opt || {})}); }catch(e){ err = e; }finally{ icuFree(); }
    if(r && r.ok){ if(ICUQ.gap > ICUQ.base) ICUQ.gap = Math.max(ICUQ.base, ICUQ.gap - 4); return opt && opt.method === "DELETE" ? null : r.json(); }
    const limited = r ? r.status === 429 : err instanceof TypeError; // 429 : statut lisible ou TypeError (réponse sans en-tête CORS)
    if(limited) ICUQ.gap = Math.min(400, Math.round(ICUQ.gap * 1.5)); // refusé : on ralentit pour la suite
    if(limited && method === "GET" && k < (r ? 3 : 2)){
      const ra = r ? parseFloat(r.headers.get("Retry-After")) : NaN;
      ICUQ.hold = Math.max(ICUQ.hold, Date.now() + (isFinite(ra) ? Math.min(ra, 20) * 1000 : 1500 * Math.pow(2, k)));
      continue;
    }
    if(r) throw new Error("HTTP " + r.status);
    throw err;
  }
}

// ---- Répartition backend / intervals.icu ----
async function beFetch(path, opt){   // appel du backend (chemin sous /api/v1) ; renvoie la Response, ou lève BeDown si le backend est injoignable ou refuse la clé
  if(!BE.url()) throw new BeDown("no address");
  const o = {...(opt || {})}, ctl = new AbortController(), to = setTimeout(() => ctl.abort(), o.timeout || (/power-curve/.test(path) ? 40000 : 12000)); delete o.timeout;
  const headers = {...(o.headers || {})}; delete headers.Authorization; if(BE.key()) headers.Authorization = "Bearer " + BE.key();   // jamais la clé intervals.icu vers le backend
  let r;
  try{ r = await fetch(BE.url() + "/api/v1" + path, {...o, headers, signal: ctl.signal}); }
  catch(e){ throw new BeDown(e.name === "AbortError" ? "timeout" : "network"); }
  finally{ clearTimeout(to); }
  if(r.status >= 500 || r.status === 401 || r.status === 403) throw new BeDown("HTTP " + r.status);
  return r;
}
// chemin intervals.icu → chemin du backend (null : le backend ne sait pas le faire). Le backend ignore l'identifiant d'athlète : on envoie 0.
function beMap(base, qs){
  let m;
  if((m = base.match(/^\/athlete\/[^/]+((?:\/(?:sport-settings|activities|events|wellness)(?:\/[^/]+)?)?)$/))) return {path: "/athlete/0" + m[1] + qs};
  if(/^\/activity\/[^/]+$/.test(base)) return {path: base + qs};
  if((m = base.match(/^\/activity\/([^/]+)\/(?:file|fit-file)$/))) return {path: "/activity/" + m[1] + "/file"};   // fit-file (intervals.icu) = file (backend : le fichier d'origine)
  if((m = base.match(/^\/activity\/([^/]+)\/streams$/))){
    const want = (new URLSearchParams(qs).get("types") || "").split(",").map(x => x.trim()).filter(Boolean);
    const be = want.map(x => x === "fixed_altitude" ? "altitude" : x).filter((x, i, a) => a.indexOf(x) === i);   // le backend n'a que « altitude »
    return {path: base + (be.length ? "?types=" + be.join(",") : ""), streams: true, want};
  }
  return null;   // ex. /activity/{id}/intervals : pas (encore) dans le backend
}
function beStreamsFix(v, want){   // ajoute « fixed_altitude » (nom intervals.icu) comme copie d'« altitude »
  if(!Array.isArray(v) || (want.length && !want.includes("fixed_altitude"))) return v;
  const a = v.find(x => x && x.type === "altitude");
  if(a && !v.some(x => x && x.type === "fixed_altitude")) v.push({...a, type: "fixed_altitude"});
  return v;
}
// /power-curves?type=Ride&curves=42d,84d,1y (intervals.icu) → une requête /athlete/0/power-curve?oldest=&newest=&type= du backend par période, réponse {list: [{secs, watts, ...}]}
async function beCurves(qs){
  const qp = new URLSearchParams(qs), type = qp.get("type") || "", specs = (qp.get("curves") || "").split(",").map(x => x.trim()).filter(Boolean);
  const days = specs.map(x => { const m = x.match(/^(\d+)([dwy])$/i); return m ? +m[1] * ({d: 1, w: 7, y: 365})[m[2].toLowerCase()] : 0; });
  if(!specs.length || days.some(d => !d)) return null;   // forme de période inconnue (« all », saison…) : pas géré
  const list = await Promise.all(days.map(async d => {
    const q = new URLSearchParams({oldest: daysAgo(d), newest: daysAgo(0)}); if(type) q.set("type", type);
    const r = await beFetch("/athlete/0/power-curve?" + q);
    if(!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }));
  return {list};
}
// Ce qu'on a modifié nous-mêmes dans intervals.icu n'est pas encore dans la copie du backend (sauvegarde nocturne) : tant qu'elle n'est pas passée, ces lectures vont à intervals.icu
function beStale(base){
  if(BE.mode() !== "first" || !ICUKEY() || !/^\/(athlete\/[^/]+\/(events|activities)|activity\/)/.test(base)) return false;
  const d = +store.get("si_bdirty") || 0; if(!d) return false;
  const ls = BE.info && BE.info.last_sync ? Date.parse(BE.info.last_sync) : NaN;
  if(ls > d){ store.set("si_bdirty", ""); return false; }   // la sauvegarde a rattrapé la modification
  return Date.now() - d < 3 * 864e5;
}
async function beCaps(){ if(!BE.caps.known) await BE.refresh(); }
BE.refresh = async function(){   // état du backend : capacités (écritures), nombre de modifications en attente, date de la dernière sauvegarde
  if(!this.on()) return;
  if(!this.url()) return this.setDown("no address");
  try{
    const [s, h] = await Promise.all([beFetch("/backup/status").then(r => r.ok ? r.json() : null), fetch(this.url() + "/health").then(r => r.ok ? r.json() : null).catch(() => null)]);
    this.setUp(); this.info = s; this.caps = {writes: !!((h && h.writes) || (s && s.writes)), known: true}; beBarUpdate();
  }catch(e){ if(e instanceof BeDown) this.setDown(e.message); }
};
async function beWrite(p, opt){   // écriture vers le backend (si choisi dans les Réglages) : refusée, jamais détournée vers intervals.icu, s'il ne peut pas la prendre
  await beCaps();
  if(!BE.caps.writes) throw new Error(t("beWrNo"));
  if(BE.isDown()) throw new Error(t("beWrDown"));
  try{ const r = await beFetch(p.replace(/^\/athlete\/[^/]+/, "/athlete/0"), opt); BE.setUp(); return r; }
  catch(e){ if(e instanceof BeDown){ BE.setDown(e.message); throw new Error(t("beWrDown")); } throw e; }
}
async function beRoute(p, method, opt){   // → {v} si le backend a répondu ; null : laisser faire intervals.icu
  const only = BE.mode() === "only", q = p.indexOf("?"), base = q < 0 ? p : p.slice(0, q), qs = q < 0 ? "" : p.slice(q);
  const unavailable = why => { if(only) throw new Error(t("beOnlyDown", why)); return null; };
  const unsupported = () => { if(only) throw new Error(t("beNoRoute", base)); return null; };
  if(method !== "GET"){
    if(!BE.wantWrites()) return null;
    const r = await beWrite(p, opt);
    if(!r.ok) throw new Error("HTTP " + r.status);
    return {v: method === "DELETE" ? null : await r.json().catch(() => ({}))};
  }
  if(beStale(base)) return null;
  if(BE.isDown()) return unavailable(BE.why);
  try{
    if(/^\/athlete\/[^/]+\/power-curves$/.test(base)){ const v = await beCurves(qs); if(!v) return unsupported(); BE.setUp(); return {v}; }
    const bp = beMap(base, qs); if(!bp) return unsupported();
    const r = await beFetch(bp.path, opt); BE.setUp();
    if(r.ok){ const v = await r.json(); return {v: bp.streams ? beStreamsFix(v, bp.want) : v}; }
    if((r.status === 404 || r.status === 422) && !only && ICUKEY()) return null;   // pas (encore) dans la sauvegarde : intervals.icu le sait peut-être
    throw new Error("HTTP " + r.status);
  }catch(e){ if(e instanceof BeDown){ BE.setDown(e.message); return unavailable(e.message); } throw e; }
}
async function icuFetch(url, opt){   // JSON ; même contrat qu'avant (DELETE → null, erreur « HTTP nnn »)
  const method = (opt && opt.method) || "GET";
  if(BE.on() && url.startsWith(ICU_API)){ const r = await beRoute(url.slice(ICU_API.length), method, opt); if(r) return r.v; }
  const v = await icuDirect(url, opt);
  if(method !== "GET" && BE.on()) store.set("si_bdirty", String(Date.now()));
  return v;
}
async function icuRaw(url, opt){   // comme fetch() (renvoie la Response, l'appelant lit le statut) ; ajoute l'authentification
  opt = opt || {}; const method = opt.method || "GET";
  if(BE.on() && url.startsWith(ICU_API)){
    const p = url.slice(ICU_API.length), only = BE.mode() === "only", q = p.indexOf("?"), base = q < 0 ? p : p.slice(0, q);
    if(method !== "GET"){ if(BE.wantWrites()) return beWrite(p, opt); }
    else if(!beStale(base)){
      const bp = beMap(base, q < 0 ? "" : p.slice(q));
      if(!bp || bp.streams){ if(only) throw new Error(t("beNoRoute", base)); }
      else if(BE.isDown()){ if(only) throw new Error(t("beOnlyDown", BE.why)); }
      else{
        try{ const r = await beFetch(bp.path, opt); BE.setUp(); if(r.ok || only || !ICUKEY() || (r.status !== 404 && r.status !== 422)) return r; }
        catch(e){ if(!(e instanceof BeDown)) throw e; BE.setDown(e.message); if(only) throw new Error(t("beOnlyDown", e.message)); }
      }
    }
  }
  if(!ICUKEY()) throw new Error(t("keyMissing"));
  const r = await fetch(url, {...opt, headers: {...icuAuth(), ...(opt.headers || {})}});
  if(method !== "GET" && BE.on() && r.ok) store.set("si_bdirty", String(Date.now()));
  return r;
}

// ---- Réglages > Backend : affichage, test de connexion, bandeau d'état ----
function beUI(){
  const m = $("bmode").value, mk = {icu: "beMh0", first: "beMh1", only: "beMh2"}[m] || "beMh0";
  $("beF").hidden = m === "icu"; $("bmodeH").textContent = t(mk);
  $("burlW").hidden = !beMixed(beNorm($("burl").value));
  const wo = [...$("bwrite").options].find(o => o.value === "be"); if(wo) wo.disabled = BE.caps.writes !== true && $("bwrite").value !== "be";   // proposé seulement si le backend a annoncé les écritures (test de connexion)
}
async function beProbe(rawUrl, key){   // teste l'adresse et la clé saisies (sans les enregistrer) ; renvoie des lignes [classe, texte]
  const L = [], add = (c, k, ...a) => L.push([c, t(k, ...a)]), u = beNorm(rawUrl);
  if(!u){ add("err", "beNoUrl"); return {L, ok: false}; }
  if(!key){ add("err", "beNoKey"); return {L, ok: false}; }
  if(beMixed(u)) add("err", "beMixed");
  const get = async (path, auth) => {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 10000), t0 = performance.now();
    try{ const r = await fetch(u + path, {headers: auth ? {Authorization: "Bearer " + key} : {}, signal: ctl.signal}); return {r, ms: Math.round(performance.now() - t0)}; }
    finally{ clearTimeout(to); }
  };
  let h;
  try{ const x = await get("/health", false); if(!x.r.ok) throw new Error("HTTP " + x.r.status); h = await x.r.json(); add("ok", "beUp", h.version || "?", x.ms); }
  catch(e){ if(e.name === "AbortError") add("err", "timeout"); else if(e.name === "TypeError") add("err", "beNet", location.origin); else add("err", "err", e.message); return {L, ok: false}; }
  if(h.backup === false) add("err", "beNoBackup");
  try{
    const {r} = await get("/api/v1/backup/status", true);
    if(r.status === 401 || r.status === 403){ add("err", "beKeyBad"); return {L, ok: false}; }
    if(!r.ok) throw new Error("HTTP " + r.status);
    const s = await r.json(); add("ok", "beKeyOk");
    add("", "beCounts", s.activities, s.events, s.wellness, s.last_activity ? String(s.last_activity).slice(0, 10) : "–");
    const ls = s.last_sync ? Date.parse(s.last_sync) : NaN;
    if(isFinite(ls)){ const hrs = (Date.now() - ls) / 36e5; add(hrs > 36 ? "err" : "", "beSync", String(s.last_sync).slice(0, 16).replace("T", " "), hrs < 48 ? Math.max(0, Math.round(hrs)) + " h" : Math.round(hrs / 24) + " d"); if(hrs > 36) add("err", "beSyncOld"); }
    if(s.analysis) add("", "beAna", s.analysis.ok, s.analysis.pending, s.analysis.error);
    const w = !!(h.writes || s.writes); add("", w ? "beWrOn" : "beWrOff");
    if(s.outbox && (s.outbox.pending || s.outbox.failed)) add("", "beBarOut", s.outbox.pending || 0, s.outbox.failed || 0);
    return {L, ok: true, writes: w};
  }catch(e){ add("err", e.name === "AbortError" ? "timeout" : "err", e.message); return {L, ok: false}; }
}
function beBarUpdate(){   // bandeau en bas de page : backend injoignable (et ce qu'on fait à la place) ou modifications en attente d'envoi vers intervals.icu
  const bar = $("beBar"); if(!bar) return;
  let k = "", a = [];
  if(BE.on() && BE.down){ k = BE.mode() === "only" ? "beBarOnly" : ICUKEY() ? "beBarFb" : "beBarNoFb"; a = [BE.why]; }
  else if(BE.on() && BE.info && BE.info.outbox && (BE.info.outbox.pending > 0 || BE.info.outbox.failed > 0)){ k = "beBarOut"; a = [BE.info.outbox.pending || 0, BE.info.outbox.failed || 0]; }
  bar.hidden = !k; if(!k) return;
  $("beBarT").textContent = t(k, ...a); bar.className = k === "beBarOut" ? "" : "err"; $("beRetry").hidden = k === "beBarOut";
}
$("bmode").onchange = beUI; $("burl").oninput = beUI; $("bwrite").onchange = beUI;
$("betestb").onclick = async () => {
  const b = $("betestb"), box = $("betest"); b.disabled = true; box.textContent = t("loading");
  try{
    const R = await beProbe($("burl").value, $("bkey").value.trim());
    box.innerHTML = R.L.map(([c, x]) => `<div class="${c}">${c === "ok" ? "✓ " : c === "err" ? "✗ " : ""}${esc(x)}</div>`).join("");
    if(R.ok){ BE.caps = {writes: !!R.writes, known: true}; beUI(); }
  }catch(e){ box.innerHTML = `<div class="err">✗ ${esc(errText(e))}</div>`; }
  b.disabled = false;
};
$("beRetry").onclick = () => { BE.down = 0; beBarUpdate(); loadAll(); };
document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", beBarUpdate));

const icu = path => icuFetch(icuUrl(path));
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const pad = n => String(n).padStart(2, "0");
const hm = sec => { const m = Math.round(sec / 60); return m >= 60 ? Math.floor(m / 60) + "h" + pad(m % 60) : m + " min"; };
const mmss = sec => Math.floor(sec / 60) + ":" + pad(Math.round(sec) % 60);
const loc = () => lang === "fr" ? "fr-FR" : "en-GB";
const isBike = s => /Ride/.test(s);
// Source de vérité unique : le type de sortie détermine la FTP (home trainer / VirtualRide → FTP indoor, vélo extérieur → FTP outdoor ; repli sur l'autre si absente)
function ftpFor(sp){ const virt = sp === "VirtualRide"; return (virt ? ICU.ftpIn : ICU.ftpOut) || (virt ? ICU.ftpOut : ICU.ftpIn) || 0; }
function curFtp(){ return ftpFor($("sport").value); }
// Liens vers les pages intervals.icu correspondantes
const icuAthlete = () => ICU.id || AID();
const icuPage = path => `https://intervals.icu/athlete/${icuAthlete()}${path || ""}`;
function updateIcuLinks(){
  if(!KEY() || !icuAthlete()){ ["lkCal","lkFit","lkLoad","lkBest","lkLast","lkNext"].forEach(id => $(id).href = "https://intervals.icu"); return; }
  // semaine affichée dans le bloc calendrier (lundi de la semaine courante ou du 1er du mois visionné)
  const ref = CAL.m ? calFirst(CAL.m) : new Date();
  const mon = new Date(ref); mon.setDate(ref.getDate() - ((ref.getDay() + 6) % 7));
  $("lkCal").href = "https://intervals.icu/?w=" + iso(mon);
  $("lkFit").href = "https://intervals.icu/fitness";
  $("lkLoad").href = icuPage("");
  $("lkBest").href = "https://intervals.icu/power";
  const nd = NEXT.ev ? (NEXT.ev.start_date_local || "").slice(0, 10) : "";
  if(nd){ const d = new Date(nd + "T12:00:00"); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); $("lkNext").href = "https://intervals.icu/?w=" + iso(d); }
  else $("lkNext").href = "https://intervals.icu";
  $("lkLast").href = LAST.last && LAST.last.id ? "https://intervals.icu/activities/" + encodeURIComponent(LAST.last.id) : icuPage("/activities");
}
// Le lien de la dernière séance est aussi recalculé au survol / focus / clic à partir de l'activité réellement affichée
// (évite tout décalage si l'affichage a changé entre-temps ; fonctionne aussi pour le clic molette et « ouvrir dans un nouvel onglet »)
{ const fixLast = () => { const a = LAST.last; if(a && a.id != null) $("lkLast").href = "https://intervals.icu/activities/" + encodeURIComponent(String(a.id).trim()); };
  ["pointerdown", "mouseenter", "focus", "click", "contextmenu"].forEach(ev => $("lkLast").addEventListener(ev, fixLast)); }
// Libellés des sélecteurs de type de sortie : « Vélo indoor (FTP 240 W) » / « Vélo extérieur (FTP 250 W) »
function fillFtp(){
  const lab = (k, f) => t(k) + (f ? ` (FTP ${f} W)` : "");
  ["sport", "edsport", "psport", "libsport"].forEach(id => {
    const el = $(id); if(!el) return;
    [...el.options].forEach(o => { o.textContent = o.value === "VirtualRide" ? lab("sVirt", ftpFor("VirtualRide")) : lab("sRide", ftpFor("Ride")); });
  });
  try{ runFtpUI(); if(RUN && RUN.ftpAt && RUN.ftpAt !== runFtp() && !RUN.began){ RUN.at = 0; runList(true); } }catch(e){} // FTP chargée après la liste des séances : cibles recalculées
}
// Panneau « Utilisateur » des réglages (lecture seule, données intervals.icu)
function profText(){
  const box = $("userbox"); if(!box) return;
  if(!KEY()){ box.innerHTML = `<div class="hint">${esc(t("userNeed"))}</div>`; return; }
  if(LAST.profErr){ box.innerHTML = `<div class="hint err">${esc(t("errI", LAST.profErr))}</div>`; return; }
  if(!ICU.loaded){ box.innerHTML = `<div class="hint">${esc(t("loading"))}</div>`; return; }
  const kg = ICU.weight, dash = "–";
  const ftp = f => f ? f + " W" + (kg ? " · " + (f / kg).toFixed(2) + " W/kg" : "") : dash;
  const rows = [
    ICU.name ? [t("userName"), ICU.name] : null,
    [t("userWeight"), kg ? kg + " kg" : dash],
    [t("userAge"), ICU.age ? t("age", ICU.age) : dash],
    [t("userFtpIn"), ftp(ICU.ftpIn)],
    [t("userFtpOut"), ftp(ICU.ftpOut)],
    ICU.lthr ? [t("userLthr"), ICU.lthr + " bpm"] : null,
    ICU.maxHr ? [t("userMaxHr"), ICU.maxHr + " bpm"] : null
  ].filter(Boolean);
  box.innerHTML = `<div class="ukv">` + rows.map(([k, v]) => `<span>${esc(k)}</span><b>${esc(v)}</b>`).join("") + `</div>`;
}
async function loadProfile(){
  const a = await icu("");
  ICU.id = a.id;
  const rideSet = x => (x.types || []).includes("Ride");
  let ss = (a.sportSettings || []).find(rideSet);
  if(!ss){ try{ ss = (await icu("/sport-settings")).find(rideSet); }catch(e){} }
  ICU.ftpOut = (ss && ss.ftp) || 0; ICU.ftpIn = (ss && (ss.indoor_ftp || ss.ftp)) || 0;
  ICU.lthr = (ss && ss.lthr) || 0; ICU.maxHr = (ss && ss.max_hr) || 0;
  ICU.name = a.name || [a.firstname, a.lastname].filter(Boolean).join(" "); ICU.city = a.city || ""; ICU.country = a.country || "";
  ICU.weight = a.icu_weight || a.weight || 0;
  const dob = a.icu_date_of_birth || a.date_of_birth || a.birthdate;
  ICU.age = dob ? Math.floor((Date.now() - new Date(dob)) / 31557600000) : null;
  ICU.loaded = true; LAST.profErr = ""; fillFtp(); profText(); updateIcuLinks();
  wxAuto().catch(() => {}); // lieu météo déduit de la ville du profil, une seule fois
}

