/* FlameCadence - Dashboard: training load chart and last-activity card */
function renderLoad(){
  if(!LAST.acts) return;
  const by = grp(LAST.acts), pl = grp(LAST.plan || []), wl = {};
  (LAST.well || []).forEach(w => { wl[w.id] = w; });
  const cols = []; let max = 1, tl = 0, tt = 0;
  for(let i = 13; i >= 0; i--){
    const k = daysAgo(i), L = by[k] || [], load = L.reduce((s, a) => s + (a.icu_training_load || 0), 0);
    max = Math.max(max, load); tl += load; tt += L.reduce((s, a) => s + (a.moving_time || 0), 0);
    cols.push({k, load, html: dayHtml(k, L, wl[k], pl[k] || [])});
  }
  LAST.days = cols.map(c => c.html);
  $("loadbox").innerHTML = `<div class="days">` + cols.map((c, n) => `<div class="d${c.k === daysAgo(0) ? " now" : ""}" data-n="${n}"><div class="bar${c.load > 120 ? " h3" : c.load > 60 ? " h2" : c.load > 0 ? " h1" : ""}" style="height:${c.load ? Math.max(4, c.load / max * 72) : 2}px"></div><span>${c.k.slice(8)}</span></div>`).join("") + `</div><div class="tip" hidden></div>`;
  const w = (LAST.well || [])[(LAST.well || []).length - 1];
  $("loadcap").textContent = t("loadCap", LAST.acts.length, hm(tt), Math.round(tl)) + (w && w.ctl != null ? t("loadCap2", Math.round(w.ctl), Math.round(w.atl), Math.round(w.ctl - w.atl)) : "");
}
function hoverTip(box, htmlOf){
  const move = e => {
    const tip = box.querySelector(".tip"); if(!tip) return;
    const d = e.target.closest ? e.target.closest("[data-n]") : null;
    if(!d || !box.contains(d)){ tip.hidden = true; return; }
    if(tip.dataset.n !== d.dataset.n){ tip.dataset.n = d.dataset.n; tip.innerHTML = htmlOf(+d.dataset.n); }
    tip.hidden = false;
    const r = box.getBoundingClientRect();
    tip.style.left = Math.max(0, Math.min(e.clientX - r.left - tip.offsetWidth / 2, r.width - tip.offsetWidth)) + "px";
    tip.style.top = (e.clientY - r.top + 16) + "px";
  };
  ["pointermove", "pointerdown"].forEach(ev => box.addEventListener(ev, move));
  box.addEventListener("pointerleave", () => { const tip = box.querySelector(".tip"); if(tip) tip.hidden = true; });
}
hoverTip($("loadbox"), i => LAST.days[i]);

// --- dernière séance ---
function ds(arr, n){
  if(!arr || !arr.length) return [];
  const w = Math.max(1, Math.floor(arr.length / n)), out = [];
  for(let i = 0; i < arr.length; i += w){
    let s = 0, c = 0;
    for(let j = i; j < Math.min(i + w, arr.length); j++){ const v = arr[j]; if(typeof v === "number" && !isNaN(v)){ s += v; c++; } }
    out.push(c ? s / c : 0);
  }
  return out;
}
function streamsSvg(){
  const w = ds(LAST.sw, 240), h = ds(LAST.sh, 240), n = Math.max(w.length, h.length);
  if(!n) return `<div class="hint">${esc(t("noStreams"))}</div>`;
  const X = i => (i / Math.max(1, n - 1) * 300).toFixed(1);
  let svg = `<svg id="lsvg" viewBox="0 0 300 90" preserveAspectRatio="none"><title>${esc(t("lCast"))}</title>`;
  if(w.length){ const m = Math.max(...w, 1); svg += `<path class="lp" d="M0 90${w.map((v, i) => `L${X(i)} ${(88 - v / m * 84).toFixed(1)}`).join("")}L300 90Z"/>`; }
  const hv = h.filter(v => v > 0);
  if(hv.length){ const lo = Math.min(...hv), hi = Math.max(...hv); svg += `<polyline class="lh" points="${h.map((v, i) => X(i) + "," + (88 - (Math.max(v, lo) - lo) / Math.max(1, hi - lo) * 80).toFixed(1)).join(" ")}"/>`; }
  const lg = [w.length ? `<span><i style="background:var(--acc)"></i>${esc(t("lPow"))} · max ${Math.round(Math.max(...w))} W</span>` : "", hv.length ? `<span><i style="background:#d6336c"></i>${esc(t("lHRs"))} · max ${Math.round(Math.max(...hv))} bpm</span>` : ""].join("");
  return svg + `</svg><div class="hint" id="linfo">&nbsp;</div><div class="leg">${lg}</div>`;
}
function renderLast(){
  const box = $("lastbox"), a = LAST.last;
  if(!LAST.acts){ box.textContent = ""; return; }
  if(!a){ box.textContent = t("noWorkout"); return; }
  const f = v => Math.round(v), kv = [[t("lDur"), hm(a.moving_time || 0)]];
  if(a.distance) kv.push([t("lDist"), (Math.round(a.distance / 100) / 10) + " km"]);
  if(a.total_elevation_gain) kv.push([t("lElev"), f(a.total_elevation_gain) + " m"]);
  kv.push([t("lLoad"), f(a.icu_training_load || 0)]);
  if(a.icu_intensity) kv.push([t("lIF"), (a.icu_intensity > 5 ? a.icu_intensity / 100 : a.icu_intensity).toFixed(2)]);
  if(a.icu_weighted_avg_watts) kv.push([t("lNP"), f(a.icu_weighted_avg_watts) + " W"]);
  if(a.icu_average_watts) kv.push([t("lAvgP"), f(a.icu_average_watts) + " W"]);
  if(a.average_heartrate) kv.push([t("lHR"), f(a.average_heartrate) + " bpm"]);
  if(a.max_heartrate) kv.push([t("lMaxHR"), f(a.max_heartrate) + " bpm"]);
  if(a.average_cadence) kv.push([t("lCad"), f(a.average_cadence) + " rpm"]);
  if(a.average_speed && /Run|Swim/.test(a.type || "")){ const sw = /Swim/.test(a.type); kv.push([t("lPace"), mmss((sw ? 100 : 1000) / a.average_speed) + (sw ? " /100 m" : " /km")]); }
  else if(a.average_speed) kv.push([t("lSpeed"), (a.average_speed * 3.6).toFixed(1) + " km/h"]);
  if(a.icu_efficiency_factor) kv.push([t("lEF"), (+a.icu_efficiency_factor).toFixed(2)]);
  const when = new Date(a.start_date_local).toLocaleString(loc(), {weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"});
  const pos = (LAST.list || []).length > 1 ? ` · ${LAST.li + 1}/${LAST.list.length}` : "";
  $("lprev").disabled = !(LAST.list || []).length || (LAST.li || 0) >= LAST.list.length - 1;
  $("lnext").disabled = !(LAST.list || []).length || (LAST.li || 0) <= 0;
  box.innerHTML = `<div class="lt">${esc(a.name || a.type || "")}</div><div class="hint">${esc(when)} · ${esc(actT(a.type))}${pos}</div>` + (LAST.strTried ? streamsSvg() : "") +
    `<div class="kv">${kv.map(([l, v]) => `<div>${esc(l)}<b>${esc(v)}</b></div>`).join("")}</div>`;
  updateIcuLinks();
  // curseur vertical + infobulle sur le graphe puissance / FC
  const sv = box.querySelector("#lsvg");
  if(sv){
    const w = ds(LAST.sw, 240), h = ds(LAST.sh, 240), n = Math.max(w.length, h.length), dur = LAST.last.moving_time || 0;
    chartHover(box, sv, n, i => {
      const tm = mmss(i / Math.max(1, n - 1) * dur), p = w[i] ? Math.round(w[i]) : null, hr = h[i] ? Math.round(h[i]) : null;
      const li = $("linfo"); if(li) li.textContent = [tm, p ? p + " W" : "", hr ? hr + " bpm" : ""].filter(Boolean).join(" · ");
      return {html: `<b>${esc(tm)}</b>` + [p ? `${esc(t("lPow"))} : ${p} W` : "", hr ? `${esc(t("lHRs"))} : ${hr} bpm` : ""].filter(Boolean).join("\n"), leave: () => { const l = $("linfo"); if(l) l.innerHTML = "&nbsp;"; }};
    });
  }
}
// Curseur vertical + infobulle sur un graphe SVG (viewBox quelconque) : infoAt(i) → {html, leave?}
function chartHover(box, svg, count, infoAt){
  if(!svg || !count) return;
  const NS = "http://www.w3.org/2000/svg", vb = svg.viewBox.baseVal;
  const ln = document.createElementNS(NS, "line"); ln.setAttribute("class", "cur"); ln.setAttribute("y1", 0); ln.setAttribute("y2", vb.height); ln.style.display = "none"; svg.appendChild(ln);
  let tip = box.querySelector(":scope > .tip.ctip"); if(!tip){ tip = document.createElement("div"); tip.className = "tip ctip"; tip.hidden = true; box.appendChild(tip); }
  let leave = null;
  const hide = () => { ln.style.display = "none"; tip.hidden = true; if(leave) leave(); };
  const move = e => {
    const r = svg.getBoundingClientRect(); if(!r.width) return;
    const fr = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), i = Math.round(fr * (count - 1)), x = i / Math.max(1, count - 1);
    ln.setAttribute("x1", x * vb.width); ln.setAttribute("x2", x * vb.width); ln.style.display = "";
    const info = infoAt(i, fr); leave = info.leave || null; tip.innerHTML = info.html; tip.hidden = false;
    const br = box.getBoundingClientRect();
    tip.style.left = Math.max(0, Math.min(r.left - br.left + x * r.width - tip.offsetWidth / 2, br.width - tip.offsetWidth)) + "px";
    tip.style.top = Math.max(0, r.top - br.top - tip.offsetHeight - 6) + "px"; // au-dessus du graphe, pour ne pas masquer la courbe
  };
  ["pointermove", "pointerdown"].forEach(ev => svg.addEventListener(ev, move));
  svg.addEventListener("pointerleave", hide);
}
// Clic sur le graphe de la dernière séance : ouverture dans l'analyse d'une séance (la reconstruction se fait depuis un lien de l'analyse)
$("lastbox").addEventListener("click", e => {
  if(!(e.target.closest && e.target.closest("#lsvg")) || !LAST.last) return;
  sesOpenAct(LAST.last);
});
async function loadLast(idx){
  const done = (LAST.acts || []).filter(a => a.moving_time).sort((x, y) => (x.start_date_local < y.start_date_local ? 1 : -1));
  LAST.list = done;
  if(!done.length){ LAST.last = null; LAST.li = 0; LAST.sw = LAST.sh = null; LAST.strTried = false; renderLast(); return; }
  LAST.li = Math.min(Math.max(idx || 0, 0), done.length - 1);
  LAST.last = done[LAST.li]; LAST.sw = LAST.sh = null; LAST.strTried = false; renderLast();
  const cur = LAST.last;
  try{
    const j = await icuFetch(`https://intervals.icu/api/v1/activity/${cur.id}/streams?types=watts,heartrate`);
    const list = Array.isArray(j) ? j : (j.streams || []);
    // noms de flux acceptés en repli selon la source de l'activité
    const get = (...tys) => { for(const ty of tys){ const d = (list.find(s => s.type === ty) || {}).data; if(d && d.length) return d; } return null; };
    if(LAST.last !== cur) return;
    LAST.sw = get("watts", "power", "watts_calc"); LAST.sh = get("heartrate", "heart_rate", "hr");
  }catch(e){}
  LAST.strTried = true;
  if(LAST.last === cur) renderLast();
}
$("lprev").onclick = () => loadLast((LAST.li || 0) + 1).catch(() => {});
$("lnext").onclick = () => loadLast((LAST.li || 0) - 1).catch(() => {});

