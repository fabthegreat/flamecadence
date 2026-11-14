/* FlameCadence - Dashboard: next planned workout card, readiness */
// --- Widget « Prochaine séance planifiée » : graphe des étapes (infobulle au survol) + programme intervals.icu repliable ---
let NEXT_OPEN = store.get("si_nextopen") === "1";
async function loadNext(){
  if(!KEY()) return;
  const tok = ++NEXT.tok, today = iso(new Date());
  const [evs, acts, well] = await Promise.all([
    icu(`/events?oldest=${today}&newest=${daysAgo(-60)}&category=WORKOUT`),
    icu(`/activities?oldest=${today}&newest=${today}`).catch(() => []),
    icu(`/wellness?oldest=${daysAgo(8)}&newest=${today}`).catch(() => []) // pour le conseil de récupération
  ]);
  if(tok !== NEXT.tok) return; // une réponse plus récente est déjà arrivée
  // même règle que le calendrier : on ignore les séances d'un jour déjà réalisé, et celles déjà liées à une activité
  NEXT.ev = mergeCal(evs, acts).filter(e => !e.paired_activity_id).sort((x, y) => (x.start_date_local || "").localeCompare(y.start_date_local || ""))[0] || null;
  NEXT.well = Array.isArray(well) ? well : []; NEXT.loaded = true; renderNext(); updateIcuLinks(); libAutoRefresh();
}
refreshBtn("rnext", () => loadNext().catch(e => { $("nextbox").textContent = t("errI", errText(e)); }));
$("nextedit").onclick = () => { if(NEXT.ev) calEdit(NEXT.ev); };
// Infos par étape pour l'infobulle : début, intitulé de la section du programme (« Main set ») et numéro de répétition (3/10)
function nextMeta(e, steps){
  const hdr = [], rx = /\d(?:[.,]\d+)?\s*%|\d(?:[.,]\d+)?\s*w\b|\bz[1-7]\b/i;
  let cur = "";
  (e.description || "").split("\n").forEach((raw, i) => {
    const l = raw.trim();
    if(!l){ cur = ""; return; }
    if(l.startsWith("-") || rx.test(l)){ hdr[i] = cur; return; }
    cur = l;
  });
  const seen = {}, tot = {};
  steps.forEach(s => { if(s.line != null) tot[s.line] = (tot[s.line] || 0) + 1; });
  let t0 = 0;
  return steps.map(s => {
    const has = s.line != null, k = has ? (seen[s.line] = (seen[s.line] || 0) + 1) : 0, n = has ? tot[s.line] : 0;
    const name = (has ? (hdr[s.line] || "").replace(/\s*\d+\s*x\s*$/i, "") : (s.text || "")).trim();
    const m = {d: s.d, a: s.a, b: s.b, start: t0, line: s.line, label: [name, n > 1 ? k + "/" + n : ""].filter(Boolean).join(" · ")};
    t0 += s.d; return m;
  });
}
function nextChartSvg(meta, label){
  const total = meta.reduce((s, m) => s + m.d, 0), peak = Math.max(120, ...meta.map(m => Math.max(m.a, m.b)));
  const W = 300, H = 100; let x = 0, path = "";
  meta.forEach((m, i) => {
    const w = m.d / total * W, ya = H - m.a / peak * (H - 4), yb = H - m.b / peak * (H - 4);
    path += `<path data-n="${i}" class="z${zoneOf((m.a + m.b) / 2)}" d="M${x.toFixed(2)} ${H}L${x.toFixed(2)} ${ya.toFixed(1)}L${(x + w).toFixed(2)} ${yb.toFixed(1)}L${(x + w).toFixed(2)} ${H}Z"/>`;
    x += w;
  });
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(label)}">${path}</svg>`;
}
// Programme au format intervals.icu (texte de la séance), avec l'équivalent en watts à côté des % ; sans texte : reconstruit depuis les étapes
function nextProgHtml(e, steps, ftp, pace){
  const ann = l => {
    if(pace || !(ftp > 0)) return "";
    const m = l.match(/(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?\s*%/); if(!m) return "";
    const a = parseFloat(m[1].replace(",", ".")), b = m[2] ? parseFloat(m[2].replace(",", ".")) : a, W = v => Math.round(v * ftp / 100);
    return `<span class="w"> · ${a === b ? W(a) : W(a) + "–" + W(b)} W</span>`;
  };
  const dt = sec => { sec = Math.round(sec); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + "h" : "") + (m ? m + "m" : "") + (s ? s + "s" : "") || "0s"; };
  const rx = /\d(?:[.,]\d+)?\s*%|\d(?:[.,]\d+)?\s*w\b|\bz[1-7]\b/i, txt = e.description || "";
  if(txt.trim()) return txt.split("\n").map((raw, i) => {
    const l = raw.trim();
    return !l ? `<div class="sp"></div>` : `<div data-l="${i}"${!l.startsWith("-") && !rx.test(l) ? ' class="hd"' : ""}>${esc(l)}${ann(l)}</div>`;
  }).join("");
  return steps.map(s => { const r = Math.abs(s.a - s.b) > 0.5, l = `- ${dt(s.d)} ${r ? Math.round(s.a) + "-" + Math.round(s.b) : Math.round(s.a)}%`; return `<div>${esc(l)}${ann(l)}</div>`; }).join("");
}
// Conseil de récupération (séance du jour) : forme (CTL − ATL), VFC, FC de repos et sommeil d'aujourd'hui comparés aux 7 jours précédents
function readinessHtml(hard){
  const W = (NEXT.well || []).filter(w => w && w.id), today = iso(new Date()), td = W.find(w => w.id === today);
  if(!td) return "";
  const base = key => { const v = W.filter(w => w.id < today && w[key] > 0).map(w => w[key]); return v.length >= 3 ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
  const why = [], det = [];
  const fw = W.filter(w => w.ctl != null).sort((a, b) => a.id < b.id ? -1 : 1).pop();
  if(fw){ const f = Math.round(fw.ctl - (fw.atl || 0)); det.push(t("fForm") + " " + (f > 0 ? "+" : "") + f); if(f <= -25) why.push(t("rdrForm", f)); }
  const h = td.hrv > 0 ? td.hrv : 0, hb = base("hrv");
  if(h){ det.push(t("rdHrv", Math.round(h), hb ? Math.round(hb) : "–")); if(hb && h <= hb * 0.9) why.push(t("rdrHrv", Math.round((1 - h / hb) * 100))); }
  const r = td.restingHR > 0 ? td.restingHR : 0, rb = base("restingHR");
  if(r){ det.push(t("rdRhr", Math.round(r), rb ? Math.round(rb) : "–")); if(rb && r >= rb * 1.05) why.push(t("rdrRhr", Math.round(r - rb))); }
  const sl = td.sleepSecs > 0 ? td.sleepSecs : 0;
  if(sl){ det.push(t("rdSleep", hm(sl))); if(sl < 6 * 3600) why.push(t("rdrSleep", hm(sl))); }
  if(!det.length) return "";
  const lvl = why.length >= 2 ? "low" : why.length === 1 ? "mid" : "ok", key = "rd" + (hard ? "H" : "O") + (lvl === "low" ? "L" : lvl === "mid" ? "M" : "O");
  return `<div class="rdy ${lvl}">${esc(t(key, why.join(", ")))}<small>${esc(det.join(" · "))}</small></div>`;
}
function renderNext(){
  const box = $("nextbox"), e = NEXT.ev, eb = $("nextedit");
  eb.hidden = true;
  if(!NEXT.loaded){ box.textContent = ""; return; }
  if(!e){ box.textContent = t("noNext"); return; }
  const sport = e.type || "Ride", pace = /Run|Swim/.test(sport), ftp = ftpFor(sport);
  const steps = plannedSteps(e, ftp), est = steps.length === 1 && !!steps[0].est, real = steps.length && !est;
  const meta = nextMeta(e, steps);
  const day = (e.start_date_local || "").slice(0, 10), d0 = new Date(day + "T12:00:00");
  const diff = Math.round((d0 - new Date(iso(new Date()) + "T12:00:00")) / 864e5);
  const rel = diff <= 0 ? t("nextToday") : diff === 1 ? t("nextTomorrow") : t("nextIn", diff);
  const hh = (e.start_date_local || "").slice(11, 16);
  const when = d0.toLocaleDateString(loc(), {weekday: "long", day: "numeric", month: "short"}) + (hh && hh !== "00:00" ? " · " + hh : "");
  const st = real ? stepsStats(steps) : null, kv = [];
  const total = st ? st.total : (e.moving_time || e.icu_training_time || 0);
  if(total) kv.push([t("lDur"), hm(total)]);
  if(st && !pace){
    kv.push([t("lAvgP"), ftp > 0 ? Math.round(st.avgPct * ftp / 100) + " W" : Math.round(st.avgPct) + " %"]);
    if(ftp > 0) kv.push([t("lNP"), Math.round(st.npPct * ftp / 100) + " W"]);
    kv.push([t("lIF"), st.iff.toFixed(2)]);
  }
  const load = e.icu_training_load > 0 ? e.icu_training_load : (st && !pace ? st.tss : 0);
  if(load) kv.push([t("lLoad"), Math.round(load)]);
  const prog = ((e.description || "").trim() || real) ? nextProgHtml(e, steps, ftp, pace) : "";
  // séance « dure » : IF ≥ 0,85 d'après les étapes, sinon charge ≥ 70 par heure
  const hard = st && !pace ? st.iff >= 0.85 : !!(load && total && load / (total / 3600) >= 70);
  box.innerHTML = `<div class="lt">${esc(e.name || actT(sport))}</div><div class="hint">${esc(rel)} · ${esc(when)} · ${esc(actT(sport))}</div>` +
    (diff <= 0 ? readinessHtml(hard) : "") +
    (steps.length ? `<div class="chart">${nextChartSvg(meta, (e.name || "") + " " + hm(total))}<div class="tip" hidden></div></div>` : "") +
    (real && !pace ? zoneBar(zoneTimes(steps)) : "") +
    (kv.length ? `<div class="kv">${kv.map(([l, v]) => `<div>${esc(l)}<b>${esc(v)}</b></div>`).join("")}</div>` : "") +
    (prog ? `<details class="fuel" id="nextprog"${NEXT_OPEN ? " open" : ""}><summary><b>${esc(t("nextProg"))}</b>${real ? " · " + esc(t("nextSteps", steps.length)) : ""}</summary><div class="prog">${prog}</div></details>` : "");
  const c = box.querySelector(".chart"); if(c){ c._steps = meta; c._ftp = ftp; c._pace = pace; }
  eb.hidden = !(isBike(sport) && (e.description || "").trim());
}
// Survol du graphe : infobulle (intitulé, durée, puissance, zone, début) et mise en évidence de la ligne correspondante du programme
(() => {
  const box = $("nextbox");
  const clearHl = () => box.querySelectorAll(".prog .hl").forEach(x => x.classList.remove("hl"));
  const hide = () => { const tip = box.querySelector(".chart .tip"); if(tip){ tip.hidden = true; delete tip.dataset.n; } clearHl(); };
  const over = ev => {
    const c = box.querySelector(".chart"), tip = c && c.querySelector(".tip"); if(!tip) return;
    const p = ev.target.closest ? ev.target.closest("path[data-n]") : null, m = p && c._steps ? c._steps[+p.dataset.n] : null;
    if(!m){ hide(); return; }
    if(tip.dataset.n !== p.dataset.n){
      tip.dataset.n = p.dataset.n;
      tip.textContent = (m.label ? m.label + "\n" : "") + tipText(m, c._ftp, c._pace);
      clearHl();
      if(m.line != null){ const row = box.querySelector(`.prog [data-l="${m.line}"]`); if(row) row.classList.add("hl"); }
    }
    tip.hidden = false;
    const r = c.getBoundingClientRect();
    tip.style.left = Math.max(0, Math.min(ev.clientX - r.left - tip.offsetWidth / 2, r.width - tip.offsetWidth)) + "px";
    tip.style.top = (ev.clientY - r.top - tip.offsetHeight - 12) + "px";
  };
  ["pointermove", "pointerdown"].forEach(n => box.addEventListener(n, over));
  box.addEventListener("pointerleave", hide);
  box.addEventListener("toggle", ev => { if(ev.target.id === "nextprog"){ NEXT_OPEN = ev.target.open; store.set("si_nextopen", NEXT_OPEN ? "1" : "0"); } }, true); // état replié/déplié mémorisé
})();
$("bper").onchange = $("bkind").onchange = () => { store.set("si_bkind", $("bkind").value); loadBest().catch(e => { $("bestbox").textContent = t("errI", errText(e)); }); };

