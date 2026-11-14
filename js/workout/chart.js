/* FlameCadence - Workout preview chart, time per zone, fuelling guide, tooltips */
// ---------- Temps par zone et guide de ravitaillement ----------
function zoneTimes(steps){ // secondes par zone (1..7) ; les rampes sont découpées en tranches pour tenir compte des changements de zone
  const z = [0, 0, 0, 0, 0, 0, 0, 0];
  for(const s of steps){
    if(Math.abs(s.a - s.b) < 1){ z[zoneOf((s.a + s.b) / 2)] += s.d; continue; }
    const N = 24; for(let i = 0; i < N; i++) z[zoneOf(s.a + (s.b - s.a) * (i + 0.5) / N)] += s.d / N;
  }
  return z;
}
function zoneBar(z, mini){
  const tot = z.reduce((a, b) => a + b, 0); if(!tot) return "";
  const ks = [1, 2, 3, 4, 5, 6, 7].filter(k => z[k] > 0.5), pc = k => Math.round(z[k] / tot * 100);
  const seg = ks.map(k => `<i class="z${k}" style="width:${(z[k] / tot * 100).toFixed(2)}%" title="${esc(t("znTip", k, fmtDur(z[k]), pc(k)))}"></i>`).join("");
  const leg = mini ? "" : `<div class="zleg">${ks.map(k => `<span><i class="z${k}"></i>Z${k} ${esc(fmtDur(z[k]))} (${pc(k)}%)</span>`).join("")}</div>`;
  return `<div class="zbar${mini ? " mini" : ""}" role="img" aria-label="${esc(ks.map(k => "Z" + k + " " + pc(k) + "%").join(" · "))}">${seg}</div>${leg}`;
}
let FUEL_OPEN = store.get("si_fuelopen") === "1"; // état replié/déplié mémorisé (le bloc est régénéré à chaque rendu du graphe)
function fuelHtml(totalSec, steps, ftp, pace, iff){
  if(!(totalSec > 0)) return "";
  const h = totalSec / 3600, r5 = v => Math.round(v / 5) * 5;
  const kj = !pace && ftp > 0 ? Math.round(steps.reduce((a, x) => a + x.d * (x.a + x.b) / 2 / 100 * ftp, 0) / 1000) : 0; // 1 kJ de travail ≈ 1 kcal dépensée (rendement ~24 %)
  const easy = iff < 0.7;
  const [lo, hi] = h < 0.75 ? [0, 0] : h < 1.25 ? [15, 30] : h < 2 ? (easy ? [30, 45] : [45, 60]) : h < 3 ? (easy ? [45, 60] : [60, 75]) : (easy ? [60, 75] : [75, 90]);
  const sum = [kj ? "≈ " + kj + " kJ" : "", t("fuelCarb") + " " + (lo ? lo + "–" + hi + " g/h" : t("fuelNoneS"))].filter(Boolean).join(" · ");
  let o = `<details class="fuel"${FUEL_OPEN ? " open" : ""}><summary><b>${esc(t("fuelT"))}</b> · ${esc(sum)}</summary>`;
  if(kj) o += `<div>${esc(t("fuelEn"))}: ≈ ${kj} kJ (≈ ${kj} kcal ${esc(t("fuelBurn"))})</div>`;
  o += `<div>${esc(t("fuelCarb"))}: ` + (lo ? `<span style="color:var(--ink)">${lo}–${hi} g/h</span> · ≈ ${r5(lo * h)}–${r5(hi * h)} g ${esc(t("fuelTot"))}` : esc(t("fuelNone"))) + `</div>`;
  if(h >= 0.75) o += `<div>${esc(t("fuelFluid"))}: ≈ 500–750 ml/h · ≈ ${Math.round(h * 625 / 250) / 2} ${esc(t("fuelBot"))}</div>`;
  return o + `<div class="fn">${esc(t("fuelNote"))}</div></details>`;
}
let CH_FIX = null; // échelle figée pendant le redimensionnement par poignées {scale, peak}
function renderChart(ovr){
  try{ prevPlayBtn(); }catch(e){}
  const box = $("chart"), sport = $("sport").value, ftp = curFtp();
  const steps = ovr || parseWorkout($("desc").value, sport, ftp);
  if(!steps.length){ box.innerHTML = ""; box._steps = []; $("explain").hidden = true; return; }
  const total = steps.reduce((s, x) => s + x.d, 0), peak = Math.max(120, ...steps.map(s => Math.max(s.a, s.b)), CH_FIX ? CH_FIX.peak : 0), span = Math.max(total, CH_FIX ? CH_FIX.scale : 0);
  const W = 300, H = 100, meta = [];
  let x = 0, path = "", wsum = 0, t0 = 0, slope = "", alt = 0; const elev = [];
  for(const s of steps){
    const w = s.d / span * W, ya = H - s.a / peak * (H - 4), yb = H - s.b / peak * (H - 4);
    path += `<path data-n="${meta.length}" class="z${zoneOf((s.a + s.b) / 2)}${s.hr ? " hr" : ""}${s.line === selLine ? " sel" : ""}" d="M${x.toFixed(2)} ${H}L${x.toFixed(2)} ${ya.toFixed(1)}L${(x + w).toFixed(2)} ${yb.toFixed(1)}L${(x + w).toFixed(2)} ${H}Z"/>`;
    if(s.g != null){ const gc = s.g < -1 ? "#3b82f6" : s.g < 4 ? "#22c55e" : s.g < 7 ? "#eab308" : s.g < 10 ? "#f97316" : "#ef4444"; slope += `<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="7" fill="${gc}"/>`; }
    elev.push([x, alt]); alt += s.g != null ? (s.m ? s.m : colV(COLS_WKG * ((s.a + s.b) / 200), s.g) * s.d) * s.g / 100 : 0;
    meta.push({d: s.d, a: s.a, b: s.b, start: t0, line: s.line, hr: s.hr, ha: s.ha, hb: s.hb, g: s.g, m: s.m}); t0 += s.d; x += w; wsum += s.d * (s.a + s.b) / 2;
  }
  if(slope){ // profil d'altitude estimé (courbe) + bande de pente en haut du graphe, colorée selon la pente
    elev.push([W, alt]); const lo = Math.min(...elev.map(p => p[1])), hi = Math.max(...elev.map(p => p[1])), rg = Math.max(hi - lo, 1);
    path += slope + `<polyline fill="none" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity=".85" points="${elev.map(p => p[0].toFixed(1) + "," + (H - 6 - (p[1] - lo) / rg * (H - 22)).toFixed(1)).join(" ")}"/>`;
  }
  const avg = Math.round(wsum / total), pace = sport === "Run" || sport === "Swim", mins = Math.round(total / 60);
  const dtxt = mins >= 60 ? Math.floor(mins / 60) + "h" + pad(mins % 60) : mins + " min";
  const cap = dtxt + t("capAvg") + (!pace && ftp > 0 && $("unit").value === "w" ? Math.round(avg * ftp / 100) + " W (" + avg + t("pctFtp") + ")" : avg + (pace ? t("pctPace") : t("pctFtp")) + (!pace && ftp > 0 ? " (" + Math.round(avg * ftp / 100) + " W)" : ""));
  const stt = !pace ? stepsStats(steps) : null;
  const load = stt ? "<div class=\"cap\">IF " + stt.iff.toFixed(2) + " · TSS " + Math.round(stt.tss) + "</div>" : "";
  const zbar = zoneBar(zoneTimes(steps)), fuel = fuelHtml(total, steps, ftp, pace, stt ? stt.iff : avg / 100);
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(cap)}">${path}</svg>${zbar}<div class="cap">${esc(cap)}</div>${load}${steps.some(s => s.hr) ? `<div class="cap">♥ ${esc(t("hrEst"))}</div>` : ""}${slope ? `<div class="cap">⛰ ${esc(t("slopeCap", steps.filter(s => s.g != null).length, Math.max(...steps.filter(s => s.g != null).map(s => s.g)).toFixed(1)))}</div>` : ""}${fuel}<div class="tip" hidden></div>`;
  box._steps = meta; box._span = span; box._peak = peak; renderExplain(steps);
  if(!ovr){ try{ edHandles(box, meta, span, peak); }catch(err){} }
}
function tipText(s, ftp, pace){
  const f = v => Math.round(v), sec = Math.round(s.d);
  const dT = sec < 60 ? sec + " s" : (sec % 60 ? Math.floor(sec / 60) + "'" + pad(sec % 60) : Math.round(sec / 60) + " min");
  const d = s.m ? (s.m >= 1000 ? (s.m / 1000).toFixed(2).replace(/\.?0+$/, "") + " km" : Math.round(s.m) + " m") + " (≈ " + dT + ")" : dT; // étape à distance : distance exacte, durée estimée
  const ramp = Math.abs(s.a - s.b) > 0.5;
  const wmode = !pace && ftp > 0 && $("unit").value === "w";
  const pct = ramp ? f(s.a) + " → " + f(s.b) : f(s.a);
  const wat = ramp ? f(s.a * ftp / 100) + " → " + f(s.b * ftp / 100) : f(s.a * ftp / 100);
  if(s.hr){
    const ha = Math.round(s.ha), hb = Math.round(s.hb), bp = v => ICU.lthr > 0 ? Math.round(v * ICU.lthr / 100) : 0;
    const hv = (ramp ? ha + " → " + hb : ha) + " " + t("pctLthr"), bv = bp(s.ha) ? " (≈ " + (ramp ? bp(s.ha) + " → " + bp(s.hb) : bp(s.ha)) + " bpm)" : "";
    return d + " · ♥ " + hv + bv + "\n" + t("tipZ", zoneOf((s.a + s.b) / 2), mmss(s.start));
  }
  const val = wmode ? wat + " W (" + pct + t("pctFtp") + ")" : pct + (pace ? t("pctPace") : t("pctFtp")) + (!pace && ftp > 0 ? " (" + wat + " W)" : "");
  return d + " · " + val + (s.g != null ? " · ⛰ " + s.g.toFixed(1) + " %" : "") + "\n" + t("tipZ", zoneOf((s.a + s.b) / 2), mmss(s.start));
}
{
  const cb = $("chart");
  const over = e => {
    const tip = cb.querySelector(".tip"); if(!tip) return;
    const p = e.target.closest ? e.target.closest("path[data-n]") : null;
    if(!p){ tip.hidden = true; return; }
    if(tip.dataset.n !== p.dataset.n){ tip.dataset.n = p.dataset.n; tip.textContent = tipText(cb._steps[+p.dataset.n], curFtp(), /Run|Swim/.test($("sport").value)); }
    tip.hidden = false;
    const r = cb.getBoundingClientRect();
    tip.style.left = Math.max(0, Math.min(e.clientX - r.left - tip.offsetWidth / 2, r.width - tip.offsetWidth)) + "px";
    tip.style.top = (e.clientY - r.top - tip.offsetHeight - 12) + "px";
  };
  ["pointermove", "pointerdown"].forEach(ev => cb.addEventListener(ev, over));
  cb.addEventListener("pointerleave", () => { const tip = cb.querySelector(".tip"); if(tip) tip.hidden = true; });
}
// Drag & drop des blocs du graphe d'aperçu : glisser un bloc pour le déplacer
let chartDrag = null;
$("chart").addEventListener("pointerdown", e => {
  const p = e.target.closest ? e.target.closest("path[data-n]") : null;
  if(!p || e.button !== 0 || !$("prev").offsetParent) return;
  const steps = parseWorkout($("desc").value, $("sport").value, curFtp());
  if(steps.length < 2) return;
  chartDrag = {idx: +p.dataset.n, x: e.clientX, y: e.clientY, moved: false, steps};
  e.preventDefault();
});
window.addEventListener("pointermove", e => {
  if(!chartDrag) return;
  if(!chartDrag.moved){
    if(Math.hypot(e.clientX - chartDrag.x, e.clientY - chartDrag.y) < 8) return;
    if(chartDrag.steps.length < 2){ chartDrag = null; return; }
    chartDrag.moved = true;
  }
  const svg = $("chart").querySelector("svg");
  if(!svg) return;
  const r = svg.getBoundingClientRect(), fx = Math.max(0, Math.min(1, (e.clientX - r.left) / Math.max(r.width, 1)));
  const arr = chartDrag.steps, drag = arr.splice(chartDrag.idx, 1)[0];
  const total = arr.reduce((s, x) => s + x.d, 0);
  let pos = arr.length, acc = 0;
  for(let i = 0; i < arr.length; i++){ acc += arr[i].d; if(fx * total < acc){ pos = i; break; } }
  arr.splice(pos, 0, drag);
  chartDrag.idx = pos;
  renderChart(arr);
  const tip = $("chart").querySelector(".tip"); if(tip) tip.hidden = true;
});
window.addEventListener("pointerup", () => {
  if(!chartDrag) return;
  const d = chartDrag; chartDrag = null;
  if(!d.moved) return;
  pushUndo();
  $("desc").value = stepsToDesc(d.steps);
  selLine = null; renderChart();
  say("dragDone", "ok");
});
window.addEventListener("pointercancel", () => { chartDrag = null; });
$("desc").addEventListener("input", () => { selLine = null; renderChart(); });
const syncUnit = () => { $("unit").disabled = !isBike($("sport").value); };
$("sport").onchange = () => { syncUnit(); renderChart(); };
$("trash").onclick = () => { $("name").value = ""; $("desc").value = ""; selLine = null; EXPL = null; UNDO = null; $("undoBtn").hidden = true; $("prev").hidden = true; setSrcAct(null); if(PLAN.edit) planEdEnd(); renderChart(); CALEDIT = null; calEdUI(); say("previewDeleted", "ok"); };

