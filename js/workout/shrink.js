/* FlameCadence - Shrink a workout to a target duration, undo stack, stair builder */
// ---------- Réduction à durée cible (shrink) ----------
function fmtDur(sec){
  sec = Math.max(1, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}h${m}m` : m ? (s ? `${m}m${s}s` : `${m}m`) : `${s}s`;
}
function reTime(line, sec){
  const tok = "(?:\\d+(?:[.,]\\d+)?\\s*(?:h|min|m|s)(?![a-z])|\\d+:\\d{2}(?::\\d{2})?)";
  // remplace TOUTE l'expression de durée en tête de ligne (« 15m », « 1h30 », « 2m5s »…) par une durée unique et propre
  const re = new RegExp("^(\\s*-\\s*)(" + tok + "(?:\\s*\\d{1,2}(?![a-z0-9%:-]))?(?:\\s*" + tok + ")*)(?=\\s|$)", "i");
  const m = line.match(re);
  return m ? m[1] + fmtDur(sec) + line.slice(m[0].length) : line;
}
function shrinkRegion(lines, steps, cut){
  // raccourcit les lignes de la région (échauffement ou retour au calme) pour lui retirer ~cut secondes
  if(!steps.length || cut <= 0) return 0;
  const tot = steps.reduce((s, x) => s + x.d, 0);
  const scale = Math.max(0, (tot - cut) / tot);
  const byLine = {};
  steps.forEach(s => { (byLine[s.line] = byLine[s.line] || []).push(s); });
  let done = 0;
  for(const li of Object.keys(byLine)){
    const ls = byLine[li], per = ls[0].d;
    const newPer = Math.max(30, Math.round(per * scale / 30) * 30);
    if(newPer >= per) continue;
    const nl = reTime(lines[li], newPer);
    if(nl === lines[li]) continue; // durée non réécrite (ex. étape en distance) : ne pas comptabiliser
    lines[li] = nl;
    done += ls.length * (per - newPer);
  }
  return done;
}
// --- pile d'annulation pour les transformations de l'aperçu (shrink, ± intensité) ---
let UNDO = null;
function pushUndo(){
  UNDO = $("desc").value;
  $("undoBtn").hidden = false;
}
function doUndo(){
  if(UNDO == null) return;
  $("desc").value = UNDO; UNDO = null; $("undoBtn").hidden = true; selLine = null; renderChart(); say("undone", "ok");
}
$("undoBtn").onclick = doUndo;
// --- ajustement global des intensités (±5 % de FTP) ---
function shiftIntensity(delta){
  const steps = parseWorkout($("desc").value, $("sport").value, curFtp());
  if(!steps.length) return say("prevEmpty", "err");
  pushUndo();
  const lines = $("desc").value.split("\n");
  let touched = 0;
  // décale les pourcentages et les watts ; les rampes gardent leur écart
  lines.forEach((line, i) => {
    if(!/^\s*-/.test(line)) return;
    let moved = false;
    // décale les pourcentages (bornes des plages comprises) et les watts
    const np = line.replace(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*%/g, (m, p, q) => {
      moved = true;
      const sh = v => Math.max(0, Math.round((+v + delta) * 10) / 10);
      return q != null ? sh(p) + "-" + sh(q) + "%" : sh(p) + "%";
    });
    const ftpS = curFtp(), nw = np.replace(/(\d+(?:\.\d+)?)\s*w\b/gi, (m, w) => { moved = true; return (ftpS > 0 ? Math.max(0, Math.round(+w + delta * ftpS / 100)) : Math.max(0, Math.round((+w * (1 + delta / 100)) * 10) / 10)) + "w"; }); // ±5 points de FTP, comme pour les lignes en %
    if(moved){ lines[i] = nw; touched++; }
  });
  if(!touched){ UNDO = null; $("undoBtn").hidden = true; return say("shrinkNone", "err"); }
  $("desc").value = lines.join("\n"); selLine = null; renderChart();
  say("intensDone", "ok", (delta > 0 ? "+" : "") + delta + " % FTP");
  toast(t("intensDone", (delta > 0 ? "+" : "") + delta + " % FTP"), "ok", doUndo);
}
$("minus5").onclick = () => shiftIntensity(-5);
$("plus5").onclick = () => shiftIntensity(+5);
$("shrinkbtn").onclick = () => {
  const before = $("desc").value;
  const steps = parseWorkout(before, $("sport").value, curFtp());
  if(!steps.length) return say("prevEmpty", "err");
  const total = steps.reduce((s, x) => s + x.d, 0);
  const target = (+$("shrinksel").value) * 60;
  if(total <= target + 5) return say("shrinkAlready", "ok", hm(target));
  const mid = s => (s.a + s.b) / 2;
  const cnt = {}; steps.forEach(s => cnt[s.line] = (cnt[s.line] || 0) + 1);
  // les étapes d'un bloc de répétitions font partie du cœur : on n'y touche pas
  const easy = s => mid(s) < 80 && cnt[s.line] === 1;
  let wi = 0; while(wi < steps.length && easy(steps[wi])) wi++;
  let ci = steps.length; while(ci > wi && easy(steps[ci - 1])) ci--;
  if(wi >= steps.length){ wi = Math.ceil(steps.length / 2); ci = wi; } // séance entièrement facile : couper au milieu
  const wSteps = steps.slice(0, wi), cSteps = steps.slice(ci);
  const wTot = wSteps.reduce((s, x) => s + x.d, 0), cTot = cSteps.reduce((s, x) => s + x.d, 0);
  const wAvail = Math.max(0, wTot - 300), cAvail = Math.max(0, cTot - 300); // on laisse jusqu'à 5' de chaque côté
  if(wAvail + cAvail <= 0) return say("shrinkNone", "err");
  const excess = Math.min(total - target, wAvail + cAvail);
  let wCut = Math.min(Math.round(excess * wAvail / (wAvail + cAvail)), wAvail);
  const cCut = Math.min(excess - wCut, cAvail);
  const lines = before.split("\n");
  const done = shrinkRegion(lines, wSteps, wCut) + shrinkRegion(lines, cSteps, cCut);
  if(!done) return say("shrinkNone", "err");
  pushUndo();
  $("desc").value = lines.join("\n"); selLine = null; renderChart();
  const newTotal = total - done;
  if(newTotal > target + 60) say("shrinkPart", "ok", hm(done), hm(newTotal));
  else say("shrinkDone", "ok", hm(total), hm(newTotal));
  toast(t(newTotal > target + 60 ? "shrinkPart" : "shrinkDone", ...(newTotal > target + 60 ? [hm(done), hm(newTotal)] : [hm(total), hm(newTotal)])), "ok", doUndo);
};

// --- rampes -> paliers (home trainers / applis sans rampes, ex. Tacx) : réécrit les lignes de la description, donc valable pour l'export et l'envoi vers intervals.icu ---
// N paliers égaux du départ à l'arrivée de la rampe : le 1er palier = départ (on ne démarre jamais plus haut), le dernier = arrivée, moyenne conservée
function lineStair(line, d0, sec, pct, ftp){
  let L = lineTime(line, sec, d0).replace(/\bramp\b/gi, ""), ok = false;
  L = L.replace(/(\d+(?:[.,]\d+)?)\s*%?\s*-\s*(\d+(?:[.,]\d+)?)\s*%/, () => { ok = true; return Math.round(pct) + "%"; });
  if(!ok && ftp > 0) L = L.replace(/(\d+(?:[.,]\d+)?)\s*w?\s*-\s*(\d+(?:[.,]\d+)?)\s*w\b/i, () => { ok = true; return Math.round(ftp * pct / 100) + "w"; });
  return ok ? L.replace(/[ \t]{2,}/g, " ").replace(/\s+$/, "") : null;
}
$("stairbtn").onclick = () => {
  const before = $("desc").value, ftp = curFtp(), steps = parseWorkout(before, $("sport").value, ftp);
  if(!steps.length) return say("prevEmpty", "err");
  const sec = +$("stairsel").value || 60, lines = before.split("\n"), seen = new Set(), repl = new Map();
  for(const x of steps){
    if(x.line == null || seen.has(x.line)) continue; seen.add(x.line); // une ligne dans un bloc répété n'est réécrite qu'une fois
    if(x.m || x.d < 20 || (x.hr ? Math.abs(x.ha - x.hb) <= 0.5 : Math.abs(x.a - x.b) <= 0.5) || lines[x.line] == null) continue;
    const N = Math.max(2, Math.min(Math.round(x.d / sec), Math.floor(x.d / 10))), base = Math.floor(x.d / N), out = [];
    for(let k = 0; k < N; k++){
      const f = k / (N - 1), dd = k === N - 1 ? x.d - base * (N - 1) : base;
      let l = x.hr ? null : lineStair(lines[x.line], x.d, dd, x.a + (x.b - x.a) * f, ftp); // on garde le texte de la ligne (indices, unité W ou %)
      if(l == null) l = "- " + fmtDurImp(dd) + " " + (x.hr ? Math.round(x.ha + (x.hb - x.ha) * f) + "% LTHR" : Math.round(x.a + (x.b - x.a) * f) + "%"); // repli : ligne propre reconstruite à partir des valeurs lues
      out.push(l);
    }
    repl.set(x.line, out);
  }
  if(!repl.size) return say("stairNone", "ok");
  pushUndo();
  const res = []; lines.forEach((l, i) => { if(repl.has(i)) res.push(...repl.get(i)); else res.push(l); });
  $("desc").value = res.join("\n"); selLine = null; renderChart();
  say("stairDone", "ok", repl.size); toast(t("stairDone", repl.size), "ok", doUndo);
};

