/* FlameCadence - Workout explanation and planning calendar (drag and drop, delete, date picker, plannedSteps) */
// ---------- Explication de la séance ----------
function renderExplain(steps){
  const el = $("explain"), tot = steps.reduce((x, y) => x + y.d, 0) || 1, z = {e: 0, t: 0, h: 0, v: 0};
  steps.forEach(p => { const m = (p.a + p.b) / 2; z[m < 76 ? "e" : m < 91 ? "t" : m < 106 ? "h" : "v"] += p.d; });
  const k = z.v / tot > .08 ? "exV" : z.h / tot > .12 ? "exH" : z.t / tot > .15 ? "exT" : "exE", pc = x => Math.round(x / tot * 100);
  el.innerHTML = `<b>${esc(t("exTitle"))}</b><p>${esc((EXPL && EXPL[lang]) || t(k))}</p><div class="hint">${esc(t("exMix", pc(z.e), pc(z.t), pc(z.h + z.v)))}</div>`;
  el.hidden = false;
}

// ---------- Calendrier du planning (drag & drop, suppression, sélecteur de date) ----------
const CAL = {m: 0, pm: 0, ev: [], pev: [], acts: [], dacts: []};
function calFirst(off){ const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + (off || 0)); return d; }
function calRange(off){
  const f = calFirst(off);
  return [iso(new Date(f.getFullYear(), f.getMonth(), 1)), iso(new Date(f.getFullYear(), f.getMonth() + 1, 0))];
}
function calLabel(el, off){ el.textContent = calFirst(off).toLocaleDateString(loc(), {month: "long", year: "numeric"}); }
// Vue agrandie : aperçu graphique (séance planifiée = profil de puissance ; activité = streams, chargés à l'affichage)

// Étapes d'une séance planifiée : description texte, sinon workout_doc d'intervals.icu, sinon profil plat estimé
function plannedSteps(e, ftp){
  const sport = e.type || "Ride";
  let steps = e.description ? parseWorkout(e.description, sport, ftp) : [];
  if(steps.length) return steps;
  const doc = e.workout_doc;
  if(doc && Array.isArray(doc.steps) && doc.steps.length){
    const pct = (o, k) => {
      if(!o) return null;
      if(typeof o.value === "number" && /%/.test(o.units || "")) return o.value;
      if(typeof o.value === "number" && /w/i.test(o.units || "") && ftp > 0) return o.value / ftp * 100;
      if(typeof o.start === "number" && /%/.test(o.units || "")) return k === "b" ? (typeof o.end === "number" ? o.end : o.start) : o.start;
      return null;
    };
    const wat = (o, k) => { // cible en watts absolus (valeur fixe ou plage) : conservée telle quelle
      if(!o || !/w/i.test(o.units || "") || /%/.test(o.units || "")) return null;
      if(typeof o.value === "number") return o.value;
      if(typeof o.start === "number") return k === "b" ? (typeof o.end === "number" ? o.end : o.start) : o.start;
      return null;
    };
    const walk = (list, out) => {
      for(const st of list){
        if(Array.isArray(st.steps) && st.steps.length){
          const n = Math.min(Math.max(parseInt(st.reps, 10) || 1, 1), 50), inner = [];
          walk(st.steps, inner);
          for(let i = 0; i < n; i++) out.push(...inner);
          continue;
        }
        const d = st.duration || (st.distance ? st.distance * 0.36 : 0);
        const pw = st.power || st.hr || st.pace;
        let a = pct(pw, "a"), b = pct(pw, "b");
        if(a == null){ a = b = 60; }
        if(b == null) b = a;
        const aw = st.power ? wat(st.power, "a") : null, bw = st.power ? wat(st.power, "b") : null;
        if(d > 0) out.push(aw != null ? {d, a, b, aw, bw: bw != null ? bw : aw, text: st.text || ""} : {d, a, b, text: st.text || ""});
      }
    };
    steps = []; walk(doc.steps, steps);
    if(steps.length) return steps;
  }
  // dernier recours : durée connue → bloc plat à l'intensité estimée (charge/IF) pour qu'une séance ait toujours un graphique
  const dur = e.moving_time || e.icu_training_time || (e.duration) || 0;
  if(dur > 0){
    const IF = e.icu_intensity > 0 ? e.icu_intensity : (e.icu_training_load > 0 ? Math.sqrt(e.icu_training_load / (dur / 3600) / 100) : 0.65);
    const v = Math.max(40, Math.min(130, (IF > 3 ? IF : IF * 100)));
    return [{d: dur, a: v, b: v, est: true}];
  }
  return [];
}
function calBigExtra(e, isAct){
  if(!isAct){
    const sport = e.type || "Ride", ftp = ftpFor(sport);
    const steps = plannedSteps(e, ftp);
    const svg = stepsSvg(steps);
    let meta = "";
    if(svg){
      const st = stepsStats(steps);
      if(st) meta = hm(st.total) + (steps.length === 1 && steps[0].est ? "" : " · " + (ftp > 0 ? Math.round(st.avgPct * ftp / 100) + " W" : Math.round(st.avgPct) + " %"));
    }else if(e.moving_time) meta = hm(e.moving_time);
    return (svg ? `<div class="cal-mini">${svg}</div>` : "") + (meta ? `<div class="cal-meta">${esc(meta)}</div>` : "");
  }
  const bits = [];
  if(e.moving_time) bits.push(hm(e.moving_time));
  if(e.distance) bits.push((Math.round(e.distance / 100) / 10) + " km");
  if(e.icu_weighted_avg_watts) bits.push("NP " + Math.round(e.icu_weighted_avg_watts) + " W");
  else if(e.icu_average_watts || e.average_watts) bits.push(Math.round(e.icu_average_watts || e.average_watts) + " W");
  return calMiniHtml(e.id) + (bits.length ? `<div class="cal-meta">${esc(bits.join(" · "))}</div>` : "");
}
const CAL_SVGC = {}; // id d'activité → vignette SVG déjà calculée ("" = aucune) : un redessin du calendrier ne repasse plus par les promesses
function calMiniLoad(box){
  if(CAL.io){ CAL.io.disconnect(); CAL.io = null; }
  const els = Array.from(box.querySelectorAll(".cal-mini[data-aid]")); if(!els.length) return;
  const fill = el => {
    if(el.dataset.ld) return; el.dataset.ld = "1";
    actStreams(el.dataset.aid).then(sw => { const ev = (CAL.acts || []).find(x => String(x.id) === el.dataset.aid); const svg = actPrevSvg(sw) || actFallbackSvg(ev, sw); if(!sw.transient) CAL_SVGC[el.dataset.aid] = svg; if(svg) el.innerHTML = svg; else el.remove(); }).catch(() => {}).then(() => { el.dataset.done = "1"; calFitSoon(); calReveal(); });
  };
  if(!("IntersectionObserver" in window)){ els.forEach(fill); return; }
  const io = CAL.io = new IntersectionObserver(es => es.forEach(en => { if(en.isIntersecting){ io.unobserve(en.target); fill(en.target); } }), {rootMargin: "300px"});
  els.forEach(el => io.observe(el));
}
function calNP(e, isAct){ // NP (W) + niveau d'intensité 1-4 pour la vignette ; null si indisponible
  try{
    let np = 0, iff = 0;
    if(isAct){ np = e.icu_weighted_avg_watts || 0; iff = e.icu_intensity > 5 ? e.icu_intensity / 100 : (e.icu_intensity || 0); }
    else{
      const sp = e.type || "Ride", ftp = ftpFor(sp); if(!/Ride/.test(sp) || !(ftp > 0)) return null;
      const st = plannedSteps(e, ftp); if(!st.length || (st.length === 1 && st[0].est)) return null;
      const k = stepsStats(st); if(!k) return null; np = k.npPct * ftp / 100; iff = k.iff;
    }
    if(!(np > 0)) return null;
    return {np: Math.round(np), lv: !iff ? 0 : iff < 0.75 ? 1 : iff < 0.9 ? 2 : iff < 1 ? 3 : 4};
  }catch(_){ return null; }
}
function calHtml(off, evList, pick, selDate, actList, big){
  const f = calFirst(off), y = f.getFullYear(), m = f.getMonth(), today = iso(new Date());
  const blank = (new Date(y, m, 1).getDay() + 6) % 7, dim = new Date(y, m + 1, 0).getDate();
  const by = {}, byA = {};
  (evList || []).forEach(e => { const k = (e.start_date_local || "").slice(0, 10); (by[k] = by[k] || []).push(e); });
  (actList || []).forEach(a => { const k = (a.start_date_local || "").slice(0, 10); (byA[k] = byA[k] || []).push(a); });
  const heads = lang === "fr" ? ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"] : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  let html = `<div class="cal${big ? " big" : ""}">` + heads.map(h => `<div class="cal-h">${esc(h)}</div>`).join("");
  for(let i = 0; i < blank; i++) html += `<div class="cal-d empty"></div>`;
  let n = 0;
  const byStart = (x, y) => (x.start_date_local || "") < (y.start_date_local || "") ? -1 : 1;
  for(let d = 1; d <= dim; d++){
    const k = `${y}-${pad(m + 1)}-${pad(d)}`, evs = (by[k] || []).slice().sort(byStart), acts = (byA[k] || []).slice().sort(byStart);
    n += evs.length + acts.length;
    html += `<div class="cal-d${k === today ? " today" : ""}${pick && k === selDate ? " sel" : ""}" data-date="${k}"><span class="cal-n">${d}${big ? `<span class="cal-wd"> · ${esc(new Date(y, m, d).toLocaleDateString(loc(), {weekday: "short"}))}</span>` : ""}</span>` +
      evs.map(e => { return `<div class="cal-ev${/Ride/.test(e.type || "") ? "" : " run"}" draggable="true" data-eid="${esc(String(e.id))}"title="${esc(e.name || "")}"><span class="cal-ev-t">${esc(e.name || "—")}</span><button class="cal-x" type="button" data-xid="${esc(String(e.id))}" title="${esc(t("del"))}" aria-label="${esc(t("del"))}">✕</button>${big ? calBigExtra(e, false) : ""}</div>`; }).join("") +
      acts.map(a => { return `<div class="cal-ev done${/Ride/.test(a.type || "") ? "" : " run"}"${/Ride/.test(a.type || "") ? " data-bike" : ""} data-eid="a${esc(String(a.id))}"title="${esc(a.name || a.type || "")}"><span class="cal-ev-t">${esc(a.name || a.type || "—")}</span>${big ? calBigExtra(a, true) : ""}</div>`; }).join("") + `</div>`;
  }
  return {html: html + `</div>`, n};
}
function bindCalChips(box){
  box.querySelectorAll(".cal-ev").forEach(el => {
    el.addEventListener("dragstart", ev => { ev.dataTransfer.setData("text/plain", el.dataset.eid); ev.dataTransfer.effectAllowed = "move"; });
    el.addEventListener("dragend", () => box.querySelectorAll(".cal-d.over").forEach(c => c.classList.remove("over")));
  });
}
// Infobulle au survol d'une séance planifiée (détails + mini-graphe)
// Mini-profil d'une séance réalisée (puissance, ou FC en repli) à partir de ses streams
const STREAM_CACHE = {};
let STREAM_ACTIVE = 0; const STREAM_Q = [];
function streamSlot(){ return new Promise(res => { const go = () => { STREAM_ACTIVE++; res(); }; if(STREAM_ACTIVE < 4) go(); else STREAM_Q.push(go); }); }
function streamFree(){ STREAM_ACTIVE--; const n = STREAM_Q.shift(); if(n) n(); }
function actStreams(id, act){
  if(STREAM_CACHE[id] !== undefined) return STREAM_CACHE[id];
  const pick = list => {
    list = Array.isArray(list) ? list : (list && list.streams) || [];
    const get = (...tys) => { for(const ty of tys){ const d = (list.find(s => s.type === ty) || {}).data; if(d && d.length) return d; } return null; };
    return {w: get("watts", "power", "watts_calc"), h: get("heartrate", "heart_rate", "hr"), s: get("velocity_smooth", "speed", "velocity"), a: get("fixed_altitude", "altitude")};
  };
  const attempt = async url => { // réessaie en cas d'erreur transitoire (429 / 5xx / réseau)
    for(let n = 0; n < 3; n++){
      try{ return {ok: true, v: pick(await icuFetch(url))}; }
      catch(e){ if(/HTTP (4(?!29)\d\d)/.test(String(e.message))) return {ok: false, fatal: true, st: +(String(e.message).match(/HTTP (\d+)/) || [])[1] || 0}; await new Promise(r => setTimeout(r, 600 * (n + 1))); }
    }
    return {ok: false};
  };
  // cache persistant (IndexedDB) : les profils du calendrier ne servent qu'à de petites vignettes → 120 points suffisent
  const calKey = "cal:" + id;
  const calUnpack = c => { const g = x => x && x.length ? Array.from(x) : null; return {w: g(c.w), h: g(c.h), s: g(c.s), a: g(c.a)}; };
  const calSave = (v, neg, ttl) => { const f = x => x && x.length ? Float32Array.from(ds(x, 360)) : null; scPut(calKey, {v: 3, ts: Date.now(), neg: !!neg, ttl: ttl || 0, w: f(v.w), h: f(v.h), s: f(v.s), a: f(v.a)}); };
  const p = (async () => {
    const c = await scGet(calKey);
    // entrée valide ; une absence de données n'est retenue qu'un jour (l'activité peut être en cours de traitement)
    // v2 : entrées écrites avec la requête filtrée, qui pouvait manquer le flux de vitesse (nom « speed ») → vignette FC seule (rose) à tort : on les ignore
    const hrOnly = c && c !== true && !(c.w && c.w.length) && !(c.s && c.s.length) && c.h && c.h.length;
    if(c && c !== true && (c.v === 3 || (c.v === 2 && !hrOnly)) && (!c.neg || Date.now() - c.ts < (c.ttl || 864e5))) return calUnpack(c);
    // sortie à vélo dont les flux complets sont déjà au cache (comparateur, vue d'une séance, préchauffage) : on en tire la vignette sans réseau
    if(act && /Ride|Bike|Cycl/i.test(act.type || "")){
      // puissance seulement : sans elle la vitesse prime sur la FC, et ce cache ne la contient pas
      const full = await scGet(String(id));
      if(full && full !== true && full.w){ const v = {w: full.w ? Array.from(full.w) : null, h: full.hr ? Array.from(full.hr) : null, s: null, a: null}; calSave(v, false); return calUnpack({w: ds(v.w, 360), h: ds(v.h, 360), s: null, a: null}); }
    }
    await streamSlot();
    try{
      let transient = false;
      // sans filtre de types : certains noms (p.ex. "speed") ne sont pas acceptés par le paramètre types
      for(const [ui, u] of [`https://intervals.icu/api/v1/activity/${id}/streams?types=watts,heartrate,velocity_smooth,fixed_altitude`, `https://intervals.icu/api/v1/activity/${id}/streams`, `https://intervals.icu/api/v1/activity/${id}/streams?types=watts,heartrate`].entries()){ // d'abord seulement les 4 flux utiles (bien plus léger que le jeu complet), puis repli
        const r = await attempt(u);
        // requête filtrée : on ne l'accepte que si elle apporte puissance ou vitesse ; sinon (FC seule) on tente le jeu complet, où le flux de vitesse peut porter un autre nom
        if(r.ok && (r.v.w || r.v.s || (ui > 0 && r.v.h))){ calSave(r.v, false); return calUnpack({w: ds(r.v.w, 360), h: ds(r.v.h, 360), s: ds(r.v.s, 360), a: ds(r.v.a, 360)}); }
        if(!r.ok && r.fatal && r.st === 422){ calSave({}, true, 30 * 864e5); return {w: null, h: null, s: null, a: null, transient: false}; } // 422 : activité importée de Strava, intervals.icu n'en fournit pas les flux par l'API → inutile d'essayer les 2 autres requêtes, ni de réessayer avant un mois
        if(!r.ok && !r.fatal) transient = true;
      }
      if(!transient) calSave({}, true);
      return {w: null, h: null, s: null, a: null, transient};
    }finally{ streamFree(); }
  })().then(r => { if(r.transient) delete STREAM_CACHE[id]; return r; }); // un échec transitoire n'est pas mémorisé
  STREAM_CACHE[id] = p;
  return p;
}
// Profil de repli pour une activité sans stream exploitable (puissance/FC moyenne ou altitude)
function actFallbackSvg(e, sw){
  if(sw && sw.a && sw.a.length){ const a = ds(sw.a, 120), lo = Math.min(...a), hi = Math.max(...a), rg = Math.max(hi - lo, 1);
    const X = i => (i / Math.max(1, a.length - 1) * 300).toFixed(1);
    return `<svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 100${a.map((v, i) => `L${X(i)} ${(92 - (v - lo) / rg * 80).toFixed(1)}`).join("")}L300 100Z" fill="#8a8f98" fill-opacity=".3" stroke="#8a8f98" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`; }
  const avg = e && (e.icu_average_watts || e.average_watts), dur = e && e.moving_time;
  if(avg > 0 && dur > 0){ const m = (e.icu_weighted_avg_watts || avg) / avg; // bloc plat à la puissance moyenne
    return `<svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 100L0 ${(96 - Math.min(1, avg / (avg * Math.max(m, 1.15))) * 92).toFixed(1)}L300 ${(96 - Math.min(1, avg / (avg * Math.max(m, 1.15))) * 92).toFixed(1)}L300 100Z" fill="#3b82c4" fill-opacity=".25" stroke="#3b82c4" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`; }
  return "";
}
function actPrevSvg(sw){
  // priorité : puissance, sinon vitesse (tous sports), sinon fréquence cardiaque
  const src = ds(sw.w || sw.s || sw.h || [], 360);
  if(!src.length) return "";
  const col = sw.w ? "#3b82c4" : sw.s ? "#1d7a3a" : "#d6336c";
  const op = sw.w ? ".35" : sw.s ? ".3" : ".18";
  const m = Math.max(...src, 1), n = src.length, W = 300;
  // profil en créneaux (une marche par échantillon, comme des barres) : les intervalles gardent des flancs verticaux
  // au lieu de devenir des triangles ; les marches de même hauteur sont fusionnées pour garder un tracé léger
  const Y = v => Math.round(96 - Math.max(0, v) / m * 92);
  let d = "M0 100", cur = null;
  for(let i = 0; i < n; i++){
    const y = Y(src[i]), x = (i / n * W).toFixed(1);
    if(y !== cur){ d += (cur === null ? "" : "H" + x) + "V" + y; cur = y; }
  }
  d += "H" + W + "V100Z";
  return `<svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="${col}" fill-opacity="${op}" stroke="${col}" stroke-width="1.2" stroke-linejoin="miter" vector-effect="non-scaling-stroke"/></svg>`;
}
function calTipHtml(e, isAct){
  const desc = e.description || "";
  const sport = e.type || "Ride", ftp = ftpFor(sport);
  const steps = !isAct ? plannedSteps(e, ftp) : [];
  let h = `<b>${esc(e.name || "—")}</b>${esc(actT(e.type || ""))}`;
  if(steps.length){
    const st = stepsStats(steps);
    const w = ftp > 0, est = steps.length === 1 && steps[0].est;
    h += `<div class="cal-prev">${stepsSvg(steps)}</div>` +
      hm(st.total) + (est ? "" : " · " + t("libAvg") + " " + (w ? Math.round(st.avgPct * ftp / 100) + " W" : Math.round(st.avgPct) + " %") +
      " · NP " + (w ? Math.round(st.npPct * ftp / 100) + " W" : Math.round(st.npPct) + " %"));
  }else{
    if(e.start_date_local) h += "\n" + new Date(e.start_date_local).toLocaleString(loc(), {weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"});
    if(e.moving_time) h += "\n" + hm(e.moving_time) + (e.distance ? " · " + (Math.round(e.distance / 100) / 10) + " km" : "");
    if(isAct) h += `<div class="cal-prev" data-pid="${esc(String(e.id))}"></div>`;
    else if(desc) h += "\n" + esc(t("noChart"));
  }
  return h;
}
function bindCalTips(box, getEv){
  const getTip = () => { let d = box.querySelector(".tip"); if(!d){ d = document.createElement("div"); d.className = "tip"; d.hidden = true; box.appendChild(d); } return d; };
  if(box._tipped) return; box._tipped = true;
  box.addEventListener("pointermove", e => {
    const tip = getTip(), el = e.target.closest ? e.target.closest(".cal-ev") : null;
    if(!el || !box.contains(el) || box.closest(".cal-max, .cal-page")){ tip.hidden = true; return; }
    if(tip.dataset.eid !== el.dataset.eid){
      tip.dataset.eid = el.dataset.eid;
      const isAct = el.dataset.eid[0] === "a";
      const ev = (getEv() || []).find(x => isAct ? "a" + String(x.id) === el.dataset.eid : String(x.id) === el.dataset.eid);
      tip.innerHTML = ev ? calTipHtml(ev, isAct) : esc(el.title || "");
      if(isAct && ev) actStreams(String(ev.id)).then(sw => {
        if(tip.dataset.eid !== el.dataset.eid) return;
        const pv = tip.querySelector(".cal-prev");
        const svg = actPrevSvg(sw) || actFallbackSvg(ev, sw);
        if(pv){ if(svg) pv.innerHTML = svg; else pv.remove(); }
      });
    }
    tip.hidden = false;
    const r = box.getBoundingClientRect();
    tip.style.left = Math.max(0, Math.min(e.clientX - r.left + 12, r.width - tip.offsetWidth - 4)) + "px";
    tip.style.top = Math.min(e.clientY - r.top + 14, Math.max(0, r.height - tip.offsetHeight - 4)) + "px";
  });
  box.addEventListener("pointerleave", () => { const tip = box.querySelector(".tip"); if(tip) tip.hidden = true; });
}
const CALDRAG = {ev: null}; // séance en cours de glisser-déposer : conservée au changement de mois (elle n'est plus dans la liste du mois affiché)
function setupCalBox(box, getEv, refresh, onPick){
  box.addEventListener("dragstart", e => { const el = e.target.closest ? e.target.closest(".cal-ev[data-eid]") : null; CALDRAG.ev = el ? ((getEv() || []).find(x => String(x.id) === el.dataset.eid) || null) : null; });
  box.addEventListener("dragover", e => { const c = e.target.closest(".cal-d:not(.empty)"); if(c){ e.preventDefault(); e.dataTransfer.dropEffect = "move"; c.classList.add("over"); } });
  box.addEventListener("dragleave", e => { const c = e.target.closest(".cal-d"); if(c) c.classList.remove("over"); });
  box.addEventListener("drop", async e => {
    const c = e.target.closest(".cal-d:not(.empty)"); if(!c) return;
    e.preventDefault(); c.classList.remove("over");
    const id = e.dataTransfer.getData("text/plain"); if(!id) return;
    const ev = (getEv() || []).find(x => String(x.id) === id) || (CALDRAG.ev && String(CALDRAG.ev.id) === id ? CALDRAG.ev : null); if(!ev) return;
    const nd = c.dataset.date;
    if((ev.start_date_local || "").slice(0, 10) === nd) return;
    try{
      await icuFetch(icuUrl("/events/" + id), {method: "PUT", headers: {...icuAuth(), "Content-Type": "application/json"}, body: JSON.stringify({...ev, start_date_local: nd + "T00:00:00"})});
      ev.start_date_local = nd + "T00:00:00"; CALDRAG.ev = null; say("calMoved", "ok", nd); refresh();
    }catch(err){ say("errI", "err", errText(err)); }
  });
  box.addEventListener("click", async e => {
    const x = e.target.closest(".cal-x");
    if(x){
      e.stopPropagation();
      const ev = (getEv() || []).find(v => String(v.id) === x.dataset.xid) || calAllEv().find(v => String(v.id) === x.dataset.xid); if(!ev) return;
      if(!(await ask("cfmDel"))) return;
      try{
        await icuFetch(icuUrl("/events/" + ev.id), {method: "DELETE"});
        say("workoutDeleted", "ok"); refresh();
      }catch(err){ say("errI", "err", errText(err)); }
      return;
    }
    if(onPick){
      const c = e.target.closest(".cal-d:not(.empty)"); if(!c || e.target.closest(".cal-ev")) return;
      onPick(c.dataset.date);
    }
  });
}
// calendrier de droite
// Un workout planifié disparaît dès qu'il est passé (avant aujourd'hui) ou dès qu'une
// séance réalisée figure sur le même jour : on garde alors uniquement la séance faite.
function mergeCal(evs, acts){
  const today = iso(new Date());
  const doneDays = new Set((acts || []).map(a => (a.start_date_local || "").slice(0, 10)));
  return (evs || []).filter(e => {
    const k = (e.start_date_local || "").slice(0, 10);
    return k >= today && !doneDays.has(k);
  });
}
// Cache par mois + préchargement des mois voisins (liste + streams des activités) pour que la navigation soit instantanée
const CAL_CACHE = {}; let CAL_CACHE_KEY = "";
const calSig = (ev, acts) => JSON.stringify([(ev || []).map(e => [e.id, e.start_date_local, e.name]), (acts || []).map(a => [a.id, a.start_date_local, a.name])]);
async function calFetch(m){
  const [a, b] = calRange(m); let fail = false;
  const [ev, acts] = await Promise.all([
    icu(`/events?oldest=${a}&newest=${b}&category=WORKOUT`).catch(() => { fail = true; return []; }),
    icu(`/activities?oldest=${a}&newest=${b}`).catch(() => { fail = true; return []; })
  ]);
  const r = {ev, acts};
  if(!fail && CAL_CACHE_KEY === KEY()) CAL_CACHE[m] = r; // un échec n'est jamais mémorisé
  return r;
}
async function loadCal(fresh){
  if(!KEY()) return;
  if(fresh || CAL_CACHE_KEY !== KEY()){ Object.keys(CAL_CACHE).forEach(k => delete CAL_CACHE[k]); CAL_CACHE_KEY = KEY(); }
  if(fresh && widgets.includes("next")) loadNext().catch(e => { $("nextbox").textContent = t("errI", errText(e)); });
  const m = CAL.m, c = CAL_CACHE[m]; let sig = "";
  calLabel($("calmonth"), m); calLabel($("calmonth2"), m); // le nouveau mois s'affiche tout de suite, même si ses données arrivent après
  const veil = on => ["calbox", "calbox2"].forEach(id => { const b = $(id); if(b) b.classList.toggle("loading", on); });
  veil(!c);
  if(c){ CAL.ev = mergeCal(c.ev, c.acts); CAL.acts = c.acts; sig = calSig(CAL.ev, CAL.acts); renderCal(); } // affichage immédiat depuis le cache
  const r = await calFetch(m);
  if(CAL.m !== m) return; // l'utilisateur a déjà changé de mois
  veil(false);
  const ev = mergeCal(r.ev, r.acts);
  if(!c || calSig(ev, r.acts) !== sig){ CAL.ev = ev; CAL.acts = r.acts; renderCal(); }
  calPrefetch(m);
}
async function calPrefetch(m){
  const tok = CAL.pfTok = (CAL.pfTok || 0) + 1, live = () => tok === CAL.pfTok && !!KEY();
  await Promise.all([m + 1, m - 1].map(mm => CAL_CACHE[mm] ? 0 : calFetch(mm).catch(() => {})));
  if(!live()) return;
  if(!live() || (navigator.connection && navigator.connection.saveData)) return;
  // streams : mois courant d'abord, puis précédent, puis suivant ; 2 requêtes max en parallèle pour laisser de la place à l'affichage
  const ids = [m, m - 1, m + 1].flatMap(k => ((CAL_CACHE[k] || {}).acts || []).slice().sort((x, y) => (y.start_date_local || "") < (x.start_date_local || "") ? -1 : 1).map(a => String(a.id)))
    .filter((id, i, arr) => id && arr.indexOf(id) === i && STREAM_CACHE[id] === undefined);
  let i = 0;
  const idle = async () => { while(STREAM_ACTIVE > 1 || STREAM_Q.length){ if(!live()) return; await new Promise(r => setTimeout(r, 300)); } };
  const worker = async () => { while(i < ids.length && live()){ await idle(); if(!live()) return; const id = ids[i++]; if(STREAM_CACHE[id] === undefined) await actStreams(id).catch(() => {}); calSvgWarm(id); } };
  await Promise.all([worker(), worker()]);
}
function renderCal(){ renderCalW(); renderCalP(); }
