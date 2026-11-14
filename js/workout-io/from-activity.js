/* FlameCadence - Rebuild a workout from a past activity (planned event or step detection) */
// ---------- Depuis une activité ----------
const ACTS = {list: null};
// lien vers l'activité intervals.icu d'origine dans l'aperçu (visible seulement quand la séance vient d'une activité)
function setSrcAct(a){ const p = $("srcact"); p.hidden = !a; if(a) $("srcactl").href = "https://intervals.icu/activities/" + encodeURIComponent(a.id); }
function renderActs(){
  if(ACTS.list === null) return; // pas encore chargé : ne pas toucher la zone
  const box = $("actbox"), L = ACTS.list;
  if(!L.length){ box.textContent = t(ACTS.searched ? "cmpNone" : "actNone"); return; }
  box.innerHTML = L.map((a, i) => `<button type="button" class="act-row" data-ai="${i}"><b>${esc(a.name || a.type || "")}</b><div class="hint">${esc(new Date(a.start_date_local).toLocaleDateString(loc(), {weekday: "short", day: "numeric", month: "short"}))} · ${esc(actT(a.type))} · ${hm(a.moving_time)}${a.icu_weighted_avg_watts ? " · NP " + Math.round(a.icu_weighted_avg_watts) + " W" : ""}${a.icu_intensity ? " · IF " + (a.icu_intensity > 5 ? a.icu_intensity / 100 : a.icu_intensity).toFixed(2) : ""}${a._m && a._m.q > 0 ? " · " + a._m.cnt + "×" + cmpSec(a._m.mw) + (a._m.mr ? "/" + cmpSec(a._m.mr) : "") + " @ " + Math.round(a._m.avgP) + " W" + (a._m.zone ? " · " + esc(cmpZoneLbl(a._m.zone)) : "") : ""}</div><div class="act-mini" data-ai="${i}"></div></button>`).join("");
  box.querySelectorAll(".act-row").forEach(b => b.onclick = () => buildFromAct(L[+b.dataset.ai], b));
  actMiniLoad(box, L);
}
// aperçu graphique de chaque activité de la liste (chargé à l'affichage, mêmes flux/cache que le calendrier)
function actMiniLoad(box, L){
  if(ACTS.io){ ACTS.io.disconnect(); ACTS.io = null; }
  const els = Array.from(box.querySelectorAll(".act-mini")); if(!els.length) return;
  // même chaîne que le bouton de reconstruction (flux complet → detectSteps → barres colorées par zone) :
  // la vignette montre exactement la séance qu'on obtiendra en cliquant ; repli sur le profil lissé sinon
  const fill = async el => {
    if(el.dataset.ld) return; el.dataset.ld = "1";
    const a = L[+el.dataset.ai]; if(!a){ el.remove(); return; }
    let svg = "";
    try{
      const ftp = isBike(a.type) ? cmpActFtp(a) : 0;
      if(ftp){
        ACTS.svg = ACTS.svg || {};
        if(ACTS.svg[a.id] === undefined){
          await streamSlot();
          try{
            const st = await cmpStreams(a.id, a);
            const steps = st && st.w ? detectSteps(Array.from(st.w), ftp) : [];
            ACTS.svg[a.id] = steps.length ? stepsSvg(steps.map(x => ({d: x.d, a: x.a / ftp * 100, b: x.b / ftp * 100}))) : "";
          }finally{ streamFree(); }
        }
        svg = ACTS.svg[a.id];
      }
      if(!svg){ const sw = await actStreams(a.id); svg = actPrevSvg(sw) || actFallbackSvg(a, sw); }
    }catch(e){ svg = ""; }
    if(svg && el.isConnected) el.innerHTML = svg; else el.remove();
  };
  if(!("IntersectionObserver" in window)){ els.forEach(fill); return; }
  const io = ACTS.io = new IntersectionObserver(es => es.forEach(en => { if(en.isIntersecting){ io.unobserve(en.target); fill(en.target); } }), {rootMargin: "300px"});
  els.forEach(el => io.observe(el));
}
// Détection d'intervalles : lissage 5 s, segmentation par paliers, fusion des segments courts,
// tolérance adaptative pour éviter les séances-patates d'arena à des centaines d'étapes.
// pente moyenne (%) de chaque étape détectée = dénivelé / distance sur la fenêtre de l'étape (flux à 1 Hz) ; seulement si la sortie comporte de vraies pentes (≥ 2 %)
function slopeFor(steps, dist, alt){
  if(!dist || !alt || dist.length < 60) return;
  let at = 0, any = false; const gs = [], ds = [];
  for(const s of steps){
    const i0 = Math.min(at, dist.length - 1), i1 = Math.min(at + Math.round(s.d), dist.length - 1), dd = dist[i1] - dist[i0]; at += Math.round(s.d); ds.push(dd);
    let g = dd >= 80 ? (alt[i1] - alt[i0]) / dd * 100 : null; if(g != null){ g = Math.max(-25, Math.min(25, g)); if(Math.abs(g) >= 2) any = true; } gs.push(g);
  }
  if(any) steps.forEach((s, k) => { if(gs[k] != null){ s.g = Math.round(gs[k] * 10) / 10; s.m = Math.max(10, Math.round(ds[k] / 10) * 10); } }); // pente + distance réelle de l'étape
}
function detectSteps(watts, ftp, opt){
  opt = opt || {};
  const s = [];
  for(const v of watts) s.push(typeof v === "number" && v >= 0 && v < 2500 ? v : 0);
  const N = s.length;
  if(N < 60 || !ftp) return [];
  const K = opt.K || 5, sm = [];
  let sum = 0;
  for(let i = 0; i < N; i++){ sum += s[i]; if(i >= K) sum -= s[i - K]; sm.push(sum / Math.min(i + 1, K)); }
  const build = rel => {
    const tol = v => Math.max(8, v * rel);
    const groups = [];
    let g = null;
    for(let i = 0; i < N; i++){
      const v = sm[i], avg = g ? g.sum / g.n : 0;
      if(g && Math.abs(v - avg) <= tol(avg)){ g.sum += v; g.n++; g.end = i; }
      else{ if(g) groups.push(g); g = {sum: v, n: 1, start: i, end: i}; }
    }
    if(g) groups.push(g);
    // fusion des segments courts (< 20 s) dans le voisin
    const min = opt.min || 20, out = [];
    for(const gr of groups){
      if(gr.n >= min){ out.push({...gr}); continue; }
      if(out.length){ const p = out[out.length - 1]; p.sum += gr.sum; p.n += gr.n; p.end = gr.end; }
      else out.push({...gr}); // court en tête : absorbé par le suivant
    }
    const out2 = [];
    for(let i = 0; i < out.length; i++){
      if(!out2.length && out[i].n < min && i + 1 < out.length){ const nx = out[i + 1]; nx.sum += out[i].sum; nx.n += out[i].n; nx.start = out[i].start; continue; }
      out2.push(out[i]);
    }
    // étapes : moyennes en excluant ~8 s de transition aux bords des groupes
    const ents = [];
    for(const gr of out2){
      const raw = s.slice(gr.start, gr.end + 1);
      const off = raw.length >= 25 ? Math.min(8, Math.round(min * 0.4)) : 0;
      const core = off ? raw.slice(off, raw.length - off) : raw;
      const edge = arr => arr.reduce((x, y) => x + y, 0) / arr.length;
      ents.push({d: gr.n, headW: edge(core.slice(0, Math.min(15, core.length))), tailW: edge(core.slice(-Math.min(15, core.length))), midW: edge(core), wN: core.length});
    }
    // fusion des paliers contigus : une rampe linéaire découpée par la segmentation est recollée
    const mrg = [];
    for(const e of ents){
      const last = mrg[mrg.length - 1];
      if(last && Math.abs(last.tailW - e.headW) <= Math.max(12, (last.midW + e.midW) / 2 * 0.12)){
        last.d += e.d; last.tailW = e.tailW;
        last.midW = (last.midW * last.wN + e.midW * e.wN) / (last.wN + e.wN); last.wN += e.wN;
      }else mrg.push({...e});
    }
    // conversion en % FTP — pas de rampes (certains home trainers ne les gèrent pas) :
    // chaque ancienne rampe devient un palier plat au maximum ou au minimum de la rampe,
    // selon le contexte : voisins plus durs que la rampe → maximum, voisins plus faciles → minimum ;
    // sans voisin, on garde la valeur d'arrivée de la rampe (montante → max, descendante → min).
    // étapes en WATTS ABSOLUS (moyennes réelles du flux de puissance) : pas de conversion en % FTP
    // qui dépend d'une FTP parfois différente de celle de l'activité et surestime les blocs.
    // Les paliers plats utilisent la moyenne du cœur du segment ; les rares rampes sont aplaties
    // au maximum ou au minimum selon le contexte (voisins plus durs → max, plus faciles → min).
    const flat = mrg.map(e => {
      if(e.d >= 30 && Math.abs(e.headW - e.tailW) > Math.max(15, e.midW * 0.15)){
        return {d: e.d, ramp: true, rise: e.tailW >= e.headW, hi: Math.max(e.headW, e.tailW), lo: Math.min(e.headW, e.tailW), mid: e.midW};
      }
      return {d: e.d, ramp: false, mid: e.midW};
    });
    return flat.map((e, i) => {
      if(!e.ramp) return {d: e.d, a: e.mid, b: e.mid};
      const ref = st => st.ramp ? (st.hi + st.lo) / 2 : st.mid;
      const pv = i > 0 ? ref(flat[i - 1]) : null, nx = i + 1 < flat.length ? ref(flat[i + 1]) : null;
      const arr = [pv, nx].filter(x => x != null);
      let v;
      if(!arr.length) v = e.rise ? e.hi : e.lo; // pas de voisin : valeur d'arrivée de la rampe
      else{
        const ctx = arr.reduce((x, y) => x + y, 0) / arr.length;
        v = ctx >= e.mid ? Math.min(e.hi, Math.max(...arr)) : Math.max(e.lo, Math.min(...arr));
      }
      return {d: e.d, a: v, b: v};
    });
  };
  let steps = [];
  for(const rel of [0.07, 0.12, 0.18, 0.25]){
    steps = build(rel);
    if(steps.length <= (opt.max || 50)) break;
  }
  return steps;
}
async function pairedEvent(a){ // séance planifiée liée à l'activité (superposées dans intervals.icu)
  const id = a.paired_event_id, own = (CAL.ev || []).find(e => (id && e.id === id) || (e.paired_activity_id && e.paired_activity_id === a.id));
  if(own) return own;
  if(!id) return null;
  try{ return await icu(`/events/${id}`); }catch(e){ return null; }
}
async function buildFromAct(a, btn){
  btn.disabled = true; say(null);
  try{
    // FTP adaptée à l'activité : home trainer (VirtualRide) → FTP indoor, sortie extérieure → FTP outdoor.
    // On ne suit PAS le sélecteur du panneau « Générer » (souvent sur indoor) : une sortie outdoor
    // reconstruite avec la FTP indoor surestime tous les blocs. Repli sur l'autre FTP si absente.
    const virt = a.type === "VirtualRide";
    const ftp = (virt ? ICU.ftpIn : ICU.ftpOut) || (virt ? ICU.ftpOut : ICU.ftpIn);
    if(!ftp) throw new Error(t("actNeedFtp"));
    const ch = await fitChoose("act", ftp); if(!ch){ btn.disabled = false; return false; } // watts absolus ou % d'une FTP : demandé à chaque reconstruction
    const setU = u => { if($("unit").value !== u){ $("unit").value = u; $("unit").dispatchEvent(new Event("change")); } };
    const pe0 = await pairedEvent(a), pdsc = pe0 && pe0.description ? pe0.description : "", pw = /\d\s*w\b/i.test(pdsc), pp = /\d\s*%/.test(pdsc);
    const pe = pe0 && (ch.watt ? pw && !pp : pp && !pw) ? pe0 : null; // la séance prévue n'est restaurée telle quelle que si elle est écrite dans l'unité demandée
     // séance prévue : on la restaure telle quelle (plus fidèle que la détection d'étapes)
    if(pe){
      const ps = plannedSteps(pe, ftp);
      if(ps.length && !ps.some(x => x.est)){
        if(isBike(a.type)){ $("sport").value = a.type === "VirtualRide" ? "VirtualRide" : "Ride"; syncUnit(); }
        $("name").value = (pe.name || a.name || a.type || "Workout").trim().slice(0, 60);
        $("desc").value = pe.description && parseWorkout(pe.description, pe.type || a.type || "Ride", ftp).length ? pe.description : stepsToDesc(ps);
        $("prev").hidden = false; selLine = null; EXPL = null; setSrcAct(a);
        setU(ch.watt ? "w" : "pct"); renderChart(); say("actPlan", "ok", pe.name || a.name || "");
        $("prev").scrollIntoView({behavior: "smooth", block: "start"});
        btn.disabled = false; return true;
      }
    }
    let list = [];
    for(const u of [`https://intervals.icu/api/v1/activity/${a.id}/streams?types=watts,distance,fixed_altitude`, `https://intervals.icu/api/v1/activity/${a.id}/streams?types=watts`]){
      try{ const j = await icuFetch(u); list = Array.isArray(j) ? j : (j && j.streams) || []; if(list.length) break; }catch(e){ if(/types=watts$/.test(u)) throw e; } // sans altitude (ancienne API / activité intérieure) : on retombe sur la puissance seule
    }
    const get = (...tys) => { for(const ty of tys){ const d = (list.find(x => x.type === ty) || {}).data; if(d && d.length) return d; } return null; };
    const w = get("watts", "power", "watts_calc");
    if(!w) throw new Error(t("actNoPow"));
    let steps = detectSteps(w, ftp);
    if(!steps.length) throw new Error(t("actNoPow"));
    if(isBike(a.type)) slopeFor(steps, get("distance"), get("fixed_altitude", "altitude")); // pente moyenne de chaque étape (sorties extérieures avec altitude)
    if(isBike(a.type)){ $("sport").value = a.type === "VirtualRide" ? "VirtualRide" : "Ride"; syncUnit(); }
    $("name").value = (a.name || a.type || "Workout").trim().slice(0, 60);
    if(!ch.watt){
      // Pourcentages calés sur la FTP sélectionnée pour conserver exactement les watts
      // absolus de l'activité : pct = watts / FTP × 100. On aligne ensuite le sélecteur
      // « intervals.icu FTP » de l'aperçu sur cette même FTP, car l'aperçu, les exports
      // et l'envoi vers intervals.icu réappliquent les pourcentages sur cette FTP :
      // la valeur absolue est ainsi identique de bout en bout.
      // La FTP vient du type de l'activité (déjà appliqué au sélecteur de type ci-dessus) : aperçu, exports et envoi utilisent la même.
      const pf = ch.ftp; // FTP de référence choisie dans la fenêtre
      steps = steps.map(s => ({d: s.d, a: s.a / pf * 100, b: s.b / pf * 100, g: s.g}));
      $("desc").value = stepsToDesc(steps);
    }else{
      $("desc").value = stepsToDesc(steps, true); // valeurs absolues en watts : la séance reproduit la puissance réelle
    }
    $("prev").hidden = false; selLine = null; EXPL = null; setSrcAct(a);
    setU(ch.watt ? "w" : "pct"); renderChart(); say("actOk", "ok", a.name || a.type || "");
    $("prev").scrollIntoView({behavior: "smooth", block: "start"});
    btn.disabled = false; return true;
  }catch(e){
    say("err", "err", errText(e));
  }
  btn.disabled = false; return false;
}
// Recherche d'activités : même moteur que le comparateur (forme, type, nom, intérieur/extérieur) ;
// sans forme ni type, simple filtre sur les métadonnées (aucun flux à télécharger)
// Barre de progression du scan (« À partir d'une activité » et « Comparer ») : remplace le simple compteur texte.
// total inconnu (0) → barre indéterminée ; le texte final (bilan) écrase la barre via textContent.
function scanProg(el, done, total){
  let bar = el.querySelector(".pb");
  if(!bar){
    el.innerHTML = '<div class="pb" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i></i></div><div class="scanlbl"></div>';
    bar = el.querySelector(".pb");
  }
  const known = total > 0, pct = known ? Math.min(100, Math.round(done / total * 100)) : 0;
  bar.classList.toggle("ind", !known);
  if(known) bar.setAttribute("aria-valuenow", pct); else bar.removeAttribute("aria-valuenow");
  bar.firstChild.style.width = known ? pct + "%" : "";
  el.querySelector(".scanlbl").textContent = t("cmpScan", done, known ? total : "?");
}
ACTS.busy = false; ACTS.stop = false; ACTS.searched = false;
async function actSearch(){
  if(ACTS.busy){ ACTS.stop = true; return; }
  const QR = cmpSplitQ($("actq").value), pat = QR.pat;
  if(!KEY()) return say("needI", "err");
  const type = $("acttype").value, place = $("actplace").value, nq = QR.words;
  const scan = !!pat || type !== "any";
  ACTS.busy = true; ACTS.stop = false; $("sact").textContent = t("stopGen"); say(null);
  const box = $("actbox"), stat = $("actstat");
  box.innerHTML = ""; scanProg(stat, 0, 0);
  let nAct = 0, nPow = 0, nBad = 0, nSkip = 0, lastErr = ""; SC.hits = 0;
  try{
    const days = parseInt($("actper").value, 10) || 14;
    const acts = await icu(`/activities?oldest=${daysAgo(days)}&newest=${daysAgo(0)}`);
    const Q = acts.filter(a => nq.every(w => cmpNorm(a.name).includes(w))).filter(a => place === "any" || (place === "in") === cmpIndoor(a))
      .filter(a => a.moving_time >= (pat ? pat.wMin * (pat.repMin === 1 ? 1 : 2) : 60) && (a.icu_average_watts || a.average_watts))
      .filter(a => !cmpSteady(a, pat) || (nSkip++, false)).sort((x, y) => x.start_date_local < y.start_date_local ? 1 : -1).slice(0, 1200);
    nAct = Q.length;
    const hits = [];
    if(!scan) hits.push(...Q.slice(0, 200));
    else{
      let done = 0; scanProg(stat, 0, nAct);
      const worker = async () => {
        while(Q.length && !ACTS.stop){
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
                  hits.push({...a, _m: {q: m.q, cnt: m.cnt, mw: m.mw, mr: m.mr, avgP, zone: pct ? cmpZone(pct) : null}});
              }
            }
          }catch(e){ nBad++; lastErr = String(e.message || e); }
          scanProg(stat, ++done, nAct);
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      hits.sort((x, y) => x.start_date_local < y.start_date_local ? 1 : -1);
    }
    ACTS.list = hits; ACTS.searched = true; renderActs();
    if(hits.length) say("actNres", "ok", hits.length);
  }catch(e){ ACTS.list = ACTS.list || []; renderActs(); say("errI", "err", errText(e)); }
  stat.textContent = scan ? t("cmpDiag", nAct, nPow, nBad, cmpExtra(nSkip, lastErr)) : "";
  $("sact").textContent = t("cmpSearch"); ACTS.busy = false;
}
$("sact").onclick = () => { store.set("si_actper", $("actper").value); store.set("si_acttype", $("acttype").value); store.set("si_actplace", $("actplace").value); store.set("si_actq", $("actq").value); actSearch(); };
$("acttype").onchange = () => store.set("si_acttype", $("acttype").value);
$("actplace").onchange = () => store.set("si_actplace", $("actplace").value);
$("actq").onkeydown = e => { if(e.key === "Enter"){ e.preventDefault(); if(!ACTS.busy) $("sact").click(); } };
{ // préférences sauvegardées
  const ty = store.get("si_acttype"); if(ty && $("acttype").querySelector(`option[value="${ty}"]`)) $("acttype").value = ty;
  const pl = store.get("si_actplace"); if(pl === "in" || pl === "out") $("actplace").value = pl;
  const q = store.get("si_actq"); if(q) $("actq").value = q;
}
$("actper").onchange = () => store.set("si_actper", $("actper").value);
$("actout").onchange = () => { store.set("si_actout", $("actout").value); $("actftpbox").hidden = $("actout").value !== "pct"; };

