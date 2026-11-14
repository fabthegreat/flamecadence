/* FlameCadence - Weekly weather widget (Open-Meteo, no API key) */
// ---------- Météo de la semaine (Open-Meteo : sans clé API) ----------
const WX = {data: null, err: "", busy: false};
function wxLoc(){ try{ const o = JSON.parse(store.get("si_wxloc") || "null"); return o && isFinite(o.lat) && isFinite(o.lon) ? o : null; }catch(e){ return null; } }
const WMO = c => c === 0 ? ["☀️", "wx0"] : c === 1 ? ["🌤️", "wx1"] : c === 2 ? ["⛅", "wx2"] : c === 3 ? ["☁️", "wx3"] : c === 45 || c === 48 ? ["🌫️", "wx45"] : c >= 51 && c <= 57 ? ["🌦️", "wx51"]
  : c >= 61 && c <= 67 ? ["🌧️", "wx61"] : c >= 71 && c <= 77 || c === 85 || c === 86 ? ["🌨️", "wx71"] : c >= 80 && c <= 82 ? ["🌦️", "wx80"] : c >= 95 ? ["⛈️", "wx95"] : ["☁️", "wx3"];
// 0 = bien pour rouler dehors, 1 = limite, 2 = plutôt en intérieur
function wxRide(d){
  const snow = d.code >= 71 && d.code <= 77 || d.code === 85 || d.code === 86;
  if(d.code >= 95 || snow || d.pr >= 5 || (d.pp >= 70 && d.pr >= 1) || d.wind >= 40 || d.gust >= 65 || d.tmax < 2) return 2;
  if(d.pr >= 1 || d.pp >= 50 || d.wind >= 28 || d.gust >= 50 || d.tmax < 8 || d.tmax >= 33) return 1;
  return 0;
}
async function loadWx(force){
  if(!$("wxbox")) return;
  const L = wxLoc();
  if(!L){ WX.data = null; WX.err = ""; renderWx(); return; }
  const key = L.lat + "," + L.lon;
  let c = null; try{ c = JSON.parse(store.get("si_wxcache") || "null"); }catch(e){}
  if(c && c.k === key && Array.isArray(c.d)) WX.data = c.d; else WX.data = null;
  if(!force && c && c.k === key && Date.now() - c.ts < 30 * 60000){ WX.err = ""; renderWx(); return; } // cache de 30 min
  if(WX.busy) return;
  WX.busy = true; renderWx();
  try{
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${L.lat}&longitude=${L.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max&timezone=auto&forecast_days=7`);
    if(!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json(), d = j.daily;
    if(!d || !Array.isArray(d.time)) throw new Error("no data");
    const n = v => typeof v === "number" ? v : 0;
    WX.data = d.time.map((k, i) => ({k, code: n(d.weather_code[i]), tmax: n(d.temperature_2m_max[i]), tmin: n(d.temperature_2m_min[i]), pr: n(d.precipitation_sum[i]), pp: n(d.precipitation_probability_max[i]), wind: n(d.wind_speed_10m_max[i]), gust: n(d.wind_gusts_10m_max[i])}));
    store.set("si_wxcache", JSON.stringify({k: key, ts: Date.now(), d: WX.data}));
    WX.err = "";
  }catch(e){ WX.err = errText(e); } // en cas d'échec on garde les dernières prévisions connues
  WX.busy = false; renderWx();
}
function renderWx(){
  const box = $("wxbox"), cap = $("wxcap"); if(!box) return;
  const L = wxLoc();
  if(!L){
    box.innerHTML = `<div class="hint">${esc(t("wxNeed"))}</div><div class="actions" style="margin-top:8px"><button class="alt small" id="wxset" type="button">${esc(t("wxSet"))}</button></div>`;
    cap.textContent = ""; $("wxset").onclick = () => { $("open").click(); cfgTab("user"); };
    return;
  }
  if(!WX.data){ box.innerHTML = `<div class="hint ${WX.err ? "err" : ""}">${esc(WX.err ? t("wxErr", WX.err) : t("loading"))}</div>`; cap.textContent = ""; return; }
  const today = iso(new Date()), f1 = v => (Math.round(v * 10) / 10).toLocaleString(loc());
  box.innerHTML = `<div class="wx">` + WX.data.map(d => {
    const [ic, lk] = WMO(d.code), rk = wxRide(d), dt = new Date(d.k + "T12:00:00");
    const rain = d.pr >= 0.1 ? f1(d.pr) + " mm" : d.pp >= 30 ? d.pp + " %" : "–";
    const verdict = t(["wxGood", "wxMid", "wxBad"][rk]);
    const tip = [dt.toLocaleDateString(loc(), {weekday: "long", day: "numeric", month: "long"}), t(lk), Math.round(d.tmin) + " / " + Math.round(d.tmax) + " °C",
      t("wxRain", f1(d.pr), Math.round(d.pp)), t("wxWind", Math.round(d.wind), Math.round(d.gust)), verdict].join(" · ");
    return `<div class="wxr${d.k === today ? " now" : ""}" title="${esc(tip)}"><span class="wxd">${esc(dt.toLocaleDateString(loc(), {weekday: "short", day: "numeric"}))}</span><span class="wxi" aria-hidden="true">${ic}</span><span class="wxt"><i>${Math.round(d.tmin)}°</i> / <b>${Math.round(d.tmax)}°</b></span><span class="wxp">💧 ${esc(rain)}</span><span class="wxw">💨 ${Math.round(d.wind)} km/h</span><span class="wxk${rk === 1 ? " m" : rk === 2 ? " b" : ""}" role="img" aria-label="${esc(verdict)}"></span></div>`;
  }).join("") + `</div>`;
  cap.innerHTML = `<div class="wxleg"><span><i class="wxk"></i>${esc(t("wxGood"))}</span><span><i class="wxk m"></i>${esc(t("wxMid"))}</span><span><i class="wxk b"></i>${esc(t("wxBad"))}</span></div><div style="margin-top:4px">${esc(L.name)}${WX.err ? " · " + esc(t("wxErr", WX.err)) : ""} · <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a></div>`;
}
function wxCurText(){
  const L = wxLoc(), el = $("wxcur"); if(!el) return;
  el.textContent = L ? t("wxCur", L.name + (L.auto ? t("wxAuto") : "")) : t("wxNoLoc");
  $("wxclr").hidden = !L;
}
function wxSetLoc(o){
  store.set("si_wxloc", o ? JSON.stringify(o) : ""); store.set("si_wxcache", ""); store.set("si_wxauto", "1");
  wxCurText(); return loadWx(true);
}
const wxGeoUrl = (q, n) => `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=${n}&language=${lang}&format=json`;
const wxPlace = p => ({name: p.name + (p.country_code ? ", " + p.country_code : ""), lat: Math.round(p.latitude * 1000) / 1000, lon: Math.round(p.longitude * 1000) / 1000});
async function wxSearch(){
  const q = $("wxq").value.trim(), out = $("wxres"); if(!q) return;
  out.textContent = t("loading");
  try{
    const r = await fetch(wxGeoUrl(q, 6)); if(!r.ok) throw new Error("HTTP " + r.status);
    const res = (await r.json()).results || [];
    out.innerHTML = "";
    if(!res.length){ out.textContent = t("wxNone"); return; }
    res.forEach(p => {
      const b = document.createElement("button"); b.type = "button"; b.className = "alt small";
      b.textContent = [p.name, p.admin1, p.country].filter(Boolean).join(", ");
      b.onclick = () => { out.innerHTML = ""; $("wxq").value = ""; wxSetLoc(wxPlace(p)); };
      out.appendChild(b);
    });
  }catch(e){ out.textContent = t("wxErr", errText(e)); }
}
async function wxAuto(){
  if(wxLoc() || store.get("si_wxauto") || !ICU.city) return;
  store.set("si_wxauto", "1"); // une seule tentative
  const r = await fetch(wxGeoUrl(ICU.city, 5)); if(!r.ok) return;
  const res = (await r.json()).results || [], c = String(ICU.country || "").toLowerCase();
  const p = res.find(x => c && [x.country, x.country_code].some(v => String(v || "").toLowerCase() === c)) || res[0];
  if(!p) return;
  store.set("si_wxloc", JSON.stringify({...wxPlace(p), auto: true})); wxCurText(); loadWx(true);
}
$("wxfind").onclick = wxSearch;
$("wxq").addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); wxSearch(); } });
$("wxclr").onclick = () => { $("wxres").textContent = ""; wxSetLoc(null); };
$("wxgeo").onclick = () => {
  const out = $("wxres");
  if(!navigator.geolocation){ out.textContent = t("wxNoGeo"); return; }
  out.textContent = t("loading");
  navigator.geolocation.getCurrentPosition(p => { out.textContent = ""; wxSetLoc({name: t("wxMyPos"), lat: Math.round(p.coords.latitude * 1000) / 1000, lon: Math.round(p.coords.longitude * 1000) / 1000}); },
    () => { out.textContent = t("wxNoGeo"); }, {timeout: 10000, maximumAge: 600000});
};
$("rwx").onclick = async () => { const b = $("rwx"); if(b.disabled) return; b.disabled = true; try{ await loadWx(true); }finally{ b.disabled = false; } };
$("userref").onclick = async () => {
  const b = $("userref"); if(b.disabled) return;
  if(!KEY()){ profText(); return; }
  b.disabled = true; ICU.loaded = false; profText();
  try{ await loadProfile(); }catch(e){ LAST.profErr = errText(e); profText(); }
  b.disabled = false;
};

// --- deux dernières semaines ---
const grp = l => l.reduce((m, a) => { const k = (a.start_date_local || "").slice(0, 10); (m[k] = m[k] || []).push(a); return m; }, {});
function dayHtml(k, L, w, P){
  const f = v => Math.round(v), n1 = v => String(Math.round(v * 10) / 10);
  let h = `<b>${esc(new Date(k + "T12:00:00").toLocaleDateString(loc(), {weekday: "long", day: "numeric", month: "long"}))}</b>`;
  if(w && w.ctl != null) h += `<div>CTL ${f(w.ctl)} · ATL ${f(w.atl)} · ${lang === "fr" ? "forme" : "form"} ${f(w.ctl - w.atl)}</div>`;
  if(!L.length) h += `<div>${t("rest")}</div>`;
  for(const a of L){
    const parts = [hm(a.moving_time || 0)];
    if(a.distance) parts.push(n1(a.distance / 1000) + " km");
    if(a.total_elevation_gain) parts.push(t("dElev", f(a.total_elevation_gain)));
    const q = [t("dLoad", f(a.icu_training_load || 0))];
    if(a.icu_intensity) q.push("IF " + (a.icu_intensity > 5 ? a.icu_intensity / 100 : a.icu_intensity).toFixed(2));
    if(a.icu_weighted_avg_watts) q.push("NP " + f(a.icu_weighted_avg_watts) + " W");
    if(a.icu_average_watts) q.push(t("dAvg", f(a.icu_average_watts)));
    if(a.average_heartrate) q.push(t("dHR", f(a.average_heartrate)));
    h += `<div class="act"><b>${esc(a.name || a.type || "")}</b> ${esc(actT(a.type))} ${esc((a.start_date_local || "").slice(11, 16))}<br>${esc(parts.join(" · "))}<br>${esc(q.join(" · "))}</div>`;
  }
  for(const e of P) h += `<div class="act">${esc(t("planned", (e.name || "") + (e.moving_time ? " (" + hm(e.moving_time) + ")" : "")))}</div>`;
  return h;
}
