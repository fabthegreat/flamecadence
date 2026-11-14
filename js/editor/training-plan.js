/* FlameCadence - Training plan builder */
// ---------- Constructeur de plan d'entraînement ----------
// Génère un plan à partir de la bibliothèque : jours + séances/semaine + durée + objectif + date de début,
// puis envoie chaque séance dans le calendrier intervals.icu (une requête par séance, comme « Envoyer »).
const PCATS = {force:"force",beginner:"beginner",short:"beginner",recovery:"recovery",bz_recovery:"recovery",taper:"recovery",endurance:"endurance",bz_endurance:"endurance",tempo:"tempo",sweetspot:"tempo",bz_tempo:"tempo",threshold:"threshold",bz_threshold:"threshold",vo2max:"vo2max",bz_vo2max:"vo2max",anaerobic:"vo2max",fast:"vo2max",sprint:"sprint",bz_sprint:"sprint"};
// [catégorie clé 1re moitié, catégorie clé 2e moitié, 2e séance de qualité]
const PGOAL = {base: ["endurance", "tempo", "endurance"], ftp: ["tempo", "threshold", "tempo"], vo2: ["threshold", "vo2max", "tempo"], sprint: ["tempo", "sprint", "endurance"], start: ["beginner", "beginner", "endurance"],
  sweet: ["tempo", "tempo", "endurance"], thr: ["threshold", "threshold", "tempo"], pol: ["vo2max", "vo2max", "endurance"],
  gran: ["endurance", "tempo", "endurance", 0.6], climb: ["tempo", "threshold", "threshold", 0.4], crit: ["vo2max", "sprint", "threshold"], force: ["force", "force", "tempo"],
  maint: ["endurance", "tempo", "endurance", 0, 0.5], ret: ["endurance", "endurance", "recovery", 0, 0.55]};
// goal = [clé 1re moitié, clé 2e moitié, 2e qualité, biais sortie longue (0-1), plafond de charge (0-1)]
const PROLES = {1: "L", 2: "KL", 3: "KEL", 4: "KEJL", 5: "KEJRL", 6: "KEJERL", 7: "KEJRERL"}; // K clé, J 2e qualité, E endurance, R récup, L sortie longue
const PLAN = {items: []}; let PPOOL = null;
function planPool(){
  if(PPOOL) return PPOOL; PPOOL = {};
  LIBRARY.forEach(w => {
    const c = PCATS[w.category]; if(!c) return;
    const st = parseWorkout(w.desc_en, "Ride", 0), stt = stepsStats(st); if(!stt) return;
    (PPOOL[c] = PPOOL[c] || []).push({w, mins: st.reduce((s, x) => s + x.d, 0) / 60, tss: stt.tss});
  });
  return PPOOL;
}
function planPick(cat, q, maxMin, by, used){
  let a = (planPool()[cat] || []).filter(x => x.mins <= maxMin);
  if(!a.length) a = (planPool()[cat] || []).slice().sort((x, y) => x.mins - y.mins).slice(0, 3); // rien ne rentre : les plus courtes
  if(!a.length) return null;
  a = a.slice().sort((x, y) => x[by] - y[by]);
  const k = Math.round(q * (a.length - 1)); let best = null;
  for(let d = 0; d < a.length && !best; d++) for(const i of [k - d, k + d]) if(a[i] && !used.has(a[i].w.id)){ best = a[i]; break; }
  best = best || a[k]; used.add(best.w.id); return best;
}
function planBuild(){
  const weeks = Math.min(24, Math.max(1, +$("pweeks").value || 8)), goal = PGOAL[$("pgoal").value], maxMin = +$("pmax").value || 90;
  const days = [...document.querySelectorAll("#pdays input:checked")].map(i => +i.value).sort((a, b) => (a + 6) % 7 - (b + 6) % 7); // lundi d'abord
  if(!days.length) return say("pNone", "err");
  const n = Math.min(days.length, Math.max(1, +$("psess").value || 3));
  const wo = d => (d + 6) % 7, spread = (a, k) => k <= 0 ? [] : k >= a.length ? a : k === 1 ? [a[a.length - 1]] : Array.from({length: k}, (_, i) => a[Math.round(i * (a.length - 1) / (k - 1))]);
  const hardSel = [...document.querySelectorAll("#phard input:checked")].map(i => +i.value).filter(d => days.includes(d)).sort((a, b) => wo(a) - wo(b));
  let use, roleArr;
  if(!hardSel.length){ // automatique
    use = spread(days, n); roleArr = [...PROLES[use.length]];
  } else { // jours durs choisis : qualité (K puis J en alternance) sur eux, endurance ailleurs, sortie longue le dernier jour non dur
    const hs = hardSel.slice(0, n), rest = days.filter(d => !hs.includes(d));
    use = hs.concat(spread(rest, n - hs.length)).sort((a, b) => wo(a) - wo(b));
    const easy = use.filter(d => !hs.includes(d)), lastEasy = easy[easy.length - 1];
    roleArr = use.map(d => hs.includes(d) ? (hs.indexOf(d) % 2 ? "J" : "K") : d === lastEasy ? "L" : "E");
  }
  const start = new Date(($("pstart").value || iso(new Date())) + "T12:00:00"), mon = new Date(start); mon.setDate(mon.getDate() - (start.getDay() + 6) % 7);
  const used = new Set(), items = [], lb = goal[3] || 0, qcap = goal[4] || 0.95;
  for(let w = 0; w < weeks; w++){
    const rec = w % 4 === 3 || (weeks >= 6 && w === weeks - 1), q = rec ? 0.1 : Math.min(qcap, 0.2 + 0.7 * w / Math.max(weeks - 1, 1)), key = w < weeks / 2 ? goal[0] : goal[1];
    // semaine de récupération : plus aucune séance dure (clé → endurance, 2e qualité / endurance → récup), durées plafonnées
    const lightMax = Math.max(30, Math.round(maxMin * 0.6)), longMax = Math.max(45, Math.round(maxMin * 0.65));
    use.forEach((d, i) => {
      const date = new Date(mon); date.setDate(mon.getDate() + w * 7 + (d + 6) % 7); if(date < start && w === 0 && date.toDateString() !== start.toDateString()) return;
      const r = roleArr[i], pk = rec
        ? (r === "K" ? planPick("endurance", 0.15, lightMax, "tss", used) : r === "L" ? planPick("endurance", 0.2, longMax, "mins", used) : planPick("recovery", r === "J" ? 0.5 : 0.3, lightMax, "tss", used))
        : r === "K" ? planPick(key, q, maxMin, "tss", used) : r === "J" ? planPick(goal[2], q, maxMin, "tss", used)
        : r === "R" ? planPick("recovery", q, maxMin, "tss", used) : r === "L" ? planPick("endurance", Math.max(q, lb), maxMin, "mins", used) : planPick("endurance", q, maxMin, "tss", used);
      if(pk) items.push({date: iso(date), week: w + 1, w: pk.w, mins: pk.mins, tss: pk.tss, cat: PCATS[pk.w.category], rec});
    });
    if(rec){ // la charge de la semaine doit tomber à ~65 % de la moyenne des semaines de charge précédentes : on allège la séance la plus lourde tant que nécessaire
      const wt = k => items.filter(x => x.week === k).reduce((a, x) => a + x.tss, 0), prev = [];
      for(let k = w; k >= 1 && prev.length < 3; k--) if(!items.some(x => x.week === k && x.rec) && wt(k) > 0) prev.push(wt(k));
      const cur = items.filter(x => x.week === w + 1);
      if(prev.length && cur.length){
        const target = 0.65 * prev.reduce((a, x) => a + x, 0) / prev.length; let tot = wt(w + 1);
        for(let g = 0; tot > target && g < 12; g++){
          const hv = cur.reduce((b, x) => x.tss > b.tss ? x : b, cur[0]), alt = planPick("recovery", 0, lightMax, "tss", used);
          if(!alt || alt.tss >= hv.tss) break;
          tot -= hv.tss - alt.tss; Object.assign(hv, {w: alt.w, mins: alt.mins, tss: alt.tss, cat: PCATS[alt.w.category]});
        }
      }
    }
  }
  PLAN.items = items; PLAN.maxMin = maxMin; $("paisum").hidden = true; planRender();
}
function planRender(){
  ppHide();
  if(PLAN.edit && !PLAN.items.includes(PLAN.edit)){ planEdEnd(); } // la séance éditée a disparu (suppression, nouveau plan)
  const L = PLAN.items, box = $("pbox"); if(!box) return;
  $("psend").hidden = !L.length;
  if(!L.length){ box.innerHTML = ""; $("psum").textContent = ""; $("paisum").hidden = true; return; }
  const fmt = new Intl.DateTimeFormat(lang, {weekday: "short", day: "numeric", month: "short"}), wk = {};
  L.forEach((x, i) => (wk[x.week] = wk[x.week] || []).push([x, i]));
  const wkTss = Object.keys(wk).map(k => ({k, tss: wk[k].reduce((s, [x]) => s + x.tss, 0), h: wk[k].reduce((s, [x]) => s + x.mins, 0) / 60, rec: !!wk[k][0][0].rec})), mxT = Math.max(1, ...wkTss.map(o => o.tss));
  const chartHtml = `<div class="pwk" role="img" aria-label="${esc(t("pChartT"))}">` + wkTss.map(o => `<div${o.rec ? ' class="rec"' : ""} title="${esc(t("pWeek", o.k) + " · " + o.h.toFixed(1) + " h · TSS " + Math.round(o.tss) + (o.rec ? " (" + t("pRecW") + ")" : ""))}"><i style="height:${(o.tss / mxT * 100).toFixed(1)}%"></i><span>${o.k}</span></div>`).join("") + "</div>";
  const tot = {n: L.length, h: L.reduce((q, x) => q + x.mins, 0) / 60, tss: Math.round(L.reduce((q, x) => q + x.tss, 0))};
  const fWd = new Intl.DateTimeFormat(lang, {weekday: "short"}), fMo = new Intl.DateTimeFormat(lang, {month: "short"});
  const ico = (path, cls, key, attr) => `<button class="alt small icon${cls}" ${attr} type="button" aria-label="${esc(t(key))}" title="${esc(t(key))}"><svg viewBox="0 0 24 24" aria-hidden="true" style="width:16px;height:16px">${path}</svg></button>`;
  const sumHtml = `<div class="pl-sum"><div><b>${tot.n}</b><span>${esc(t("pSumS"))}</span></div><div><b>${tot.h.toFixed(1)}</b><span>${esc(t("pSumH"))}</span></div><div><b>${tot.tss}</b><span>TSS</span></div><div><b>${Object.keys(wk).length}</b><span>${esc(t("pSumW"))}</span></div></div>`;
  box.innerHTML = sumHtml + `<div class="pl-ct">${esc(t("pChartT"))}</div>` + chartHtml + Object.keys(wk).map(k => {
    const a = wk[k], h = a.reduce((q, [x]) => q + x.mins, 0) / 60, tss = a.reduce((q, [x]) => q + x.tss, 0), rec = !!a[0][0].rec;
    return `<section class="pl-week${rec ? " rec" : ""}"><header class="pl-wh"><span class="pl-wn">${esc(t("pWeek", k))}</span><span class="pl-bs"><span class="pl-b">${h.toFixed(1)} h</span><span class="pl-b">TSS ${Math.round(tss)}</span>${rec ? `<span class="pl-b rec">${esc(t("pRecW"))}</span>` : ""}</span></header>` + a.map(([x, i]) => {
      const d = new Date(x.date + "T12:00:00"), nm = lang === "fr" ? x.w.name_fr : x.w.name_en;
      return `<div class="pl-row"><div class="pl-date"><small>${esc(fWd.format(d))}</small><b>${d.getDate()}</b><small>${esc(fMo.format(d))}</small></div><div class="pl-main"><div class="pl-name" title="${esc(nm)}">${esc(nm)}</div><div class="pl-meta">${Math.round(x.mins)}′ · TSS ${Math.round(x.tss)}</div></div><span class="plan-prev" data-pi="${i}" aria-hidden="true"><span class="pps">${workoutPreviewSvg(x.w.desc_en, $("psport").value, curFtp())}</span>${zoneBar(zoneTimes(parseWorkout(x.w.desc_en, $("psport").value, curFtp())), true)}</span><div class="pl-act">`
        + ico('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', "", "pEdit", `data-pedit="${i}"`)
        + ico('<path d="M4 8h16M16 4l4 4-4 4M20 16H4M8 12l-4 4 4 4"/>', "", "pSwap", `data-pswap="${i}"`)
        + ico('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/>', " danger", "del", `data-pdel="${i}"`) + `</div></div>`;
    }).join("") + `</section>`;
  }).join("");
  $("psum").textContent = "";
}
// ---- Agrandissement du mini-graphique au survol : blocs détaillés (durée, puissance, consigne) ----
var PPOP = null, PPT = 0, PPM = null;
function ppEl(){
  if(PPOP) return PPOP;
  const d = document.createElement("div"); d.id = "pplan"; d.hidden = true; document.body.appendChild(d);
  d.addEventListener("mouseenter", () => clearTimeout(PPT));
  d.addEventListener("mouseleave", ppHideSoon);
  d.addEventListener("mousemove", ppMove);
  d.addEventListener("click", e => { // remplacer la séance puis rouvrir l'agrandissement sur la nouvelle séance
    const eb = e.target.closest && e.target.closest("[data-ppedit]"); if(eb){ planEdit(+eb.dataset.ppedit); return; }
    const b = e.target.closest && e.target.closest("[data-ppswap]"); if(!b) return;
    const i = b.dataset.ppswap; planSwap(+i);
    const pv = document.querySelector(`#pbox .plan-prev[data-pi="${i}"]`); if(pv) ppShow(pv);
  });
  return PPOP = d;
}
function ppHide(){ clearTimeout(PPT); PPM = null; if(PPOP){ PPOP.hidden = true; delete PPOP.dataset.pi; } }
function ppHideSoon(){ clearTimeout(PPT); PPT = setTimeout(ppHide, 220); }
const ppDur = sec => { sec = Math.round(sec); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), r = sec % 60; return [h ? h + " h" : "", m ? m + " min" : "", r ? r + " s" : ""].filter(Boolean).join(" ") || "0 s"; };
function ppShow(pv){
  clearTimeout(PPT);
  if(PPOP && !PPOP.hidden && PPOP.dataset.pi === pv.dataset.pi) return; // déjà affiché : les survols des enfants ne le redessinent pas
  const x = PLAN.items[+pv.dataset.pi]; if(!x) return;
  const ftp = ftpFor($("psport").value), steps = parseWorkout(x.w.desc_en, $("psport").value, ftp); if(!steps.length) return;
  const lines = x.w.desc_en.split("\n"), T = steps.reduce((q, st) => q + st.d, 0);
  const VW = 480, VH = 168, X0 = 32, X1 = 474, Y0 = 6, YB = 138, peak = Math.ceil(Math.max(120, ...steps.map(st => Math.max(st.a, st.b))) / 10) * 10;
  const yy = v => YB - v / peak * (YB - Y0), xx = sec => X0 + sec / T * (X1 - X0);
  let t0 = 0, paths = "";
  const model = steps.map((st, k) => {
    const m = {t0, t1: t0 + st.d, a: st.a, b: st.b, cue: ((lines[st.line] || "").match(/%\s*(.*)$/) || [])[1] || ""};
    const xa = xx(m.t0), xb = Math.max(xx(m.t1), xa + 1.2);
    paths += `<path class="z${zoneOf((st.a + st.b) / 2)}" data-s="${k}" d="M${xa.toFixed(2)} ${YB}L${xa.toFixed(2)} ${yy(st.a).toFixed(1)}L${xb.toFixed(2)} ${yy(st.b).toFixed(1)}L${xb.toFixed(2)} ${YB}Z"/>`;
    t0 += st.d; return m;
  });
  let grid = "";
  for(const g of [50, 100, 150].filter(v => v <= peak)) grid += `<line x1="${X0}" x2="${X1}" y1="${yy(g).toFixed(1)}" y2="${yy(g).toFixed(1)}" stroke="currentColor" stroke-opacity="${g === 100 ? .55 : .25}" stroke-dasharray="3 3"/><text x="${X0 - 4}" y="${(yy(g) + 3).toFixed(1)}" font-size="9" text-anchor="end" fill="currentColor">${g}%</text>`;
  const stepMin = [5, 10, 15, 20, 30, 60].find(v => T / 60 / v <= 8) || 120;
  for(let m = 0; m * 60 <= T; m += stepMin) grid += `<text x="${xx(m * 60).toFixed(1)}" y="${YB + 14}" font-size="9" text-anchor="${m === 0 ? "start" : "middle"}" fill="currentColor">${m}′</text>`;
  PPM = {model, T, VW, X0, X1, ftp};
  const d = ppEl();
  d.dataset.pi = pv.dataset.pi;
  d.innerHTML = `<div class="pph"><b>${esc(lang === "fr" ? x.w.name_fr : x.w.name_en)}</b><span>${esc(hm(T))} · TSS ${Math.round(x.tss)}</span></div><svg viewBox="0 0 ${VW} ${VH}" role="img" aria-label="${esc(lang === "fr" ? x.w.name_fr : x.w.name_en)}">${grid}${paths}</svg><div class="pi hint">${esc(t("pPopHint"))}</div><div style="margin-top:8px"><button type="button" class="alt small" data-ppswap="${esc(pv.dataset.pi)}"><svg viewBox="0 0 24 24" aria-hidden="true" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M4 8h16M16 4l4 4-4 4M20 16H4M8 12l-4 4 4 4"/></svg>${esc(t("pSwap"))}</button> <button type="button" class="alt small" data-ppedit="${esc(pv.dataset.pi)}"><svg viewBox="0 0 24 24" aria-hidden="true" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>${esc(t("pEdit"))}</button></div>`;
  const w = Math.min(500, innerWidth - 16); d.style.width = w + "px"; d.hidden = false;
  const r = pv.getBoundingClientRect(), h = d.offsetHeight;
  d.style.left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8)) + "px";
  d.style.top = (r.bottom + h + 8 < innerHeight ? r.bottom + 2 : Math.max(8, r.top - h - 2)) + "px";
}
function ppMove(e){
  if(!PPM || !PPOP) return;
  const svg = PPOP.querySelector("svg"); if(!svg) return;
  const R = svg.getBoundingClientRect(), k = R.width / PPM.VW, info = PPOP.querySelector(".pi");
  if(e.target.closest && !e.target.closest("svg")) return;
  PPOP.querySelectorAll("path.on").forEach(q => q.classList.remove("on"));
  const px = (e.clientX - R.left) / k, sec = (px - PPM.X0) / (PPM.X1 - PPM.X0) * PPM.T, tol = 2.5 / ((PPM.X1 - PPM.X0) / PPM.T); // tolérance ≈ 2,5 px : les blocs très courts restent attrapables
  let best = -1;
  PPM.model.forEach((m, i) => { if(sec >= m.t0 - tol && sec <= m.t1 + tol && (best < 0 || m.t1 - m.t0 < PPM.model[best].t1 - PPM.model[best].t0)) best = i; });
  if(best < 0){ info.textContent = t("pPopHint"); return; }
  const m = PPM.model[best], ramp = Math.abs(m.a - m.b) > 0.5, f = PPM.ftp, W = v => f > 0 ? Math.round(v * f / 100) : 0;
  const pw = ramp ? `${Math.round(m.a)}→${Math.round(m.b)}% FTP${f > 0 ? " (" + W(m.a) + "→" + W(m.b) + " W)" : ""}` : `${Math.round(m.a)}% FTP${f > 0 ? " (" + W(m.a) + " W)" : ""}`;
  PPOP.querySelector(`path[data-s="${best}"]`).classList.add("on");
  info.innerHTML = `<b>${esc(ppDur(m.t1 - m.t0))}</b> · ${esc(pw)}${m.cue ? " · " + esc(m.cue) : ""}<br><span style="opacity:.75">${esc(ppDur(m.t0))} → ${esc(ppDur(m.t1))}</span>`;
}
$("pbox").addEventListener("mouseover", e => { const pv = e.target.closest && e.target.closest(".plan-prev"); if(pv) ppShow(pv); });
$("pbox").addEventListener("mouseout", e => { const pv = e.target.closest && e.target.closest(".plan-prev"); if(pv && !pv.contains(e.relatedTarget)) ppHideSoon(); });
$("pbox").addEventListener("click", e => { const pv = e.target.closest && e.target.closest(".plan-prev"); if(pv) ppShow(pv); });
document.addEventListener("click", e => { if(PPOP && !PPOP.hidden && !(e.target.closest && (e.target.closest(".plan-prev") || e.target.closest("#pplan")))) ppHide(); });
document.addEventListener("keydown", e => { if(e.key === "Escape") ppHide(); });
// ---- Modification d'une séance du plan : elle est copiée dans le bloc Aperçu, puis réinjectée dans le plan ----
PLAN.edit = null;
function planEdUI(){
  const x = PLAN.edit, on = !!x;
  document.documentElement.classList.toggle("pl-edit", on);
  $("planedbar").hidden = !on; $("plsave").hidden = !on; $("send").hidden = on; // pas d'envoi d'une séance isolée pendant l'édition
  if(on) $("planedtxt").textContent = t("pEdBanner", lang === "fr" ? x.w.name_fr : x.w.name_en, new Date(x.date + "T12:00:00").toLocaleDateString(loc(), {weekday: "short", day: "numeric", month: "short"}));
}
function planEdit(i){
  const x = PLAN.items[i]; if(!x) return;
  ppHide();
  $("sport").value = $("psport").value; syncUnit();
  $("name").value = (lang === "fr" ? x.w.name_fr : x.w.name_en) || x.w.name_en || "";
  $("desc").value = (lang === "fr" ? x.w.desc_fr : x.w.desc_en) || x.w.desc_en || ""; // en % de FTP : la conversion en watts se fait à l'envoi, comme pour le reste du plan
  EXPL = {en: x.w.expl_en, fr: x.w.expl_fr}; selLine = null; UNDO = null; $("undoBtn").hidden = true;
  PLAN.edit = x; planEdUI();
  $("prev").hidden = false; setSrcAct(null); renderChart();
  $("prev").scrollIntoView({behavior: "smooth", block: "start"});
}
// fin de l'édition : l'aperçu est vidé (comme avec la corbeille) pour ne pas laisser la séance du plan dans les autres onglets
function planEdEnd(){
  PLAN.edit = null; planEdUI();
  $("name").value = ""; $("desc").value = ""; selLine = null; EXPL = null; UNDO = null; $("undoBtn").hidden = true;
  $("prev").hidden = true; setSrcAct(null); renderChart();
}
$("planedx").onclick = planEdEnd;
$("plsave").onclick = () => {
  const x = PLAN.edit; if(!x) return;
  const sp = $("psport").value, desc = $("desc").value, steps = parseWorkout(desc, sp, ftpFor(sp));
  if(!steps.length) return say("prevEmpty", "err");
  const st = stepsStats(steps), nm = $("name").value.trim() || x.w.name_en;
  x.w = {...x.w, name_en: nm, name_fr: nm, desc_en: desc, desc_fr: desc}; // même forme qu'une séance de la bibliothèque : aperçus, stats et envoi fonctionnent tels quels
  x.mins = st.total / 60; x.tss = st.tss;
  planEdEnd(); planRender(); say("pEdDone", "ok");
  $("pbox").scrollIntoView({behavior: "smooth", block: "start"});
};
function planSwap(i){
  const x = PLAN.items[i]; if(!x) return;
  const pool = planPool()[x.cat] || [], inPlan = new Set(PLAN.items.map(y => y.w.id)), lim = PLAN.maxMin || 90;
  let c = pool.filter(p => p.w.id !== x.w.id && p.mins <= lim);
  if(!c.length) c = pool.filter(p => p.w.id !== x.w.id);
  if(!c.length) return;
  if(x === PLAN.edit){ planEdEnd(); } // remplacée : l'édition en cours n'a plus d'objet
  x.tried = x.tried || [x.w.id];
  let f = c.filter(p => !inPlan.has(p.w.id) && !x.tried.includes(p.w.id));
  if(!f.length){ x.tried = [x.w.id]; f = c.filter(p => !inPlan.has(p.w.id)); }
  if(!f.length) f = c;
  const near = p => Math.abs(p.tss - x.tss) + Math.abs(p.mins - x.mins) * 0.5; // plus proche en charge et en durée
  f.sort((a, b) => near(a) - near(b));
  const n = f[0]; x.tried.push(n.w.id);
  x.w = n.w; x.mins = n.mins; x.tss = n.tss; planRender();
}
function planDays(){
  const box = $("pdays"), hb = $("phard"); if(!box || !hb) return;
  const first = !box.children.length;
  const on = first ? new Set([2, 4, 0]) : new Set([...box.querySelectorAll("input:checked")].map(i => +i.value));
  const hard = first ? new Set() : new Set([...hb.querySelectorAll("input:checked")].map(i => +i.value));
  const f = new Intl.DateTimeFormat(lang, {weekday: "short"});
  const row = (set, acc) => [1, 2, 3, 4, 5, 6, 0].map(d => `<label style="display:flex;align-items:center;gap:5px;margin:0;cursor:pointer"><input type="checkbox" value="${d}" style="width:auto;margin:0;accent-color:${acc}"${set.has(d) ? " checked" : ""}>${esc(f.format(new Date(2024, 0, 7 + d)))}</label>`).join("");
  box.innerHTML = row(on, "var(--acc)"); hb.innerHTML = row(hard, "#ee6c4d"); planHardWarn(); if(first) planSyncDays();
}
function planHardWarn(){
  const h = [...$("phard").querySelectorAll("input:checked")].map(i => +i.value), adj = h.some(d => h.includes((d + 1) % 7));
  $("phardwarn").hidden = !adj; if(adj) $("phardwarn").textContent = t("pHardAdj");
}
// Nombre de séances choisi → jours d'entraînement répartis régulièrement sur la semaine (sortie longue le dimanche),
// et jours durs limités aux séances de qualité (1 jusqu'à 3 séances, 2 au-delà), jamais le jour de la sortie longue.
function planAutoDays(n){
  n = Math.min(7, Math.max(1, Math.round(n))); const g = 7 / n;
  let wo = Array.from({length: n}, (_, i) => 6 - Math.min(6, Math.ceil(i * g - 1e-9))).sort((x, y) => x - y); // 0 = lundi … 6 = dimanche
  const role = PROLES[n], val = w => (w + 1) % 7;
  let hard = wo.filter((_, i) => role[i] === "K" || role[i] === "J");
  // 4 séances : habitude de planification → séances dures mardi et jeudi, endurance le samedi, sortie longue le dimanche
  if(n === 4){ wo = [1, 3, 5, 6]; hard = [1, 3]; }
  const setDays = (box, list) => box.querySelectorAll("input").forEach(i => { i.checked = list.includes(+i.value); });
  setDays($("pdays"), wo.map(val)); setDays($("phard"), hard.map(val)); planHardWarn();
}
// jours d'entraînement (et jours durs) déduits du nombre de séances par semaine
function planSyncDays(){ const v = $("psess").value; if(/^[1-7]$/.test(v)) planAutoDays(+v); }
["input", "change"].forEach(ev => $("psess").addEventListener(ev, planSyncDays));
$("pdays").addEventListener("change", e => { // un jour décoché ne peut plus être un jour dur
  const i = e.target; if(i.checked) return; const h = $("phard").querySelector(`input[value="${i.value}"]`); if(h) h.checked = false; planHardWarn();
});
$("phard").addEventListener("change", e => { // un jour dur est forcément un jour d'entraînement
  const i = e.target; if(i.checked){ const d = $("pdays").querySelector(`input[value="${i.value}"]`); if(d) d.checked = true; } planHardWarn();
});
const planDesc = w => { const d = lang === "fr" ? w.desc_fr : w.desc_en; const f = ftpFor($("psport").value); return $("punit").value === "w" && f > 0 ? toWatts(d, f) : d; }; // % de FTP ou watts (FTP du type de sortie)

