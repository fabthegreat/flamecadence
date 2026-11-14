/* FlameCadence - Past-workout comparator (shape search + stream overlay), local cache */
// ---------- Comparateur de séances passées (recherche par forme + superposition des flux) ----------
const CMP = {pat: null, hits: [], sel: new Set(), streams: {}, mode: "series", busy: false, stop: false, view: {a: 0, b: 1}};
const CMP_COLORS = ["#0f6e6e", "#d6336c", "#3b82c9", "#c9a227", "#8e44ad", "#e4572e", "#1d7a3a", "#4a90d9"];
const CMP_TOL = {w: 1.35, r: 1.45}; // tolérance « ish » : ±35 % sur l'effort, ±45 % sur la récupération
const cmpSec = s => s >= 90 ? Math.round(s / 6) / 10 + " min" : Math.round(s) + " s";
const cmpAvg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
// Forme : "10x1'/1'", "8-12x4'", "1'", "50s-70s/20s", "30/30" (nombres nus ≥ 15 des deux côtés = secondes), "1'30", "1:30"
function cmpParse(q){
  const s = String(q || "").toLowerCase().replace(/[\u2019\u2032\u00b4`\u2018]/g, "'").replace(/[\u2033\u201d\u201c]/g, '"').replace(/''/g, '"')
    .replace(/[\u00d7*]/g, "x").replace(/[\u2013\u2014\u2212]/g, "-").replace(/[~\u2248]/g, "").replace(/,/g, ".").replace(/\s+/g, "");
  const m = s.match(/^(?:(\d{1,3})(?:-(\d{1,3}))?x)?([^/]+)(?:\/([^/]+))?$/);
  if(!m) return null;
  const UNIT = /(min|mn|m|'|sec|s|")$/;
  const one = (x, u) => {
    let k = x.match(/^(\d+):(\d{1,2})$/) || x.match(/^(\d+)'(\d{1,2})"?$/);
    if(k) return +k[1] * 60 + +k[2];
    k = x.match(/^(\d+(?:\.\d+)?)(min|mn|m|'|sec|s|")?$/);
    if(!k) return null;
    return Math.round(parseFloat(k[1]) * (/^(s|sec|")$/.test(k[2] || u) ? 1 : 60));
  };
  const rng = (part, u) => {
    const own = (part.match(UNIT) || [])[1], items = part.split("-");
    if(items.length > 2) return null;
    const v = items.map(i => one(i, own || u));
    if(v.some(x => x == null || x < 5 || x > 5400) || (v[1] != null && v[1] < v[0])) return null;
    return [v[0], v[1] != null ? v[1] : v[0]];
  };
  const parts = [m[3], m[4]].filter(Boolean);
  const bare = parts.every(p => /^[\d.\-]+$/.test(p)) && m[4];
  const dflt = bare && parts.join("-").split("-").every(v => parseFloat(v) >= 15) ? "s" : "'";
  const w = rng(m[3], dflt);
  if(!w) return null;
  const wu = (m[3].match(UNIT) || [])[1];
  const r = m[4] ? rng(m[4], wu || dflt) : null;
  if(m[4] && !r) return null;
  let repMin = null, repMax = null;
  if(m[1] !== undefined){ repMin = parseInt(m[1], 10); repMax = m[2] !== undefined ? parseInt(m[2], 10) : repMin; if(!repMin || repMax < repMin) return null; }
  return {repMin, repMax, wMin: w[0], wMax: w[1], rMin: r ? r[0] : null, rMax: r ? r[1] : null};
}
// flux d'une activité : types valides côté API = watts, heartrate, cadence ("cad" était refusé → toutes les activités sautées en silence)
// --- Cache persistant des flux (IndexedDB) : une activité passée ne change pas, on ne la télécharge qu'une fois.
// Stockage compact en entiers typés à 1 Hz (puissance Int16, FC/cadence Uint8) : la détection des efforts courts reste exacte.
const SC = {p: null, hits: 0};
function scDb(){
  if(SC.p) return SC.p;
  return SC.p = new Promise(res => {
    try{ const r = indexedDB.open("paceforge_streams", 1); r.onupgradeneeded = () => r.result.createObjectStore("s"); r.onsuccess = () => res(r.result); r.onerror = r.onblocked = () => res(null); }
    catch(e){ res(null); }
  });
}
async function scOp(mode, fn){
  const db = await scDb(); if(!db) return null;
  return new Promise(res => { try{ const q = fn(db.transaction("s", mode).objectStore("s")); q.onsuccess = () => res(q.result === undefined ? true : q.result); q.onerror = () => res(null); }catch(e){ res(null); } });
}
const scGet = id => scOp("readonly", st => st.get(String(id)));
const scPut = (id, v) => scOp("readwrite", st => st.put(v, String(id))).then(r => { cacheTick(); return r; });
const scClear = () => scOp("readwrite", st => st.clear());
const scPack = r => ({
  w: r.w ? Int16Array.from(r.w, v => { v = +v; return v > 0 ? v : 0; }) : null,
  hr: r.hr ? Uint8Array.from(r.hr, v => { v = +v; return v > 0 ? Math.min(255, v) : 0; }) : null,
  cad: r.cad ? Uint8Array.from(r.cad, v => { v = +v; return v > 0 ? Math.min(255, v) : 0; }) : null
});
const scUnpack = c => ({w: c.w ? Array.from(c.w) : null, hr: c.hr ? Array.from(c.hr) : null, cad: c.cad ? Array.from(c.cad) : null});
// Indicateur discret de l'espace occupé par le cache (pied de page + comparateur) : somme des tableaux typés stockés
const scSize = v => v && typeof v === "object" ? Object.values(v).reduce((n, x) => n + (x && typeof x.byteLength === "number" ? x.byteLength : 8), 0) : 8;
async function cacheStats(){
  const db = await scDb(); if(!db) return null;
  return new Promise(res => {
    try{
      let n = 0, b = 0; const rq = db.transaction("s", "readonly").objectStore("s").openCursor();
      rq.onsuccess = () => { const c = rq.result; if(!c) return res({n, b}); n++; b += scSize(c.value) + String(c.key).length; c.continue(); };
      rq.onerror = () => res(null);
    }catch(e){ res(null); }
  });
}
const fmtBytes = b => { const u = lang === "fr" ? ["Ko", "Mo", "Go"] : ["KB", "MB", "GB"], f = (v, d) => v.toLocaleString(loc(), {maximumFractionDigits: d}); return b < 1048576 ? f(Math.round(b / 1024), 0) + " " + u[0] : b < 1073741824 ? f(b / 1048576, 1) + " " + u[1] : f(b / 1073741824, 2) + " " + u[2]; };
let cacheT = 0;
function cacheTick(ms){ clearTimeout(cacheT); cacheT = setTimeout(cacheRefresh, ms === undefined ? 2500 : ms); } // regroupe les mises à jour pendant un scan
async function cacheRefresh(){
  const els = document.querySelectorAll(".cacheinfo"); if(!els.length) return;
  const st = await cacheStats();
  let use = 0, quota = 0; try{ if(navigator.storage && navigator.storage.estimate){ const e = await navigator.storage.estimate(); use = e.usage || 0; quota = e.quota || 0; } }catch(e){}
  els.forEach(el => { el.hidden = !st; if(st){ el.textContent = t("cacheUse", fmtBytes(st.b), st.n); el.title = t("cacheTip", fmtBytes(use), quota ? fmtBytes(quota) : "?"); } });
}
const scFresh = a => !!(a && a.start_date_local && Date.now() - new Date(a.start_date_local).getTime() < 2 * 864e5); // trop récente : peut encore être retraitée
// Filtre souple : une sortie très régulière (indice de variabilité ≈ 1) ne contient pas de blocs d'intervalles.
// Appliqué uniquement aux formes avec répétitions ou récupération ; sans données de puissance, on ne l'écarte pas.
function cmpSteady(a, pat){
  if(!pat || !(pat.rMin != null || pat.repMin >= 2)) return false;
  const np = a.icu_weighted_avg_watts, ap = a.icu_average_watts || a.average_watts;
  const vi = a.icu_variability_index || (np && ap ? np / ap : 0);
  return vi > 0 && vi < 1.03;
}
const cmpExtra = (nSkip, err) => (nSkip ? " · " + t("cmpSkip", nSkip) : "") + (SC.hits ? " · " + t("cmpCached", SC.hits) : "") + (err ? " (" + err + ")" : "");
// cadence commune des requêtes de flux : espacement minimal + pause partagée quand intervals.icu limite le débit
const CMPNET = {next: 0, until: 0, gap: 30};
async function cmpGate(){ const now = Date.now(), at = Math.max(now, CMPNET.until, CMPNET.next); CMPNET.next = at + CMPNET.gap; if(at > now) await new Promise(r => setTimeout(r, at - now)); }
// une même activité demandée deux fois en même temps (survol puis clic, préchargement puis ouverture) ne déclenche qu'une requête
function cmpStreams(id, a){
  if(CMP.streams[id]) return Promise.resolve(CMP.streams[id]);
  const P = CMP.pend = CMP.pend || {};
  return P[id] || (P[id] = cmpStreamsRaw(id, a).finally(() => { delete P[id]; }));
}
async function cmpStreamsRaw(id, a){
  if(CMP.streams[id]) return CMP.streams[id];
  const c = await scGet(id);
  if(c && c !== true && (c.w || c.hr || c.cad || c.none)){ SC.hits++; return CMP.streams[id] = scUnpack(c); }
  let list = null, err = null;
  for(const u of [`https://intervals.icu/api/v1/activity/${id}/streams?types=watts,heartrate,cadence`, `https://intervals.icu/api/v1/activity/${id}/streams`]){
    for(let n = 0; n < 6 && !list; n++){
      await cmpGate();
      try{ list = await icuFetch(u); CMPNET.gap = Math.max(30, CMPNET.gap * .8); }
      catch(e){
        err = e; const m = String(e.message || e);
        // une limitation de débit (429) est souvent vue par le navigateur comme une erreur réseau (TypeError) : on réessaie aussi dans ce cas
        if(!(e instanceof TypeError || /HTTP (429|5\d\d)/.test(m))) break;
        const back = Math.min(8000, 500 * 2 ** n) * (.75 + Math.random() * .5);
        CMPNET.until = Math.max(CMPNET.until, Date.now() + back); CMPNET.gap = Math.min(600, CMPNET.gap * 1.5 + 30); // pause commune à tous les workers + cadence ralentie
      }
    }
    if(list) break;
  }
  if(!list) throw err || new Error("no streams");
  list = Array.isArray(list) ? list : list.streams || [];
  const get = (...tys) => { for(const ty of tys){ const d = (list.find(x => x.type === ty) || {}).data; if(d && d.length) return d; } return null; };
  const pk = scPack({w: get("watts", "power", "watts_calc"), hr: get("heartrate", "heart_rate", "hr"), cad: get("cadence", "cad")});
  pk.none = !(pk.w || pk.hr || pk.cad);
  if(!scFresh(a)) scPut(id, pk);
  return CMP.streams[id] = scUnpack(pk);
}
// --- détection : lissage centré, seuil LOCAL (milieu entre p10 et p95 d'une fenêtre glissante) → insensible à l'échauffement,
// à la FTP et à la durée de la sortie ; la fenêtre est dimensionnée sur le cycle demandé (+ 2 échelles de repli).
function cmpSmooth(a, k){
  const n = a.length, o = new Float32Array(n), h = k >> 1; let sum = 0, lo = 0, hi = -1;
  for(let i = 0; i < n; i++){ const L = Math.max(0, i - h), R = Math.min(n - 1, i + h); while(hi < R) sum += a[++hi]; while(lo < L) sum -= a[lo++]; o[i] = sum / (R - L + 1); }
  return o;
}
function cmpLocalThr(sm, L){
  const n = sm.length, st = Math.max(2, L >> 4), pts = [];
  for(let c = 0; ; c += st){
    const cc = Math.min(c, n - 1), a = Math.max(0, cc - (L >> 1)), b = Math.min(n, cc + (L >> 1)), step = Math.max(1, Math.floor((b - a) / 240)), v = [];
    for(let i = a; i < b; i += step) v.push(sm[i]);
    v.sort((x, y) => x - y);
    const q = p => v[Math.min(v.length - 1, Math.floor(p * v.length))];
    pts.push([cc, (q(.1) + q(.95)) / 2, q(.95) - q(.1)]);
    if(cc >= n - 1) break;
  }
  const mid = new Float32Array(n), amp = new Float32Array(n); let k = 0;
  for(let i = 0; i < n; i++){
    while(k < pts.length - 2 && pts[k + 1][0] <= i) k++;
    const p = pts[k], p2 = pts[Math.min(k + 1, pts.length - 1)], f = p2[0] > p[0] ? (i - p[0]) / (p2[0] - p[0]) : 0;
    mid[i] = p[1] + (p2[1] - p[1]) * f; amp[i] = p[2] + (p2[2] - p[2]) * f;
  }
  return {mid, amp};
}
function cmpSegs(sm, L, wMin){
  const {mid, amp} = cmpLocalThr(sm, L), n = sm.length, gap = Math.max(3, Math.min(10, Math.round(wMin * .12))), minLen = Math.max(5, Math.round(wMin * .4)), runs = [];
  let st = -1;
  for(let i = 0; i <= n; i++){
    const on = i < n && sm[i] > mid[i] && amp[i] >= Math.max(30, .2 * mid[i]);
    if(on && st < 0) st = i;
    if(!on && st >= 0){ const p = runs[runs.length - 1]; if(p && st - p.end - 1 <= gap) p.end = i - 1; else runs.push({start: st, end: i - 1}); st = -1; }
  }
  return runs.filter(g => g.end - g.start + 1 >= minLen);
}
// séries : segments successifs alignés sur une « grille » régulière (période = médiane des écarts entre débuts de reps).
// Une rep ratée (puissance qui lâche → segment raccourci) ou manquante (saut d'une période) ne coupe pas la série.
function cmpRuns(segs, pat){
  const d = g => g.end - g.start + 1, wLo = pat.wMin / CMP_TOL.w, wHi = pat.wMax * CMP_TOL.w, weakLo = Math.max(8, pat.wMin * .3);
  const hasR = pat.rMin != null, rLo = hasR ? pat.rMin / CMP_TOL.r : 0, rHi = hasR ? pat.rMax * CMP_TOL.r : Math.max(90, pat.wMax * 3);
  const runs = []; let cur = [];
  const end = () => { if(cur.length) runs.push(cur); cur = []; };
  for(const g of segs){
    const strong = d(g) >= wLo && d(g) <= wHi;
    if(cur.length >= 2){
      const df = cur.slice(1).map((x, i) => x.start - cur[i].start).sort((a, b) => a - b), P = df[df.length >> 1];
      const dt = g.start - cur[cur.length - 1].start, k = Math.round(dt / P);
      if((k === 1 || k === 2) && Math.abs(dt - k * P) <= .3 * P && d(g) >= (strong ? 0 : weakLo) && d(g) <= wHi){ cur.push(strong ? g : {...g, weak: true}); continue; }
      end();
    }else if(cur.length === 1){
      const gp = g.start - cur[0].end - 1;
      if(strong && gp >= rLo && gp <= rHi){ cur.push(g); continue; }
      end();
    }
    if(strong) cur.push(g);
  }
  end();
  return runs;
}
// note de qualité 0-100 : écart à la forme, régularité, nombre de reps ; rejette les surges aléatoires.
// Une 1re rep nettement plus faible que les suivantes (échauffement / ouvreur) est retirée ; une baisse en fin de série est conservée (fatigue).
function cmpScore(run0, pat, s, minReps){
  const P0 = g => cmpMean(s, g.start, g.end) || 0, med = a => { const o = [...a].sort((x, y) => x - y); return o.length ? o[o.length >> 1] : 0; };
  const run = run0.slice();
  while(run.length > 2 && (run[0].weak || P0(run[0]) < .8 * med(run.slice(1).map(P0)))) run.shift();
  const cnt = run.length; if(cnt < minReps) return null;
  const strong = run.filter(g => !g.weak);
  if(cnt > 1 && strong.length < Math.max(2, Math.ceil(cnt * .6))) return null;
  const d = strong.map(g => g.end - g.start + 1), gaps = [];
  for(let k = 1; k < cnt; k++) gaps.push(run[k].start - run[k - 1].end - 1);
  const cv = a => { if(a.length < 2) return 0; const m = cmpAvg(a); return m ? Math.sqrt(cmpAvg(a.map(v => (v - m) ** 2))) / m : 1; };
  const mw = cmpAvg(d), mr = gaps.length ? med(gaps) : 0, pw = run.map(P0);
  const rp = gaps.map((_, k) => cmpMean(s, run[k].end + 1, run[k + 1].start - 1) || 0);
  const cvW = cv(d), cvP = cv(pw), contrast = rp.length ? med(pw) / Math.max(1, med(rp)) : 9;
  if(cvW > .4 || cvP > .4 || contrast < 1.2) return null;
  const dist = (v, lo, hi) => v < lo ? Math.log(lo / v) : v > hi ? Math.log(v / hi) : 0;
  let pen = .3 * Math.min(1, dist(mw, pat.wMin, pat.wMax) / Math.log(CMP_TOL.w)) + .3 * Math.min(1, (cvW + cvP) / .5) + .1 * (cnt - strong.length) / cnt;
  if(pat.rMin != null && gaps.length) pen += .2 * Math.min(1, dist(mr, pat.rMin, pat.rMax) / Math.log(CMP_TOL.r));
  if(pat.repMin != null) pen += .2 * Math.min(1, Math.max(0, pat.repMin - cnt, cnt - pat.repMax) / 3);
  return {q: Math.round(100 * (1 - Math.min(1, pen))), win: run, cnt, mw, mr, pw};
}
function cmpDetect(wRaw, pat){
  if(!wRaw || wRaw.length < 120) return null;
  const s = Float32Array.from(wRaw, v => typeof v === "number" && v >= 0 && v < 2500 ? v : 0), sm = cmpSmooth(s, pat.wMin < 30 ? 3 : 5);
  const cyc = (pat.wMin + pat.wMax) / 2 + (pat.rMin != null ? (pat.rMin + pat.rMax) / 2 : pat.wMax);
  const minReps = pat.repMin != null ? Math.max(pat.repMin === 1 ? 1 : 2, pat.repMin - 2) : pat.wMin >= 300 ? 3 : 5; // sans nombre demandé : au moins 5 reps courtes (3 si efforts longs)
  let best = null;
  for(const L of [Math.min(1500, Math.max(150, cyc * 3)), Math.min(2400, Math.max(400, cyc * 8)), s.length]){
    for(const run of cmpRuns(cmpSegs(sm, L, pat.wMin), pat)){
      const sc = cmpScore(run, pat, s, minReps);
      if(sc && (!best || sc.q + .1 * sc.cnt > best.q + .1 * best.cnt)) best = sc;
    }
  }
  return best;
}
// recherche par nom seul : la forme est déduite du flux (meilleure série régulière sur plusieurs durées d'effort) ;
// sans structure détectée, la séance est quand même listée, comme un seul bloc (note 0)
function cmpAuto(w){
  let best = null;
  for(const W of [20, 30, 45, 60, 90, 120, 180, 240, 300, 480, 600, 900, 1200]){
    const m = cmpDetect(w, {repMin: null, repMax: null, wMin: W * .85, wMax: W * 1.15, rMin: null, rMax: null});
    if(m && (!best || m.q + .3 * m.cnt > best.q + .3 * best.cnt)) best = m;
  }
  if(best || !w || w.length < 2) return best;
  return {q: 0, win: [{start: 0, end: w.length - 1}], cnt: 1, mw: w.length, mr: 0, pw: [cmpMean(w, 0, w.length - 1) || 0]};
}
// type de séance d'après l'intensité moyenne des intervalles d'effort, en % de la FTP
const CMP_ZONES = {rec: ["Recovery", "Récupération"], end: ["Endurance", "Endurance"], tem: ["Tempo", "Tempo"], ss: ["Sweet spot", "Sweet spot"], th: ["Threshold", "Seuil"], vo2: ["VO2max", "VO2max"], an: ["Anaerobic", "Anaérobie"]};
function cmpZone(pct){ return pct < 70 ? "rec" : pct < 82 ? "end" : pct < 89 ? "tem" : pct < 95 ? "ss" : pct < 106 ? "th" : pct < 150 ? "vo2" : "an"; }
const cmpZoneLbl = z => (CMP_ZONES[z] || ["", ""])[lang === "fr" ? 1 : 0];
function cmpActFtp(a){ const virt = a.type === "VirtualRide"; return (virt ? ICU.ftpIn : ICU.ftpOut) || (virt ? ICU.ftpOut : ICU.ftpIn) || 0; }
function cmpMean(arr, a, b){
  if(!arr || !arr.length) return null;
  const off = b - a >= 25 ? 4 : 0, lo = Math.max(0, a + off), hi = Math.min(arr.length - 1, b - off);
  let s = 0, c = 0;
  for(let i = lo; i <= hi; i++){ const v = arr[i]; if(typeof v === "number" && !isNaN(v)){ s += v; c++; } }
  return c ? s / c : null;
}
// Champ unique : le premier jeton qui ressemble à une forme (10x1'/1', 3m, 30/30…) est la forme,
// les autres mots filtrent le nom de l'activité.
function cmpSplitQ(q){
  const n = String(q || "").replace(/(\d['"\u2019\u2032\u2033]?|min|mn|sec|s)\s*([x\u00d7*\/])\s*(?=\d)/gi, "$1$2");
  const toks = n.split(/\s+/).filter(Boolean);
  let pat = null; const words = [];
  for(const tk of toks){
    if(!pat && /[x\u00d7*\/:'"\u2019\u2032\u2033]|\d(min|mn|m|sec|s)$/i.test(tk)){ const pp = cmpParse(tk); if(pp){ pat = pp; continue; } }
    words.push(cmpNorm(tk));
  }
  return {pat, words};
}
async function cmpSearch(){
  if(CMP.busy){ CMP.stop = true; return; }
  const QR = cmpSplitQ($("cmpq").value), pat = QR.pat;
  if(!pat && !QR.words.length) return say("cmpBadQ", "err"); // ni forme ni nom
  if(!KEY()) return say("needI", "err");
  CMP.busy = true; CMP.stop = false; $("rcmp").textContent = t("stopGen");
  CMP.view = {a: 0, b: 1}; $("cmpnav").style.display = "none"; CMP.pat = pat; CMP.hits = []; CMP.sel = new Set();
  $("cmpbox").innerHTML = ""; scanProg($("cmpstat"), 0, 0); $("cmpchart").innerHTML = ""; $("cmptable").innerHTML = ""; $("cmpinfo").textContent = "";
  let nAct = 0, nPow = 0, nBad = 0, nSkip = 0, lastErr = ""; SC.hits = 0;
  try{
    const days = parseInt($("cmpper").value, 10) || 180, type = $("cmptype").value, place = $("cmpplace").value;
    const acts = await icu(`/activities?oldest=${daysAgo(days)}&newest=${daysAgo(0)}`);
    const nq = QR.words;
    const Q = acts.filter(a => nq.every(w => cmpNorm(a.name).includes(w))).filter(a => place === "any" || (place === "in") === cmpIndoor(a)).filter(a => a.moving_time >= (pat ? pat.wMin * (pat.repMin === 1 ? 1 : 2) : 60) && (a.icu_average_watts || a.average_watts))
      .filter(a => !cmpSteady(a, pat) || (nSkip++, false)).sort((x, y) => x.start_date_local < y.start_date_local ? 1 : -1).slice(0, 1200);
    nAct = Q.length; let done = 0; scanProg($("cmpstat"), 0, nAct);
    const worker = async () => {
      while(Q.length && !CMP.stop){
        const a = Q.shift();
        try{
          const s = await cmpStreams(a.id, a);
          if(!s.w) nBad++;
          else{
            nPow++;
            const m = pat ? cmpDetect(s.w, pat) : cmpAuto(s.w);
            if(m){
              const avgP = cmpAvg(m.pw), ftp = cmpActFtp(a), pct = ftp ? avgP / ftp * 100 : 0;
              if(type === "any" || (pct && [pct, pct - 4, pct + 4].some(p => cmpZone(p) === type)))
                CMP.hits.push({a, s, ...m, avgP, zone: pct ? cmpZone(pct) : null, pct, drop: m.pw.length > 1 && m.pw[0] ? (m.pw[m.pw.length - 1] / m.pw[0] - 1) * 100 : 0});
            }
          }
        }catch(e){ nBad++; lastErr = String(e.message || e); }
        scanProg($("cmpstat"), ++done, nAct);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    CMP.hits.sort((x, y) => x.a.start_date_local < y.a.start_date_local ? 1 : -1);
    [...CMP.hits].sort((x, y) => y.q - x.q).slice(0, 5).forEach(h => CMP.sel.add(h.a.id));
    if(!CMP.hits.length) say("cmpNone", "info"); else say("cmpNres", "ok", CMP.hits.length);
    cmpRender();
  }catch(e){ say("errI", "err", errText(e)); }
  $("cmpstat").textContent = t("cmpDiag", nAct, nPow, nBad, cmpExtra(nSkip, lastErr));
  $("rcmp").textContent = t("cmpSearch"); CMP.busy = false;
}
function winMean(h, key){
  const v = h.win.map(g => cmpMean(h.s[key], g.start, g.end)).filter(x => x != null);
  return v.length ? cmpAvg(v) : 0;
}
function cmpRender(){
  const box = $("cmpbox");
  CMP.hits.forEach((h, i) => h.col = CMP_COLORS[i % CMP_COLORS.length]);
  if(!CMP.hits.length){ box.innerHTML = `<p class="hint">${esc(t("cmpNone"))}</p>`; $("cmpchart").innerHTML = ""; $("cmptable").innerHTML = ""; $("cmpnav").style.display = "none"; return; }
  box.innerHTML = "";
  cmpChart();
}
// moyenne par tranche (évite le crénelage d'un simple échantillonnage)
function cmpBin(arr, a, b, N, z){
  const o = [];
  for(let k = 0; k < N; k++){
    const lo = Math.round(a + k * (b - a) / N), hi = Math.max(lo + 1, Math.round(a + (k + 1) * (b - a) / N)); let s = 0, c = 0;
    for(let i = lo; i < hi && i < arr.length; i++){ const v = arr[i]; if(typeof v === "number" && !isNaN(v) && v >= (z ? 0 : 1)){ s += v; c++; } }
    o.push(c ? s / c : null);
  }
  return o;
}
const cmpIndoor = a => a.trainer === true || a.type === "VirtualRide" || /virtual|trainer|indoor|zwift/i.test(a.sub_type || "");
const cmpNorm = x => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const cmpNameOk = h => { const n = cmpNorm(h.a.name || h.a.type); return cmpNorm($("cmpname").value).split(/\s+/).filter(Boolean).every(w => n.includes(w)); };
const SYSTEM_PROGRESS = "You are an experienced cycling coach. You receive a chronological table of comparable interval sessions done by the same athlete (date, indoor/outdoor, reps, work and rest durations, average power during the work intervals, % of FTP, power drop from first to last rep, heart rate, cadence, power-to-HR ratio, match quality). Judge whether the athlete is progressing on this type of session: look at power at equal effort, heart rate for the same power, fade across reps, consistency, and flag when indoor and outdoor sessions are mixed or the sessions are not really comparable. Be honest: say 'no clear trend' if the data does not show one. Address the athlete as 'you'. Use exactly this markdown: \n## Verdict\n(1-2 sentences)\n## Evidence\n(3-4 bullets with concrete numbers and dates)\n## Caveats\n(1-2 bullets)\n## Next step\n(1-2 concrete suggestions). Put the final answer only inside <answer></answer>.";
function cmpRows(){ // lignes du tableau, ordre chronologique : sélection, sinon tout ce qui correspond au filtre
  const hm_ = h => { let m = 0; if(h.s.hr) for(const g of h.win) for(let i = g.start; i <= g.end && i < h.s.hr.length; i++) if(h.s.hr[i] > m) m = h.s.hr[i]; return m; };
  let H = CMP.hits.filter(cmpNameOk); const S = H.filter(h => CMP.sel.has(h.a.id)); if(S.length) H = S;
  return H.slice().sort((x, y) => (x.a.start_date_local || "") < (y.a.start_date_local || "") ? -1 : 1).slice(-40).map(h => { const hr = h.s.hr ? winMean(h, "hr") : 0, r = Math.round;
    return [(h.a.start_date_local || "").slice(0, 10), h.a.name || h.a.type || "", cmpIndoor(h.a) ? "indoor" : "outdoor", r(h.cnt), cmpSec(h.mw), h.mr ? cmpSec(h.mr) : "", r(h.avgP) + " W", h.pct ? r(h.pct) + "%" : "", (h.drop >= 0 ? "+" : "") + r(h.drop) + "%", hr ? r(hr) : "", h.s.hr ? r(hm_(h)) : "", h.s.cad ? r(winMean(h, "cad")) : "", hr ? (h.avgP / hr).toFixed(2) : "", h.q ? r(h.q) + "%" : ""].join(" | "); });
}
async function cmpProgress(){
  const rows = cmpRows(), b = $("cmpprog");
  if(rows.length < 3) return say("cmpProgSys", "err");
  b.disabled = true; say(null); progStart("analyzing");
  try{
    const user = "COMPARABLE SESSIONS (oldest first)\n" + t("cmpCols").split("|").join(" | ") + "\n" + rows.join("\n") + (ICU.ftpIn || ICU.ftpOut ? "\n\nAthlete FTP: indoor " + (ICU.ftpIn || "?") + " W, outdoor " + (ICU.ftpOut || "?") + " W" : "") +
      `\n\nWrite the analysis in ${lang === "fr" ? "French" : "English"}, in the required format, with the final answer only inside <answer></answer>.`;
    const txt = aiAnswer(await aiComplete(SYSTEM_PROGRESS, user));
    $("aiBody").innerHTML = mdLite(txt || t("badResp")); $("aiDlg").showModal();
  }catch(e){ say($("prov").value === "hf" ? "errH" : $("prov").value === "oa" ? "errA" : "errG", "err", errText(e)); $("cfg").showModal(); }
  progEnd(); b.disabled = false;
}
$("cmpprog").onclick = cmpProgress;
function cmpTable(){
  $("cmpprog").hidden = !CMP.hits.length;
  const box = $("cmptable");
  $("cmpname").style.display = CMP.hits.length ? "" : "none";
  if(!CMP.hits.length){ box.innerHTML = ""; return; }
  const hmax = h => { let m = 0; if(h.s.hr) for(const g of h.win) for(let i = g.start; i <= g.end && i < h.s.hr.length; i++) if(h.s.hr[i] > m) m = h.s.hr[i]; return m; };
  const R = CMP.hits.map((h, hi) => ({h, hi})).filter(x => cmpNameOk(x.h)).map(({h, hi}) => { const hr = h.s.hr ? winMean(h, "hr") : 0;
    return {h, hi, v: [h.cnt, h.mw, h.mr, h.avgP, h.pct, h.drop, hr, h.s.hr ? hmax(h) : 0, h.s.cad ? winMean(h, "cad") : 0, hr ? h.avgP / hr : 0, h.q]}; });
  const f = [x => Math.round(x), cmpSec, x => x ? cmpSec(x) : "", x => Math.round(x), x => x ? Math.round(x) + "%" : "", x => (x >= 0 ? "+" : "") + Math.round(x) + "%", x => x ? Math.round(x) : "", x => x ? Math.round(x) : "", x => x ? Math.round(x) : "", x => x ? x.toFixed(2) : "", x => x ? Math.round(x) + "%" : "\u2013"];
  const col = t("cmpCols").split("|"), S = R.filter(r => CMP.sel.has(r.h.a.id));
  const avg = i => { const v = S.map(r => r.v[i]).filter(x => x); return v.length ? cmpAvg(v) : 0; };
  box.innerHTML = `<table><thead><tr><th><input type="checkbox" id="cmpall"${S.length === R.length ? " checked" : ""}></th>${col.map((c, ci) => `<th>${esc(c)}</th>` + (ci === 1 ? "<th></th>" : "")).join("")}</tr></thead><tbody>` +
    R.map((r, i) => `<tr data-hi="${r.hi}"${CMP.sel.has(r.h.a.id) ? "" : ' class="unsel"'}><td><input type="checkbox" data-h="${r.hi}"${CMP.sel.has(r.h.a.id) ? " checked" : ""}></td><td>${esc((r.h.a.start_date_local || "").slice(0, 10))}</td><td><i class="sw" style="display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;background:${r.h.col}"></i>${esc(r.h.a.name || r.h.a.type || "")}<a href="#" data-ses="${r.hi}" title="${esc(t('sesT'))}">\u2197</a></td><td><div class="cmp-mini" data-hi="${r.hi}"></div></td><td>${esc(cmpIndoor(r.h.a) ? t("indoor") : t("outdoor"))}</td>${r.v.map((x, i) => `<td>${f[i](x)}</td>`).join("")}</tr>`).join("") +
    (S.length > 1 ? `</tbody><tfoot><tr><td></td><td></td><td>\u00d8 (${S.length})</td><td></td><td></td>${R[0].v.map((_, i) => `<td>${f[i](avg(i))}</td>`).join("")}</tr></tfoot></table>` : "</tbody></table>");
  box.querySelectorAll("tbody input").forEach(c => c.onchange = () => { const h = CMP.hits[+c.dataset.h]; if(c.checked) CMP.sel.add(h.a.id); else CMP.sel.delete(h.a.id); cmpChart(); });
  box.querySelectorAll("a[data-ses]").forEach(l => l.onclick = e => { e.preventDefault(); const h = CMP.hits[+l.dataset.ses]; if(h) sesOpenAct(h.a); });
  cmpMiniLoad(box);
  const all = $("cmpall"); if(all) all.onchange = () => { CMP.hits.filter(cmpNameOk).forEach(h => { if(all.checked) CMP.sel.add(h.a.id); else CMP.sel.delete(h.a.id); }); cmpChart(); };
}
// Profil de la séance pour le tableau (mêmes barres que l'aperçu : flux complet → detectSteps → zones)
const CMP_TIPSVG = {};
function cmpTipSvg(h){
  const id = h.a.id;
  if(CMP_TIPSVG[id] !== undefined) return CMP_TIPSVG[id];
  let svg = "";
  try{
    const ftp = cmpActFtp(h.a);
    if(h.s.w && ftp){
      // précision adaptée à la forme trouvée : lissage et durée mini des paliers réglés sur le plus court des efforts / récups,
      // et plafond d'étapes relevé pour que les répétitions courtes ne soient plus fusionnées entre elles
      const shortest = Math.min(h.mw || 60, h.mr || h.mw || 60), mn = Math.max(4, Math.min(20, Math.round(shortest * 0.5)));
      const W = Array.from(h.s.w), fine = {min: mn, K: shortest < 30 ? 3 : 5, max: Math.max(50, (h.cnt || 1) * 2 + 20)};
      let steps = [];
      const wins = (h.win || []).filter(g => g.end > g.start && g.start >= 0 && g.end < W.length).sort((x, y) => x.start - y.start);
      if(wins.length > 1){
        // les répétitions déjà repérées par la recherche sont imposées comme paliers : aucune ne peut être absorbée par la récupération voisine
        const mean = (a, b) => { let t = 0; for(let i = a; i < b; i++) t += W[i] > 0 && W[i] < 2500 ? W[i] : 0; return b > a ? t / (b - a) : 0; };
        const seg = (a, b) => {
          if(b - a <= 0) return [];
          if(b - a >= 60){ const r = detectSteps(W.slice(a, b), ftp, fine); if(r.length) return r; }
          const m = mean(a, b); return [{d: b - a, a: m, b: m}];
        };
        let pos = 0;
        for(const g of wins){
          const st = Math.max(g.start, pos), en = g.end + 1;
          if(en <= st) continue;
          steps.push(...seg(pos, st));
          const m = mean(st, en); steps.push({d: en - st, a: m, b: m});
          pos = en;
        }
        steps.push(...seg(pos, W.length));
      }
      if(!steps.length) steps = detectSteps(W, ftp, fine);
      if(steps.length) svg = stepsSvg(steps.map(x => ({d: x.d, a: x.a / ftp * 100, b: x.b / ftp * 100})));
    }
    if(!svg) svg = actPrevSvg({w: h.s.w ? Array.from(h.s.w) : null, h: h.s.hr ? Array.from(h.s.hr) : null}) || actFallbackSvg(h.a, null);
  }catch(e){ svg = ""; }
  return CMP_TIPSVG[id] = svg;
}
// vignette en ligne dans chaque ligne du tableau (calculée à l'affichage ; le SVG est mis en cache par séance)
function cmpMiniLoad(box){
  if(CMP.io){ CMP.io.disconnect(); CMP.io = null; }
  const els = Array.from(box.querySelectorAll(".cmp-mini")); if(!els.length) return;
  const fill = el => {
    if(el.dataset.ld) return; el.dataset.ld = "1";
    const h = CMP.hits[+el.dataset.hi], svg = h ? cmpTipSvg(h) : "";
    if(svg) el.innerHTML = svg; else el.remove();
  };
  if(!("IntersectionObserver" in window)){ els.forEach(fill); return; }
  const io = CMP.io = new IntersectionObserver(es => es.forEach(en => { if(en.isIntersecting){ io.unobserve(en.target); fill(en.target); } }), {rootMargin: "200px"});
  els.forEach(el => io.observe(el));
}
// --- Progression dans le temps : un point par séance sélectionnée (date → W/FC), courbe de tendance polynomiale en surimpression ---
// W/FC = puissance moyenne des efforts ÷ FC moyenne des efforts (même valeur que la colonne du tableau).
const CMP_PW = "#3b82c9", CMP_HR = "#d6336c";
const CMP_NICE = [1, 2, 5, 10, 20, 25, 50, 100];
// Régression polynomiale par moindres carrés (x normalisé sur [0,1]) ; le degré « auto » minimise le critère AICc, qui pénalise le surajustement
function cmpPolyFit(xs, ys, d){
  const m = d + 1, A = Array.from({length: m}, () => new Array(m + 1).fill(0));
  for(let i = 0; i < xs.length; i++){
    const pw = [1]; for(let j = 1; j <= 2 * d; j++) pw[j] = pw[j - 1] * xs[i];
    for(let r = 0; r < m; r++){ for(let c = 0; c < m; c++) A[r][c] += pw[r + c]; A[r][m] += pw[r] * ys[i]; }
  }
  for(let c = 0; c < m; c++){ // élimination de Gauss avec pivot partiel
    let q = c; for(let r = c + 1; r < m; r++) if(Math.abs(A[r][c]) > Math.abs(A[q][c])) q = r;
    [A[c], A[q]] = [A[q], A[c]]; if(Math.abs(A[c][c]) < 1e-12) return null;
    for(let r = c + 1; r < m; r++){ const f = A[r][c] / A[c][c]; for(let k = c; k <= m; k++) A[r][k] -= f * A[c][k]; }
  }
  const b = new Array(m);
  for(let r = m - 1; r >= 0; r--){ let v = A[r][m]; for(let k = r + 1; k < m; k++) v -= A[r][k] * b[k]; b[r] = v / A[r][r]; }
  return b;
}
const cmpPoly = (b, u) => b.reduceRight((a, c) => a * u + c, 0);
function cmpFit(P, span, mode){
  const n = P.length, xs = P.map(x => (x.tm - P[0].tm) / span), ys = P.map(x => x.m);
  const distinct = new Set(xs.map(v => v.toFixed(6))).size; if(n < 2 || distinct < 2) return null;
  const my = cmpAvg(ys), tss = ys.reduce((a, y) => a + (y - my) ** 2, 0);
  const run = d => {
    if(d > distinct - 1) return null;
    const b = d === 0 ? [my] : cmpPolyFit(xs, ys, d); if(!b) return null;
    const rss = ys.reduce((a, y, i) => a + (y - cmpPoly(b, xs[i])) ** 2, 0), k = d + 1, rr = Math.max(rss, tss * 1e-6, 1e-12);
    return {b, d, r2: tss > 0 ? Math.max(0, 1 - rss / tss) : 0, aic: n - k - 1 > 0 ? n * Math.log(rr / n) + 2 * k + 2 * k * (k + 1) / (n - k - 1) : Infinity};
  };
  let best = null;
  if(mode === "auto"){
    for(let d = n >= 5 ? 0 : 1; d <= 3; d++){ const f = run(d); if(f && f.aic < Infinity && (!best || f.aic < best.aic)) best = f; }
    if(!best) best = run(1); // trop peu de séances pour comparer les modèles : droite
  } else best = run(Math.min(+mode || 1, Math.max(1, n - 2)));
  if(!best) best = run(1);
  return best && {...best, auto: mode === "auto", at: tm => cmpPoly(best.b, (tm - P[0].tm) / span)};
}
function cmpChart(){
  cmpTable();
  const box = $("cmpchart"), H = CMP.hits.filter(h => CMP.sel.has(h.a.id) && cmpNameOk(h));
  $("cmpnav").style.display = H.length ? "flex" : "none";
  if(!H.length){ box.innerHTML = ""; $("cmpinfo").textContent = ""; return; }
  const fm = $("cmpma").value || "auto", met = $("cmpplot").value || "ef";
  const M = {ef: {u: "W/HR", y: "cmpEfY", f: v => v.toFixed(2), get: x => x.hr ? x.pw / x.hr : 0},
    pw: {u: "W", y: "cmpPwY", f: v => String(Math.round(v)), get: x => x.pw},
    hr: {u: "bpm", y: "cmpHrY", f: v => String(Math.round(v)), get: x => x.hr}}[met] || null;
  const P = H.map(h => { const hr = h.s.hr ? winMean(h, "hr") : 0; const x = {h, tm: new Date(h.a.start_date_local).getTime(), pw: h.avgP, hr}; x.m = M.get(x); return x; })
    .filter(x => x.m > 0 && isFinite(x.tm)).sort((x, y) => x.tm - y.tm);
  if(!P.length){ box.innerHTML = `<p class="hint">${esc(t("cmpNoHr"))}</p>`; $("cmpinfo").textContent = ""; return; }
  const t0 = P[0].tm, span = Math.max(P[P.length - 1].tm - t0, 864e5), xOf = tm => P.length === 1 ? 400 : (.03 + .94 * (tm - t0) / span) * 800;
  const FIT = cmpFit(P, span, fm), curve = FIT ? Array.from({length: 81}, (_, i) => ({tm: t0 + span * i / 80, v: FIT.at(t0 + span * i / 80)})) : [];
  const vals = [...P.map(x => x.m), ...curve.map(c => c.v)], mn = Math.min(...vals), mx = Math.max(...vals);
  let lo, st;
  if(met === "ef"){ lo = Math.floor((mn - .02) / .05) * .05; st = Math.max(.05, Math.ceil((mx - lo) / 4 / .05 - 1e-9) * .05); }
  else{
    const pad = Math.max((mx - mn) * .1, 2);
    st = CMP_NICE.find(n => n >= (mx - mn + 2 * pad) / 4) || 100; lo = Math.floor((mn - pad) / st) * st;
    while(lo + 4 * st < mx + pad / 2){ const i = CMP_NICE.indexOf(st); st = i >= 0 && CMP_NICE[i + 1] ? CMP_NICE[i + 1] : st * 2; lo = Math.floor((mn - pad) / st) * st; }
  }
  const hi = lo + 4 * st;
  const yOf = v => 214 - Math.max(0, Math.min(1, (v - lo) / (hi - lo))) * 208;
  let svg = "";
  for(let i = 0; i <= 4; i++){ const y = (214 - i / 4 * 208).toFixed(1); svg += `<line x1="0" x2="800" y1="${y}" y2="${y}" style="stroke:var(--line)" vector-effect="non-scaling-stroke"${i && i < 4 ? ' stroke-dasharray="4 4"' : ""}/>`; }
  if(curve.length) svg += `<path d="${curve.map((c, i) => (i ? "L" : "M") + xOf(c.tm).toFixed(1) + " " + yOf(c.v).toFixed(1)).join("")}" stroke="${CMP_HR}" stroke-width="2.5" fill="none"/>`;
  svg += P.map(x => `<path d="M${xOf(x.tm).toFixed(1)} ${yOf(x.m).toFixed(1)}h.01" stroke="${CMP_PW}" stroke-width="9" stroke-opacity=".8"/>`).join("");
  svg += `<line class="cmp-cur" x1="0" x2="0" y1="0" y2="220" stroke="#888" stroke-width="1" vector-effect="non-scaling-stroke" style="display:none"/>`;
  // l'année s'affiche dès que la période dépasse ~10 mois OU chevauche deux années civiles (ex. nov. → mars) ; toujours dans l'infobulle
  const yrs = new Date(t0).getFullYear() !== new Date(t0 + span).getFullYear() || span > 300 * 864e5;
  const dfmt = (tm, full) => new Date(tm).toLocaleDateString(loc(), {day: "numeric", month: "short", year: full ? "numeric" : yrs ? "2-digit" : undefined});
  const ticks = [0, 1, 2, 3, 4].map(i => `<span class="yt yl" style="top:${((214 - i / 4 * 208) / 220 * 100).toFixed(1)}%">${M.f(lo + st * i)}</span>`).join("");
  const xl = P.length === 1 ? `<span style="left:50%;transform:translateX(-50%)">${dfmt(t0)}</span>` : [0, .25, .5, .75, 1].map(f => `<span style="left:${f * 100}%;transform:translateX(${-f * 100}%)">${dfmt(t0 + f * span)}</span>`).join("");
  box.innerHTML = `<div class="cmp-pr">${ticks}<svg viewBox="0 0 800 220" preserveAspectRatio="none">${svg}</svg></div><div class="cmp-xa">${xl}</div>` +
    `<div class="cmp-leg"><span><i style="background:${CMP_PW};border-radius:50%"></i>${esc(t(M.y))}</span>${FIT ? `<span><i style="background:${CMP_HR};height:3px"></i>${esc(t("cmpFitLeg", t("cmpDg" + FIT.d) + (FIT.auto ? " (auto)" : "")))}</span>` : ""}</div>`;
  const avgTxt = M.f(cmpAvg(P.map(x => x.m))) + " " + M.u, dlt = FIT ? FIT.at(t0 + span) - FIT.at(t0) : 0;
  $("cmpinfo").textContent = FIT ? t("cmpInfoF", P.length, avgTxt, t("cmpDg" + FIT.d), FIT.r2.toFixed(2), (dlt > 0 ? "+" : dlt < 0 ? "\u2212" : "") + M.f(Math.abs(dlt)) + " " + M.u) : t("cmpInfoN", P.length, avgTxt);
  box.onpointermove = e => {
    const sv = e.target.closest ? e.target.closest("svg") : null, tip = $("cmptip");
    if(!sv){ box.onpointerleave(); return; }
    const r = sv.getBoundingClientRect(), px = e.clientX - r.left;
    let best = null, bd = 1e9; P.forEach(x => { const d = Math.abs(xOf(x.tm) / 800 * r.width - px); if(d < bd){ bd = d; best = x; } });
    if(!best || bd > 22){ box.onpointerleave(); return; }
    tip.innerHTML = `<div style="color:var(--mute)">${esc(dfmt(best.tm, true))} \u2014 ${esc(best.h.a.name || best.h.a.type || "")}</div><div><b>${M.f(best.m)}</b> ${M.u} \u00b7 ${FIT ? `<span style="color:var(--mute)">${esc(t("cmpFitV"))}: ${M.f(FIT.at(best.tm))}</span>` : ""}</div><div style="color:var(--mute)">${Math.round(best.pw)} W \u00b7 ${best.hr ? Math.round(best.hr) + " bpm" : "\u2013"}</div>`;
    tip.style.display = "block";
    const tx = e.clientX + 16 + tip.offsetWidth > window.innerWidth ? e.clientX - 16 - tip.offsetWidth : e.clientX + 16;
    tip.style.left = Math.max(4, tx) + "px"; tip.style.top = Math.max(4, Math.min(e.clientY + 12, window.innerHeight - tip.offsetHeight - 4)) + "px";
    box.querySelectorAll(".cmp-cur").forEach(l => { const xx = xOf(best.tm); l.setAttribute("x1", xx); l.setAttribute("x2", xx); l.style.display = ""; });
  };
  box.onpointerleave = () => { $("cmptip").style.display = "none"; box.querySelectorAll(".cmp-cur").forEach(l => l.style.display = "none"); };
}
$("cmpplot").onchange = () => { store.set("si_cmpplot", $("cmpplot").value); cmpChart(); };
{ const pv = store.get("si_cmpplot"); if(pv && $("cmpplot").querySelector(`option[value="${pv}"]`)) $("cmpplot").value = pv; }
$("cmpclr").onclick = async () => { await scClear(); cacheTick(0); CMP.streams = {}; SES.lap = {}; SES.dev = {}; SES.iv = {}; Object.keys(STREAM_CACHE).forEach(k => delete STREAM_CACHE[k]); say("cacheCleared", "ok"); };
$("rcmp").onclick = () => { store.set("si_cmpper", $("cmpper").value); store.set("si_cmptype", $("cmptype").value); store.set("si_cmpplace", $("cmpplace").value); cmpSearch(); };
$("cmpplace").onchange = () => store.set("si_cmpplace", $("cmpplace").value);
$("cmpper").onchange = () => store.set("si_cmpper", $("cmpper").value);
$("cmptype").onchange = () => store.set("si_cmptype", $("cmptype").value);
$("cmpq").onkeydown = e => { if(e.key === "Enter"){ e.preventDefault(); if(!CMP.busy) $("rcmp").click(); } };
$("cmpname").oninput = () => cmpChart();
$("cmpma").onchange = () => { store.set("si_cmpfit", $("cmpma").value); cmpChart(); };
{ // préférences sauvegardées
  const p = store.get("si_cmpper"); if(p) $("cmpper").value = p;
  const ty = store.get("si_cmptype"); if(ty && $("cmptype").querySelector(`option[value="${ty}"]`)) $("cmptype").value = ty;
  const pl = store.get("si_cmpplace"); if(pl === "in" || pl === "out") $("cmpplace").value = pl;
  const q = store.get("si_cmpq"); if(q) $("cmpq").value = q;
  const mw = store.get("si_cmpfit"); if(mw && $("cmpma").querySelector(`option[value="${mw}"]`)) $("cmpma").value = mw;
  $("cmpq").addEventListener("change", () => store.set("si_cmpq", $("cmpq").value));
}

