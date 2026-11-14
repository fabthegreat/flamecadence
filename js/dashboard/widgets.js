/* FlameCadence - Dashboard widgets: power curve, VO2 estimate, time in zones, heat map and the shared refresh buttons */
async function loadLoad(idx){
  const rng = `oldest=${daysAgo(13)}&newest=${daysAgo(0)}`;
  const [acts, well, plan] = await Promise.all([icu(`/activities?${rng}`), icu(`/wellness?${rng}`).catch(() => []), icu(`/events?${rng}&category=WORKOUT`).catch(() => [])]);
  LAST.acts = acts; LAST.well = well; LAST.plan = plan; libAutoRefresh();
  renderLoad(); loadLast(idx);
}

// --- meilleurs efforts ---
const DURS = [[5, "5 s"], [15, "15 s"], [30, "30 s"], [60, "1'"], [120, "2'"], [180, "3'"], [300, "5'"], [600, "10'"], [1200, "20'"], [1800, "30'"], [3600, "60'"]];
function renderBest(){
  if(!LAST.curve) return;
  const c = LAST.curve, secs = c.secs || [], vals = c.watts || c.values || [], kg = ICU.weight;
  const ftp = $("bkind").value === "VirtualRide" ? ICU.ftpIn : ICU.ftpOut;
  if(!secs.length){ $("bestbox").textContent = t("nodata"); return; }
  const rows = DURS.map(([d, l]) => {
    let i = secs.indexOf(d); if(i < 0) i = secs.findIndex(x => x >= d);
    const w = i >= 0 && vals[i] ? Math.round(vals[i]) : null;
    return `<tr><td>${l}</td><td>${w || "–"}</td><td>${w && kg ? (w / kg).toFixed(2) : "–"}</td><td>${w && ftp ? Math.round(w / ftp * 100) + " %" : "–"}</td></tr>`;
  }).join("");
  $("bestbox").innerHTML = `<table><thead><tr><th>${esc(t("colDur"))}</th><th>W</th><th>W/kg</th><th>% FTP</th></tr></thead><tbody>${rows}</tbody></table>`;
}
async function loadBest(){
  const j = await icu(`/power-curves?type=${$("bkind").value}&curves=${$("bper").value}`);
  LAST.curve = (j.list || [j])[0] || {}; renderBest();
}
async function loadAll(){
  loadWx().catch(() => {});
  if(!KEY()){ ["loadbox", "bestbox", "lastbox", "fitbox", "nextbox", "zonbox", "heatbox", "zoncap", "heatcap", "vo2box", "vo2cap"].forEach(id => $(id).textContent = ""); VO2.loaded = false; YR.acts = null; YR.p = null; NEXT.ev = null; NEXT.loaded = false; $("loadbox").textContent = t("needI"); renderCal(); return; }
  if(BE.on()) BE.refresh().catch(() => {});
  await loadProfile().catch(e => { LAST.profErr = errText(e); profText(); });
  loadFit().catch(e => { $("fitbox").textContent = t("errI", errText(e)); });
  loadCal(true).catch(e => { $("calbox").textContent = t("errI", errText(e)); });
  loadLoad().catch(e => { $("loadbox").textContent = t("errI", errText(e)); });
  loadBest().catch(e => { $("bestbox").textContent = t("errI", errText(e)); });
  if(widgets.includes("zon") || widgets.includes("heat")) loadYr(!!YR.t && Date.now() - YR.t > 30000);
  if(widgets.includes("vo2")) loadVo2().catch(() => {});
}
$("rload").onclick = loadAll;
// boutons ↻ des autres widgets (même principe que celui du calendrier) : rechargent uniquement leur widget
const refreshBtn = (id, fn) => { $(id).onclick = async () => { const b = $(id); if(b.disabled || !KEY()) return; b.disabled = true; try{ await fn(); }catch(e){} finally{ b.disabled = false; } }; };
refreshBtn("rfit", () => loadFit().catch(e => { $("fitbox").textContent = t("errI", errText(e)); }));
refreshBtn("rlast", () => loadLoad(LAST.li || 0).catch(() => {}));
refreshBtn("rbest", () => loadBest().catch(e => { $("bestbox").textContent = t("errI", errText(e)); }));

// --- Widget « Estimation de VO₂max » (vélo) : meilleure puissance sur 5 min × équation ACSM ; valeur de l'appareil si intervals.icu en a une ---
const VO2 = {loaded: false, busy: false, d: null};
const vo2Est = (w, kg) => 10.8 * w / kg + 7; // ml/kg/min (équation ACSM du cyclisme, P en watts)
function best5(w){ // meilleure puissance moyenne sur 300 s (flux à 1 Hz)
  const n = 300; if(!w || w.length < n) return 0;
  let s = 0; for(let i = 0; i < n; i++) s += w[i] || 0;
  let b = s; for(let i = n; i < w.length; i++){ s += (w[i] || 0) - (w[i - n] || 0); if(s > b) b = s; }
  return b / n;
}
function to1Hz(w, tm){ // ré-échantillonne à 1 Hz si le flux « time » montre un pas plus grand
  if(!tm || tm.length !== w.length || tm.length < 2) return w;
  const span = tm[tm.length - 1] - tm[0]; if(span <= (w.length - 1) * 1.5) return w;
  const out = new Array(Math.floor(span) + 1); let k = 0;
  for(let i = 0; i < out.length; i++){ while(k + 1 < tm.length && tm[k + 1] - tm[0] <= i) k++; out[i] = w[k]; }
  return out;
}
function curve5(c){ // puissance moyenne maximale sur 5 min d'une courbe de puissance intervals.icu
  const secs = (c && c.secs) || [], vals = (c && (c.watts || c.values)) || []; let i = secs.indexOf(300); if(i < 0) i = secs.findIndex(x => x >= 300);
  return i >= 0 && vals[i] > 0 ? vals[i] : 0;
}
const vo2Per = () => { const e = $("vo2per"), v = e && e.value; return v === "14" ? 14 : v === "42" ? 42 : 7; };
async function rideB5(a){ // meilleur 5 min d'une sortie, d'après son flux de puissance (mis en cache)
  VO2.c = VO2.c || {}; if(VO2.c[a.id] !== undefined) return VO2.c[a.id];
  let j = null, b = 0;
  for(const u of [`https://intervals.icu/api/v1/activity/${a.id}/streams?types=watts,time`, `https://intervals.icu/api/v1/activity/${a.id}/streams?types=watts`]){
    try{ j = await icuFetch(u); if(j) break; }catch(e){}
  }
  const list = Array.isArray(j) ? j : (j && j.streams) || [], get = (...tys) => { for(const ty of tys){ const d = (list.find(x => x.type === ty) || {}).data; if(d && d.length) return d; } return null; };
  const w = get("watts", "power", "watts_calc"); if(w) b = best5(to1Hz(w, get("time")));
  return VO2.c[a.id] = b;
}
async function vo2Peak(per){ // meilleur 5 min sur les `per` derniers jours : courbe de puissance, sinon calcul sur les sorties de la période
  const d = VO2.d; if(d.cur[per] > 0) return d.cur[per];
  const from = daysAgo(per); let b = 0;
  for(const a of d.rides.filter(a => (a.start_date_local || "").slice(0, 10) >= from).slice(0, 8)) b = Math.max(b, await rideB5(a));
  return b;
}
const med = a => { const v = [...a].sort((x, y) => x - y), m = v.length >> 1; return v.length ? (v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2) : 0; };
async function rideHr(a){ // flux puissance + FC à 1 Hz d'une sortie (mis en cache)
  VO2.h = VO2.h || {}; if(VO2.h[a.id]) return VO2.h[a.id];
  let j = null;
  for(const u of [`https://intervals.icu/api/v1/activity/${a.id}/streams?types=watts,heartrate,time`, `https://intervals.icu/api/v1/activity/${a.id}/streams?types=watts,heartrate`]){
    try{ j = await icuFetch(u); if(j) break; }catch(e){}
  }
  const list = Array.isArray(j) ? j : (j && j.streams) || [], get = (...tys) => { for(const ty of tys){ const d = (list.find(x => x.type === ty) || {}).data; if(d && d.length) return d; } return null; };
  const w = get("watts", "power", "watts_calc"), h = get("heartrate", "hr"), tm = get("time");
  return VO2.h[a.id] = w && h && w.length === h.length ? {w: to1Hz(w, tm), h: to1Hz(h, tm)} : {w: [], h: []};
}
function hrSegs(w, h, kg, hrMax, hrRest){ // segments stables de 10 min : réserve de FC ≈ réserve de VO₂ (Swain), VO₂ de la puissance par l'équation ACSM, extrapolé à 100 %
  const out = [], n = Math.min(w.length, h.length), N = 600;
  for(let s = 600; s + N <= n; s += 300){ // les 10 premières minutes sont ignorées (la FC suit avec retard)
    const bp = [], bh = [];
    for(let b = 0; b < 10; b++){ let sp = 0, sh = 0; for(let i = s + b * 60; i < s + b * 60 + 60; i++){ sp += w[i] || 0; sh += h[i] || 0; } bp.push(sp / 60); bh.push(sh / 60); }
    const P = bp.reduce((x, y) => x + y, 0) / 10, H = bh.reduce((x, y) => x + y, 0) / 10; if(P < 50 || H < 0.7 * hrMax) continue;
    const cv = (v, m) => Math.sqrt(v.reduce((x, y) => x + (y - m) * (y - m), 0) / 10) / m;
    if(cv(bp, P) > 0.12 || cv(bh, H) > 0.04) continue; // puissance et FC stables
    const hrr = (H - hrRest) / (hrMax - hrRest); if(hrr < 0.5 || hrr > 1.05) continue;
    out.push(3.5 + (vo2Est(P, kg) - 3.5) / Math.min(hrr, 1));
  }
  return out;
}
async function vo2Hr(){
  const d = VO2.d; if(!d || !d.kg) return;
  if(!(d.hrMax > 100 && d.hrRest > 25 && d.hrMax - d.hrRest > 40)){ d.hr = {miss: true}; return renderVo2(); }
  const from = daysAgo(14), all = [];
  for(const a of d.rides.filter(a => a.average_heartrate > 0 && (a.start_date_local || "").slice(0, 10) >= from).slice(0, 8)){
    try{ const x = await rideHr(a); all.push(...hrSegs(x.w, x.h, d.kg, d.hrMax, d.hrRest)); }catch(e){}
  }
  if(VO2.d !== d) return; // la fiche a été rechargée entre-temps
  const v = all.filter(x => x > 20 && x < 90);
  d.hr = {est: v.length >= 2 ? med(v) : 0, n: v.length};
  renderVo2();
}
async function loadVo2(){
  if(VO2.busy) return; VO2.busy = true;
  try{
    const today = daysAgo(0), per = vo2Per();
    const [acts, well, a1, a2, b1, b2] = await Promise.all([
      icu(`/activities?oldest=${daysAgo(42)}&newest=${today}`).catch(() => []),
      icu(`/wellness?oldest=${daysAgo(90)}&newest=${today}`).catch(() => []),
      icu(`/power-curves?type=Ride&curves=42d,84d,1y`).catch(() => null),
      icu(`/power-curves?type=VirtualRide&curves=42d,84d,1y`).catch(() => null),
      icu(`/power-curves?type=Ride&curves=7d,14d`).catch(() => null),
      icu(`/power-curves?type=VirtualRide&curves=7d,14d`).catch(() => null)
    ]);
    const W = (Array.isArray(well) ? well : []).filter(x => x && x.id).sort((a, b) => a.id < b.id ? -1 : 1);
    const lastW = k => { for(let i = W.length - 1; i >= 0; i--) if(W[i][k] > 0) return W[i]; return null; };
    const kg = ICU.weight || (lastW("weight") || {}).weight || 0, dv = lastW("vo2max");
    const L = c => c ? (c.list || [c]) : [], pk = (x, y, i) => Math.max(curve5(L(x)[i]), curve5(L(y)[i])); // meilleur 5 min : Ride et VirtualRide
    const win = [0, 1, 2].map(i => pk(a1, a2, i)); // 6 semaines, 12 semaines, 1 an
    const cur = {7: pk(b1, b2, 0), 14: pk(b1, b2, 1), 42: win[0]};
    const rides = (Array.isArray(acts) ? acts : []).filter(a => /Ride/.test(a.type || "") && a.moving_time >= 300 && (a.icu_average_watts > 0 || a.average_watts > 0 || a.icu_weighted_avg_watts > 0))
      .sort((a, b) => a.start_date_local < b.start_date_local ? 1 : -1);
    const hrRest = med(W.map(x => x.restingHR).filter(v => v > 0).slice(-14)), hrMax = ICU.maxHr || Math.max(0, ...rides.map(a => a.max_heartrate || 0));
    VO2.d = {kg, dv, win, cur, rides, per, w: 0, hrMax, hrRest, hr: null};
    VO2.d.w = await vo2Peak(per); VO2.loaded = true;
  }finally{ VO2.busy = false; }
  renderVo2();
  vo2Hr().catch(() => {}); // seconde estimation, par la FC : calculée après l'affichage (elle télécharge les flux des sorties récentes)
}
function renderVo2(){
  const box = $("vo2box"), cap = $("vo2cap"); if(!box || !VO2.d) return;
  const {kg, dv, win, per, w} = VO2.d, n0 = v => Math.round(v), ph = t("vo2W" + per);
  let h = "";
  if(!kg) h += `<div class="hint">${esc(t("vo2NoW"))}</div>`;
  else{
    const ref = win[1], maxed = w && ref ? w >= ref * 0.95 : null;
    let b = w, lower = false, why = "";
    if(w && maxed !== false) why = t(maxed ? "vo2Max" : "vo2Unk", ph); // effort quasi maximal (ou impossible à vérifier)
    else if(per < 42 && win[0] && ref && win[0] >= ref * 0.95){ b = win[0]; why = t("vo2Fall", ph); } // rien de maximal sur la période : on prend le meilleur des 6 semaines
    else{ if(!w) b = win[0]; lower = true; why = b ? t("vo2Low", w ? ph : t("vo2W42"), n0(b), ref ? n0(b / ref * 100) : "–") : ""; }
    if(!b) h += `<div class="hint">${esc(t("vo2NoRide"))}</div>`;
    else{
      const hr = VO2.d.hr, bnd = vo2Est(b, kg), hrLead = lower && hr && hr.est >= bnd && hr.est > 0; // sans effort maximal récent, la FC prend la main (jamais en dessous de ce que la puissance a déjà démontré)
      h += `<div><span class="vo2n">${hrLead ? n0(hr.est) : (lower ? "≥ " : "") + n0(bnd)}</span><span class="vo2u">${esc(t("vo2U"))}</span></div><div class="hint">${esc(hrLead ? t("vo2HrLow") : why)}</div>` +
        (hrLead ? `<div class="hint">${esc(why)}</div>` : "") + `<div class="hint">${esc(t("vo2Ride", n0(b), (b / kg).toFixed(2)))}</div>`;
      if(hr){ // estimation par la FC
        if(hr.miss) h += `<div class="hint">${esc(t("vo2HrMiss"))}</div>`;
        else if(hr.est) h += `<div class="hint"><b>${esc(t("vo2Hr", n0(hr.est), hr.n))}</b></div>`;
        else h += `<div class="hint">${esc(t("vo2HrNone"))}</div>`;
      }
    }
  }
  if(dv) h += `<div class="hint">${esc(t("vo2Dev", n0(dv.vo2max), new Date(dv.id + "T12:00:00").toLocaleDateString(loc(), {day: "numeric", month: "short"})))}</div>`;
  if(kg && win.some(v => v > 0)){
    h += `<div class="hint" style="margin-top:8px">${esc(t("vo2Trend"))}</div><div class="kv">` + [["per6", 0], ["per12", 1], ["per1y", 2]].map(([k, i]) => `<div>${esc(t(k))}<b>${win[i] ? n0(vo2Est(win[i], kg)) : "–"}</b></div>`).join("") + `</div>`;
  }
  box.innerHTML = h; cap.textContent = t("vo2Cap") + (VO2.d.hr && VO2.d.hr.est ? " " + t("vo2CapHr") : "");
}
refreshBtn("rvo2", async () => { VO2.loaded = false; await loadVo2(); });
$("vo2per").onchange = async () => { store.set("si_vo2per", String(vo2Per())); if(!VO2.d || VO2.busy) return; VO2.d.per = vo2Per(); VO2.d.w = await vo2Peak(VO2.d.per); renderVo2(); };

// --- Widgets « Temps par zone » et « Carte de chaleur annuelle » : une seule requête /activities (53 semaines) partagée par les deux ---
const YR = {acts: null, p: null, t: 0};
const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; };
const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
function loadYr(force){
  if(!KEY()) return Promise.resolve();
  if(YR.p && !force) return YR.p;
  if(!YR.acts) ["zonbox", "heatbox"].forEach(id => { $(id).textContent = t("loading"); });
  const p = icu(`/activities?oldest=${iso(addD(mondayOf(new Date()), -52 * 7))}&newest=${daysAgo(0)}`).then(a => {
    if(YR.p !== p) return;
    YR.acts = (Array.isArray(a) ? a : []).filter(x => x && x.start_date_local); YR.t = Date.now(); renderZon(); renderHeat();
  }).catch(e => { if(YR.p === p){ YR.p = null; if(!YR.acts) ["zonbox", "heatbox"].forEach(id => { $(id).textContent = t("errI", errText(e)); }); } });
  YR.p = p; return p;
}
function actZones(a, hr){ // secondes par zone (1..7) d'une activité, d'après la puissance ou la FC
  const raw = hr ? a.icu_hr_zone_times : a.icu_zone_times; if(!Array.isArray(raw)) return null;
  const z = [0, 0, 0, 0, 0, 0, 0, 0]; let any = false;
  raw.forEach((v, i) => {
    let k, s;
    if(v && typeof v === "object"){ const m = /^Z(\d)$/i.exec(String(v.id)); if(!m) return; k = +m[1]; s = +v.secs; } else { k = i + 1; s = +v; }
    if(k >= 1 && k <= 7 && s > 0){ z[k] += s; any = true; }
  });
  return any ? {z, n: hr ? raw.length : 7} : null;
}
function renderZon(){
  const box = $("zonbox"), cap = $("zoncap"); if(!box || !YR.acts) return;
  const N = +$("zper").value || 8, hr = $("zbas").value === "hr";
  const m0 = addD(mondayOf(new Date()), -(N - 1) * 7), start = iso(m0);
  const wk = Array.from({length: N}, (_, i) => ({d: addD(m0, i * 7), z: [0, 0, 0, 0, 0, 0, 0, 0]}));
  let used = 0, skipped = 0, nz = hr ? 0 : 7;
  for(const a of YR.acts){
    const day = a.start_date_local.slice(0, 10); if(day < start) continue;
    const r = actZones(a, hr);
    if(!r){ if((a.moving_time || 0) > 0) skipped++; continue; }
    const idx = Math.floor(Math.round((new Date(day + "T12:00:00") - m0) / 864e5) / 7);
    if(idx < 0 || idx >= N) continue;
    for(let k = 1; k <= 7; k++) wk[idx].z[k] += r.z[k];
    used++; nz = Math.max(nz, r.n);
  }
  LAST.zwk = wk;
  const tot = [0, 0, 0, 0, 0, 0, 0, 0]; wk.forEach(w => { for(let k = 1; k <= 7; k++) tot[k] += w.z[k]; });
  const T = tot.reduce((x, y) => x + y, 0);
  if(!T){ box.textContent = t("zonNone"); cap.textContent = ""; return; }
  const wt = wk.map(w => w.z.reduce((x, y) => x + y, 0)), mx = Math.max(...wt);
  const cols = wk.map((w, i) => `<div class="zc${i === N - 1 ? " now" : ""}" data-n="${i}"><div class="zst" style="height:${wt[i] ? Math.max(3, wt[i] / mx * 84).toFixed(1) : 2}px">${[1, 2, 3, 4, 5, 6, 7].filter(k => w.z[k] > 0).map(k => `<i class="z${k}" style="flex:${w.z[k].toFixed(0)} 1 0"></i>`).join("")}</div><span>${esc(w.d.toLocaleDateString(loc(), {day: "numeric", month: "numeric"}))}</span></div>`).join("");
  const sum = (a, b) => { let x = 0; for(let k = a; k <= b; k++) x += tot[k]; return x; };
  const five = hr && nz <= 5, lo = sum(1, 2), mi = five ? sum(3, 3) : sum(3, 4), hi = five ? sum(4, 7) : sum(5, 7), pc = v => Math.round(v / T * 100);
  const rg = five ? ["Z1–2", "Z3", "Z4+"] : ["Z1–2", "Z3–4", "Z5+"];
  const kind = lo / T >= 0.7 ? (hi > mi ? "Pol" : "Pyr") : (mi >= hi ? "Tem" : "Hard");
  box.innerHTML = zoneBar(tot, false) + `<div class="zw">${cols}</div><div class="tip" hidden></div>`;
  cap.innerHTML = `${esc(t("zLow"))} (${rg[0]}) ${pc(lo)} % · ${esc(t("zMid"))} (${rg[1]}) ${pc(mi)} % · ${esc(t("zHigh"))} (${rg[2]}) ${pc(hi)} %<br>${esc(t("zv" + kind))}<br>${esc(t("zonCap", hm(T), used) + (skipped ? t("zonSkip", skipped) : ""))}`;
}
hoverTip($("zonbox"), i => {
  const w = (LAST.zwk || [])[i]; if(!w) return "";
  const T = w.z.reduce((x, y) => x + y, 0);
  let h = `<b>${esc(t("zWeek", w.d.toLocaleDateString(loc(), {day: "numeric", month: "long"})))}</b><div>${esc(T ? hm(T) : "–")}</div>`;
  for(let k = 1; k <= 7; k++) if(w.z[k] > 0) h += `<div>Z${k} · ${esc(fmtDur(w.z[k]))} · ${Math.round(w.z[k] / T * 100)} %</div>`;
  return h;
});
function renderHeat(){
  const box = $("heatbox"), cap = $("heatcap"); if(!box || !YR.acts) return;
  const by = grp(YR.acts), m0 = mondayOf(addD(new Date(), -52 * 7)), today = daysAgo(0), W = 53, S = 11, X0 = 20, Y0 = 14;
  const cells = [], months = []; let days = 0, sec = 0, load = 0, run = 0, best = 0, gap = 0, bestGap = 0, seen = false, lastMonthCol = -9, prevMonth = -1;
  LAST.hmd = [];
  for(let i = 0; i < W * 7; i++){
    const d = addD(m0, i), k = iso(d); if(k > today) break;
    const col = Math.floor(i / 7), row = i % 7, L = by[k] || [];
    const ld = L.reduce((x, a) => x + (a.icu_training_load || 0), 0), tm = L.reduce((x, a) => x + (a.moving_time || 0), 0);
    const lv = !L.length || (!ld && !tm) ? 0 : ld >= 120 ? 4 : ld >= 80 ? 3 : ld >= 40 ? 2 : 1;
    if(lv){ days++; sec += tm; load += ld; run++; best = Math.max(best, run); seen = true; gap = 0; } else { run = 0; if(seen){ gap++; bestGap = Math.max(bestGap, gap); } }
    if(row === 0 && d.getMonth() !== prevMonth){ const first = prevMonth < 0; prevMonth = d.getMonth(); if(!(first && d.getDate() > 7) && col - lastMonthCol >= 3){ months.push(`<text x="${X0 + col * S}" y="9">${esc(d.toLocaleDateString(loc(), {month: "short"}))}</text>`); lastMonthCol = col; } }
    LAST.hmd.push(dayHtml(k, L, null, []));
    cells.push(`<rect class="h${lv}${k === today ? " hnow" : ""}" x="${X0 + col * S}" y="${Y0 + row * S}" width="9" height="9" rx="2" data-n="${i}"/>`);
  }
  if(!days){ box.textContent = t("heatNone"); cap.textContent = ""; return; }
  const dl = [0, 2, 4].map(r => `<text x="0" y="${Y0 + r * S + 8}">${esc(addD(m0, r).toLocaleDateString(loc(), {weekday: "narrow"}))}</text>`).join("");
  box.innerHTML = `<svg class="hm" viewBox="0 0 ${X0 + W * S} ${Y0 + 7 * S}" role="img" aria-label="${esc(t("heatAria"))}">${months.join("")}${dl}${cells.join("")}</svg><div class="tip" hidden></div><div class="hm-leg">${esc(t("heatLess"))} <i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i> ${esc(t("heatMore"))}</div>`;
  cap.textContent = t("heatCap", days, hm(sec), Math.round(load)) + "\n" + t("heatStreak", best, bestGap);
  cap.style.whiteSpace = "pre-line";
}
hoverTip($("heatbox"), i => LAST.hmd[i] || "");
$("zper").onchange = $("zbas").onchange = () => { store.set("si_zper", $("zper").value); store.set("si_zbas", $("zbas").value); renderZon(); };
refreshBtn("rzon", () => loadYr(true));
refreshBtn("rheat", () => loadYr(true));

