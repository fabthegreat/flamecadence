/* FlameCadence - Workout text parser (parseWorkout) and heart-rate token helpers */
// ---------- Graphe de la séance ----------
let selLine = null, EXPL = null;
// Fréquence cardiaque ↔ intensité équivalente en % FTP : correspondance par zones (Coggan : Z1 < 68 % LTHR ↔ < 55 % FTP, Z2 83 ↔ 75, Z3 94 ↔ 90, Z4 105 ↔ 105…).
// Une étape en FC est dessinée, colorée par zone et chiffrée (charge estimée) avec cette puissance équivalente.
const HRMAP = [[0, 0], [68, 55], [83, 75], [94, 90], [105, 105], [115, 120], [130, 160]], HRZ = [60, 76, 89, 100, 110, 120, 130];
const hrInterp = (x, from, to) => {
  const P = HRMAP; if(x <= P[0][from]) return P[0][to];
  for(let i = 1; i < P.length; i++) if(x <= P[i][from]){ const x0 = P[i - 1][from], y0 = P[i - 1][to], x1 = P[i][from], y1 = P[i][to]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  const n = P.length - 1, k = (P[n][to] - P[n - 1][to]) / (P[n][from] - P[n - 1][from]); return P[n][to] + (x - P[n][from]) * k;
};
const h2p = h => hrInterp(h, 0, 1), p2h = p => hrInterp(p, 1, 0);
// Cible de FC dans une ligne : « 75% LTHR », « 70-80% LTHR », « 85% HR » (% de la FC max, ramené à la LTHR), « Z2 HR », « 140-150bpm » → en % de la LTHR
function hrTok(str){
  const num = x => parseFloat(String(x).replace(",", ".")), k = ICU.maxHr > 0 && ICU.lthr > 0 ? ICU.maxHr / ICU.lthr : 1.1;
  let m = str.match(/(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?\s*%\s*(lthr|hr)\b/i);
  if(m){ const f = m[3].toLowerCase() === "hr" ? k : 1, a = num(m[1]) * f, b = (m[2] ? num(m[2]) : num(m[1])) * f; return {ha: a, hb: b, idx: m.index, end: m.index + m[0].length, ramp: /ramp/i.test(str), range: !!m[2]}; }
  m = str.match(/\bz([1-7])\s*hr\b/i);
  if(m){ const v = HRZ[m[1] - 1]; return {ha: v, hb: v, idx: m.index, end: m.index + m[0].length, ramp: false, range: false}; }
  m = str.match(/(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?\s*bpm\b/i);
  if(m && ICU.lthr > 0){ const a = num(m[1]) / ICU.lthr * 100, b = (m[2] ? num(m[2]) : num(m[1])) / ICU.lthr * 100; return {ha: a, hb: b, idx: m.index, end: m.index + m[0].length, ramp: /ramp/i.test(str), range: !!m[2]}; }
  return null;
}
function parseWorkout(txt, sport, ftp){
  const steps = []; let group = null;
  const flush = () => { if(group){ for(let i = 0; i < group.n; i++) steps.push(...group.items); group = null; } };
  const num = x => parseFloat(String(x).replace(",", "."));
  const dur = str => {
    let tt = 0, m;
    // formes : 10m, 5min, 30s, 1h, 1h30, 2m45 (composées), 10:00 (mm:ss), 1:30:00 (h:mm:ss)
    const re = /(\d+(?:[.,]\d+)?)\s*(h|min|m|s)(?![a-z])|(\d+):(\d{2})(?::(\d{2}))?/gi;
    while((m = re.exec(str))){
      if(m[3] != null){ tt += m[5] != null ? (+m[3]) * 3600 + (+m[4]) * 60 + (+m[5]) : (+m[3]) * 60 + (+m[4]); continue; }
      const v = num(m[1]), u = m[2].toLowerCase();
      tt += u === "h" ? v * 3600 : u === "s" ? v : v * 60;
      // nombre isolé juste après une unité h ou m/min : "1h30" → 30 min, "2m45" → 45 s
      const rest = str.slice(re.lastIndex).match(/^\s*(\d{1,2})(?![^\s])/);
      if(rest && u !== "s") tt += u === "h" ? (+rest[1]) * 60 : +rest[1];
    }
    return tt;
  };
  const dist = str => {
    const m = str.match(/(\d+(?:[.,]\d+)?)\s*(mtr|km|yrd)/i); if(!m) return 0;
    const v = num(m[1]), u = m[2].toLowerCase(); return u === "km" ? v * 1000 : u === "yrd" ? v * 0.9144 : v;
  };
  const inten = str => {
    const hv = hrTok(str); if(hv) return {a: h2p(hv.ha), b: h2p(hv.hb), idx: hv.idx, ramp: hv.ramp, hr: hv};
    let m = str.match(/(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?\s*%/);
    if(m){ const a = num(m[1]), b = m[2] ? num(m[2]) : a; return {a, b, idx: m.index, ramp: /ramp/i.test(str)}; }
    m = str.match(/(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?\s*w\b/i); // watts : « 200w » ou plage « 120 - 220w » (rampe avec le mot ramp)
    if(m && ftp > 0){ const a = num(m[1]) / ftp * 100, b = m[2] ? num(m[2]) / ftp * 100 : a; return {a, b, idx: m.index, ramp: !!m[2] && /ramp/i.test(str), w: [num(m[1]), m[2] ? num(m[2]) : num(m[1])]}; }
    m = str.match(/\bz([1-7])\b/i);
    if(m){ const v = [50, 65, 82, 97, 112, 135, 160][m[1] - 1]; return {a: v, b: v, idx: m.index, ramp: false}; }
    return null;
  };
  const spm = sport === "Swim" ? 1 : sport === "Run" ? 0.24 : 0.36;
  for(const [li, raw] of txt.split("\n").entries()){
    const line = raw.trim();
    if(!line){ flush(); continue; }
    const dashed = line.startsWith("-");
    const body = dashed ? line.slice(1).replace(/^\s*/, "") : line;
    const it = inten(body);
    if(it){
      // une ligne avec durée + intensité est une étape, avec ou sans tiret (format natif intervals.icu)
      const pre = body.slice(0, it.idx), mid = (it.a + it.b) / 2;
      let d = dur(pre), md = 0;
      const sm = body.slice(it.idx).match(/\b(?:slope|pente)\s*([+-]?\d+(?:[.,]\d+)?)\s*pct\b/i), gv = sm ? num(sm[1]) : null; // pente (%) en texte libre après la cible : ignoré par intervals.icu, lu par le lecteur
      if(!d){ const m = dist(pre); if(m){
        if(gv != null && ftp > 0 && sport !== "Run" && sport !== "Swim"){ md = m; d = Math.min(14400, m / physV(Math.max(1, ftp * mid / 100), gv, totalKg())); } // étape en pente définie par sa distance : durée estimée avec le modèle physique (FTP, poids)
        else d = m * spm / Math.max(mid / 100, 0.3);
      } }
      if(!d) continue;
      const step = {d, a: it.ramp ? it.a : mid, b: it.ramp ? it.b : mid, line: li};
      if(it.w){ step.aw = it.ramp ? it.w[0] : (it.w[0] + it.w[1]) / 2; step.bw = it.ramp ? it.w[1] : step.aw; } // cible écrite en watts : conservée telle quelle (sinon aller-retour W → % → W avec deux FTP différentes = écart)
      if(gv != null) step.g = gv; if(md) step.m = md;
      if(it.hr){ step.hr = true; step.ha = it.ramp ? it.hr.ha : (it.hr.ha + it.hr.hb) / 2; step.hb = it.ramp ? it.hr.hb : step.ha; } // cible en % LTHR conservée à côté de l'équivalent puissance
      if(group) group.items.push(step); else steps.push(step);
    }else if(dashed){
      continue;
    }else{
      flush();
      const r = line.match(/(\d+)\s*x\s*$/i);
      if(r) group = {n: Math.min(parseInt(r[1], 10), 50), items: []};
    }
  }
  flush();
  return steps;
}
const zoneOf = p => p < 56 ? 1 : p < 76 ? 2 : p < 91 ? 3 : p < 106 ? 4 : p < 121 ? 5 : p < 151 ? 6 : 7;
const toWatts = (desc, ftp) => desc.split("\n").map(l => l.trim().startsWith("-") && !hrTok(l) ? l.replace(/(\d+(?:\.\d+)?)\s*%/, (m, p) => Math.round(p * ftp / 100) + "w") : l).join("\n");
