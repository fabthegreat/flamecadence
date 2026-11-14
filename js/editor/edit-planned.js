/* FlameCadence - Edit a planned calendar workout in the manual editor */
// ---------- Modifier une séance planifiée du calendrier dans l'éditeur manuel ----------
// Texte intervals.icu -> étapes de l'éditeur. Les rampes sont aplaties (moyenne), les lignes illisibles ignorées (comptées).
function edFromText(txt, sp){
  const f = ftpFor(sp || edSp()), wMode = edW(), list = [], num = x => parseFloat(String(x).replace(",", "."));
  let skipped = 0, ramps = 0, group = null, secTy = null, seenWork = false;
  const durS = str => {
    let tt = 0, m; const re = /(\d+(?:[.,]\d+)?)\s*(h|min|m|s)(?![a-z])|(\d+):(\d{2})(?::(\d{2}))?/gi;
    while((m = re.exec(str))){
      if(m[3] != null){ tt += m[5] != null ? (+m[3]) * 3600 + (+m[4]) * 60 + (+m[5]) : (+m[3]) * 60 + (+m[4]); continue; }
      const v = num(m[1]), u = m[2].toLowerCase(); tt += u === "h" ? v * 3600 : u === "s" ? v : v * 60;
      const rest = str.slice(re.lastIndex).match(/^\s*(\d{1,2})(?![^\s])/); if(rest && u !== "s") tt += u === "h" ? (+rest[1]) * 60 : +rest[1];
    }
    return tt;
  };
  const distM = str => { const m = str.match(/(\d+(?:[.,]\d+)?)\s*(mtr|km|yrd)/i); if(!m) return 0; const v = num(m[1]), u = m[2].toLowerCase(); return u === "km" ? v * 1000 : u === "yrd" ? v * 0.9144 : v; };
  const inten = body => {
    const hv = hrTok(body); if(hv){ const hp = (hv.ha + hv.hb) / 2; return {hr: true, hp, p: h2p(hp), ramp: hv.range, idx: hv.idx, end: hv.end}; }
    let m = body.match(/(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?\s*%/);
    if(m){
      const a = num(m[1]); let b = m[2] ? num(m[2]) : a, end = m.index + m[0].length;
      const m2 = !m[2] && body.slice(end).match(/^\s*-\s*(\d+(?:[.,]\d+)?)\s*%/); if(m2){ b = num(m2[1]); end += m2[0].length; }
      return {p: (a + b) / 2, pa: a, pb: b, ramp: a !== b, idx: m.index, end};
    }
    m = body.match(/(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?\s*w\b/i); if(m){ const a = num(m[1]), b = m[2] ? num(m[2]) : a; return {w: (a + b) / 2, wa: a, wb: b, ramp: a !== b && /ramp/i.test(body), idx: m.index, end: m.index + m[0].length}; }
    m = body.match(/\bz([1-7])\b/i); if(m) return {p: [50, 65, 82, 97, 112, 135, 160][m[1] - 1], idx: m.index, end: m.index + m[0].length};
    return null;
  };
  const pctOf = it => it.p != null ? it.p : f > 0 ? it.w / f * 100 : 100;
  const toEd = (it, end) => { // end = vrai : valeur de fin d'une rampe ; sinon valeur de départ (ou palier)
    if(!it) return "";
    if(it.hr) return String(Math.round(it.hp));
    const p = it.pa != null ? (end ? it.pb : it.pa) : it.p, w = it.wa != null ? (end ? it.wb : it.wa) : it.w;
    if(wMode) return w != null ? String(Math.round(w)) : f > 0 ? String(Math.round(p * f / 100)) : String(+p.toFixed(1));
    return p != null ? String(+p.toFixed(1)) : f > 0 ? String(Math.round(w / f * 100)) : "";
  };
  const clean = x => x.replace(/\bramp\b/gi, "").replace(/\s+/g, " ").trim();
  const strip = x => x.replace(/\d+(?:[.,]\d+)?\s*(?:h|min|m|s)(?![a-z])(?:\s*\d{1,2}(?=\s|$))?|\d+:\d{2}(?::\d{2})?|\d+(?:[.,]\d+)?\s*(?:mtr|km|yrd)/gi, " ");
  const recNames = T.tt_rec.map(x => x.toLowerCase());
  const mk = (ty, d, dm, it, pre, post) => {
    let g = ""; const sm = String(post || "").match(/\b(?:slope|pente)\s*([+-]?\d+(?:[.,]\d+)?)\s*pct\b/i); if(sm){ g = String(parseFloat(sm[1].replace(",", "."))); post = post.replace(sm[0], " "); }
    let n = [clean(strip(pre)), clean(post)].filter(Boolean).join(" "); if(recNames.includes(n.toLowerCase())) n = "";
    return {g, k: "s", ty, mode: dm ? "d" : "t", v: dm ? String(+(dm / 1000).toFixed(2)) : Math.floor(Math.round(d) / 60) + ":" + String(Math.round(d) % 60).padStart(2, "0"), i: toEd(it), i2: it && it.ramp && !it.hr ? toEd(it, true) : "", n, m: it && it.hr ? "h" : "p", uid: ++edUid};
  };
  const headerTy = l => /cool|retour|warm\s?down/i.test(l) ? "cool" : /warm|échauff|echauff/i.test(l) ? "warm" : /recov|récup|recup|\brest\b|repos/i.test(l) ? "rec" : "work";
  for(const raw of String(txt || "").split("\n")){
    const line = raw.trim();
    if(!line){ group = null; continue; }
    const dashed = line.startsWith("-"); let body = dashed ? line.slice(1).trim() : line, rep = 0;
    const rm = dashed && body.match(/^(\d+)\s*x\s+(.+)$/i); if(rm){ rep = Math.min(50, +rm[1]); body = rm[2]; }
    const it = inten(body), pre = it ? body.slice(0, it.idx) : body, post = it ? body.slice(it.end) : "";
    const d = durS(pre), dm = d ? 0 : distM(pre);
    if((it || dashed) && (d || dm)){
      if(it && it.ramp && it.hr) ramps++; // rampes en puissance : conservées par l'éditeur ; seules celles en cardio sont encore aplaties
      const pv = it ? pctOf(it) : 0;
      const ty = group ? (pv && pv < 65 ? "rec" : "work") : secTy ? secTy : (pv >= 76 || !pv ? "work" : seenWork ? "rec" : "warm");
      if(ty === "work") seenWork = true;
      const st = mk(ty, d, dm, it, pre, post);
      if(rep){ group = null; list.push({k: "g", r: rep, items: [st]}); }
      else if(group) group.items.push(st); else list.push(st);
    }else if(it || dashed){ skipped++; }
    else{
      group = null;
      const r = line.match(/(\d+)\s*x\s*$/i);
      if(r){ group = {k: "g", r: Math.min(50, +r[1]), items: []}; list.push(group); secTy = null; }
      else{ secTy = headerTy(line); const l = list[list.length - 1]; if(l && l.k === "s" && l.ty === secTy) list.push({k: "b"}); }
    }
  }
  return {list: list.filter(x => x.k !== "g" || x.items.length), skipped, ramps};
}
function calEdUI(){
  const b = $("caledbar"); if(!b) return;
  b.hidden = !CALEDIT;
  if(CALEDIT){
    const d = (CALEDIT.ev.start_date_local || "").slice(0, 10);
    $("caledtxt").textContent = t("calEdBanner", CALEDIT.ev.name || "—", d ? new Date(d + "T12:00:00").toLocaleDateString(loc(), {weekday: "short", day: "numeric", month: "short"}) : "");
  }
  $("send").textContent = CALEDIT ? t("calEdSave") : t("send");
}
async function calEdit(ev){
  const ty = ev.type || "Ride";
  if(ty !== "Ride" && ty !== "VirtualRide") return say("calEdSport", "err");
  const dsc = stripBrand(ev.description, ev.name), oldUnit = $("unit").value, hasW = /\d\s*w\b/i.test(dsc), hasP = /\d\s*%/.test(dsc);
  const wantU = hasW && !hasP ? "w" : hasP && !hasW ? "pct" : ""; // séance créée en watts absolus → éditeur en watts (et inversement)
  const setU = u => { if(u && $("unit").value !== u){ $("unit").value = u; $("unit").dispatchEvent(new Event("change")); } };
  setU(wantU);
  const {list, skipped, ramps} = edFromText(dsc, ty);
  if(!list.some(x => x.k === "s" || x.k === "g")){ setU(oldUnit); return say("calEdEmpty", "err"); }
  if(ED.length && edText() !== EDSAVED && !(await ask("calEdCfm"))){ setU(oldUnit); return; } // du travail non enregistré dans l'éditeur
  ED.length = 0; list.forEach(x => ED.push(x)); edCollapsed.clear();
  CALEDIT = {ev};
  if(CAL.big) setCalMax(false);
  $("edsport").value = ty; $("edname").value = ev.name || "";
  $("date").value = (ev.start_date_local || "").slice(0, 10) || iso(new Date()); refreshDateBtn();
  mode = "edit"; store.set("si_mode", mode); applyMode();
  edRender(); EDSAVED = edText(); calEdUI();
  const sec = document.querySelector('[data-block="edit"]'); if(sec) sec.scrollIntoView({behavior: "smooth", block: "start"});
  if(ramps) say("calEdRamp", "info"); else if(skipped) say("calEdSkip", "info", skipped); else say("calEdLoaded", "ok");
}
$("caledx").onclick = () => { CALEDIT = null; calEdUI(); };
// Complète le corps de séance avec échauffement (60 %) + retour au calme (40 %) pour atteindre la durée totale visée ; remplace les échauffements / retours existants
function edFill(){
  const sec = x => { if(x.k === "g") return (parseInt(x.r, 10) || 1) * x.items.reduce((a, y) => a + sec(y), 0); if(x.k !== "s" || x.mode === "d") return 0; const [m, c] = String(x.v).split(":"); return (parseInt(m, 10) || 0) * 60 + (parseInt(c, 10) || 0); };
  const core = ED.filter(x => !(x.k === "s" && (x.ty === "warm" || x.ty === "cool")) && x.k !== "b"), cs = core.reduce((a, x) => a + sec(x), 0), fill = (parseFloat($("edfilt").value) || 0) * 60 - cs;
  const hasRec = core.length && core[0].k === "s" && core[0].ty === "rec"; // le corps commence déjà par une récupération : on n'en ajoute pas
  const rTot = hasRec ? 0 : fill >= 480 ? 180 : fill >= 300 ? 120 : 60; // petite récupération gardée entre l'échauffement et le premier bloc de travail
  if(fill < 120 + rTot) return say("efErr", "err");
  const left = fill - rTot, wTot = Math.round(left * 0.6 / 60) * 60, cTot = Math.round(left / 60) * 60 - wTot;
  const iv = p => edW() && curFtp() > 0 ? String(Math.round(p * curFtp() / 100)) : String(p), mmss = n => Math.floor(n / 60) + ":" + String(n % 60).padStart(2, "0");
  const mk = (ty, n, p) => ({k: "s", ty, mode: "t", v: mmss(n), i: iv(p), n: "", m: "p", uid: ++edUid});
  const split = (tot, parts) => { let rest = tot; return parts.map(([f, p], k) => { const n = k === parts.length - 1 ? rest : Math.round(tot * f / 60) * 60; rest -= n; return [n, p]; }).filter(x => x[0] > 0); };
  const warm = (wTot >= 480 ? split(wTot, [[0.5, 50], [0.3, 60], [0.2, 70]]) : wTot > 0 ? [[wTot, 55]] : []).map(([n, p]) => mk("warm", n, p));
  const cool = (cTot >= 480 ? split(cTot, [[0.4, 60], [0.6, 50]]) : cTot > 0 ? [[cTot, 50]] : []).map(([n, p]) => mk("cool", n, p));
  const keep = ED.filter(x => !(x.k === "s" && (x.ty === "warm" || x.ty === "cool"))), rec = rTot ? [mk("rec", rTot, 50)] : [];
  ED.length = 0; [...warm, ...rec, ...keep, ...cool].forEach(x => ED.push(x));
  edRender(); say("efOk", "ok", Math.round(wTot / 60), Math.round(cTot / 60));
}
$("edfillb").onclick = edFill;
// clic sur une séance planifiée du calendrier : ouverture dans l'éditeur manuel
[$("calbox"), $("calbox2")].forEach(bx => bx.addEventListener("click", e => {
  if(e.target.closest(".cal-x")) return;
  const el = e.target.closest(".cal-ev:not(.done)"); if(!el) return;
  const ev = calAllEv().find(v => String(v.id) === el.dataset.eid); if(ev) calEdit(ev);
}));
// clic sur une séance réalisée du calendrier : ouverture dans l'analyse d'une séance (tous les sports) ;
// la reconstruction de la séance se fait depuis un lien de l'analyse (vélo uniquement)
[$("calbox"), $("calbox2")].forEach(bx => bx.addEventListener("click", e => {
  if(e.target.closest(".cal-x")) return;
  const el = e.target.closest(".cal-ev.done"); if(!el) return;
  const a = (CAL.acts || []).find(v => "a" + v.id === el.dataset.eid); if(!a) return;
  sesOpenAct(a);
}));

