/* FlameCadence - Calendar page: week rows with summary, tinted workout cards (intervals.icu style) */
// ---------- Calendrier de la page « Calendrier » : lignes de semaines avec résumé, cartes de séances teintées (style intervals.icu) ----------
function calAllEv(){ const c = CAL_CACHE[CAL.m], raw = c && c.ev ? c.ev.filter(e => !e.paired_activity_id) : []; return raw.length ? raw : (CAL.ev || []); } // séances planifiées non réalisées, y compris les passées (manquées)
const CAL_SVG = {bike: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-8h5l3 8M10 8l3 8"/>', run: '<circle cx="14" cy="4.5" r="1.8"/><path d="M12 9l-3 3-3 1M12 9l3 3 2 5M12 9l1 5-3 5"/>', swim: '<circle cx="17" cy="6.5" r="1.8"/><path d="M4 12.5l6-3.2 4 2 2.6-1.6M3 16.5c1.5 0 1.5 1.2 3 1.2s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2M3 20.5c1.5 0 1.5 1.2 3 1.2s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2"/>', pingpong: '<circle cx="10" cy="10" r="5.5"/><path d="M14 14l6 6"/><circle cx="19" cy="5" r="1.4"/>', other: '<circle cx="12" cy="12" r="4"/>'};
const calIcon = ty => `<svg viewBox="0 0 24 24" aria-hidden="true">${/Ride/.test(ty || "") ? CAL_SVG.bike : /Run|Walk|Hike/.test(ty || "") ? CAL_SVG.run : /Swim/.test(ty || "") ? CAL_SVG.swim : /Table.?Tennis|Ping/i.test(ty || "") ? CAL_SVG.pingpong : CAL_SVG.other}</svg>`;
function isoWeek(d){ const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), dn = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - dn); return Math.ceil(((x - Date.UTC(x.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7); }
function calSvgWarm(id){ // calcule la vignette d'une activité dont les flux sont arrivés (préchargement) pour que son mois s'affiche sans attente
  if(CAL_SVGC[id] !== undefined || !STREAM_CACHE[id]) return;
  STREAM_CACHE[id].then(sw => { if(!sw || sw.transient || CAL_SVGC[id] !== undefined) return; let ev = null; Object.values(CAL_CACHE).some(c => ev = (c.acts || []).find(x => String(x.id) === String(id))); CAL_SVGC[id] = actPrevSvg(sw) || actFallbackSvg(ev, sw); }).catch(() => {});
}
function calMiniHtml(id){ const c = CAL_SVGC[id]; return c === undefined ? `<div class="cal-mini" data-aid="${esc(String(id))}"></div>` : c ? `<div class="cal-mini" data-done="1">${c}</div>` : ""; }
function calCardDone(a){
  const npi = calNP(a, true), lv = npi ? npi.lv : 0, hr = Math.round(a.average_heartrate || 0), w = Math.round(a.icu_weighted_avg_watts || a.icu_average_watts || a.average_watts || 0), c = a.compliance;
  const st = [hr ? `<span class="hr">${hr}bpm</span>` : "", w ? `<span class="pw">${w}w</span>` : ""].filter(Boolean).join(" ");
  const cp = typeof c === "number" && isFinite(c) ? `<div class="cw-cp ${c >= 85 && c <= 120 ? "ok" : c > 0 ? "warn" : "bad"}">${c > 0 ? (c >= 85 && c <= 120 ? "\u2713" : "\u25CF") : "\u2715"} ${Math.round(c)}%</div>` : "";
  return `<div class="cal-ev done cw-card lv${lv}" data-eid="a${esc(String(a.id))}" title="${esc(a.name || a.type || "")}"><div class="cw-hd">${calIcon(a.type)}<span>${a.moving_time ? hm(a.moving_time) : ""}</span>${a.distance ? `<i>${Math.round(a.distance / 1000)} km</i>` : ""}</div><div class="cw-bd">${st ? `<div class="cw-st">${st}</div>` : ""}${a.icu_training_load ? `<div class="cw-ld">${esc(t("perLoadC"))} ${Math.round(a.icu_training_load)}</div>` : ""}${calMiniHtml(a.id)}<div class="cw-nm">${esc(a.name || a.type || "--")}</div>${cp}</div></div>`;
}
function calCardPlan(e, missed){
  const sport = e.type || "Ride", ftp = ftpFor(sport); let steps = []; try{ steps = plannedSteps(e, ftp); }catch(_){}
  const svg = steps.length ? stepsSvg(steps) : "", k = steps.length ? stepsStats(steps) : null, dur = k ? k.total : (e.moving_time || (e.workout_doc && e.workout_doc.duration) || 0), npi = calNP(e, false), lv = npi ? npi.lv : 0;
  return `<div class="cal-ev cw-card plan lv${lv}${missed ? " missed" : ""}" draggable="true" data-eid="${esc(String(e.id))}" title="${esc(e.name || "")}"><div class="cw-hd">${calIcon(sport)}<span>${dur ? hm(dur) : ""}</span><button class="cal-x" type="button" data-xid="${esc(String(e.id))}" title="${esc(t("del"))}" aria-label="${esc(t("del"))}">✕</button></div><div class="cw-bd">${e.icu_training_load ? `<div class="cw-ld">${esc(t("perLoadC"))} ${Math.round(e.icu_training_load)}</div>` : ""}${svg ? `<div class="cal-mini">${svg}</div>` : ""}<div class="cw-nm">${esc(e.name || "--")}</div>${missed ? `<div class="cw-cp bad">\u2715 0%</div>` : ""}</div></div>`;
}
function calWeeksHtml(off, evList, actList){
  const f = calFirst(off), y = f.getFullYear(), m = f.getMonth(), today = iso(new Date()), dim = new Date(y, m + 1, 0).getDate();
  const cur = new Date(y, m, 1, 12); cur.setDate(1 - ((cur.getDay() + 6) % 7)); const last = new Date(y, m, dim, 12);
  const by = {}, byA = {}, byStart = (a, b) => (a.start_date_local || "") < (b.start_date_local || "") ? -1 : 1;
  (evList || []).forEach(e => { const k = (e.start_date_local || "").slice(0, 10); (by[k] = by[k] || []).push(e); });
  (actList || []).forEach(a => { const k = (a.start_date_local || "").slice(0, 10); (byA[k] = byA[k] || []).push(a); });
  const heads = lang === "fr" ? ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let html = `<div class="calw"><div class="cw-head"><div></div>${heads.map(h => `<div>${esc(h)}</div>`).join("")}</div>`, n = 0;
  while(cur <= last){
    const wk = isoWeek(cur); let sec = 0, ld = 0, km = 0, ns = 0, psec = 0, pld = 0, pn = 0, cells = "";
    for(let i = 0; i < 7; i++){
      const k = iso(cur), day = cur.getDate();
      if(cur.getMonth() !== m || cur.getFullYear() !== y) cells += `<div class="cal-d empty"></div>`;
      else{
        const evs = (by[k] || []).slice().sort(byStart), acts = (byA[k] || []).slice().sort(byStart); n += evs.length + acts.length;
        acts.forEach(a => { sec += a.moving_time || 0; ld += a.icu_training_load || 0; km += (a.distance || 0) / 1000; ns++; });
        evs.forEach(e => { if(k >= today){ pn++; pld += e.icu_training_load || 0; psec += e.moving_time || (e.workout_doc && e.workout_doc.duration) || 0; } });
        cells += `<div class="cal-d${k === today ? " today" : ""}" data-date="${k}"><span class="cal-n">${day === 1 ? esc(cur.toLocaleDateString(loc(), {day: "numeric", month: "short"})) : day}<span class="cal-wd"> \u00b7 ${esc(cur.toLocaleDateString(loc(), {weekday: "short"}))}</span></span>` + evs.map(e => calCardPlan(e, k < today)).join("") + acts.map(calCardDone).join("") + `</div>`;
      }
      cur.setDate(cur.getDate() + 1);
    }
    html += `<div class="cw"><div class="cw-sum"><b class="wk">${esc(t("calWeek", wk))}</b>` +
      (ns ? `<span><b>${hm(sec)}</b></span><span>${esc(t("perLoadC"))} <b>${Math.round(ld)}</b></span>${km >= 1 ? `<span>${Math.round(km)} km</span>` : ""}<span>${esc(ns === 1 ? t("calSess1") : t("calSessN", ns))}</span>` : "") +
      (pn ? `<span class="pl">${esc(t("perPlan"))} <b>${pn}</b>${psec ? " \u00b7 " + hm(psec) : ""}${pld ? " \u00b7 " + Math.round(pld) : ""}</span>` : "") + `</div>${cells}</div>`;
  }
  return {html: html + `</div>`, n};
}
function calFitP(){ // ajuste la hauteur du calendrier de la page à la fenêtre : tout le mois est visible, les cartes se compactent si les lignes sont courtes
  const box = $("calbox2"), w = box && box.querySelector(".calw"); if(!w || document.querySelector('[data-block="calp"]').hidden) return;
  if(innerWidth <= 900){ w.style.height = ""; w.classList.remove("fit"); w.querySelectorAll(".cal-d").forEach(c => c.classList.remove("x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8", "x9", "x10", "x11")); return; }
  const top = box.getBoundingClientRect().top + scrollY, sum = ($("calsum2").offsetHeight || 0) + 22, h = Math.max(360, Math.round(innerHeight - top - sum - 10));
  w.classList.add("fit"); w.style.height = h + "px";
  // une carte ne déborde jamais de sa case : on retire d'abord le nom, puis la conformité, FC / puissance, la charge ; le graphique est conservé
  if(!box.offsetParent || w.clientHeight < 100) return; // calendrier pas (encore) affiché : toute mesure serait nulle et compacterait les cartes au maximum
  // par passes (une lecture de toutes les cases, puis une écriture) : une mise en page par niveau au lieu d'une par case et par niveau
  const cells = Array.from(w.querySelectorAll(".cal-d:not(.empty)")); cells.forEach(c => c.classList.remove("x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8", "x9", "x10", "x11"));
  const over = c => { if(c.scrollHeight > c.clientHeight + 1) return true; const cb = c.getBoundingClientRect().bottom; let b = 0; c.querySelectorAll(":scope>.cal-ev").forEach(e => { b = Math.max(b, e.getBoundingClientRect().bottom); }); return b > 0 && b > cb - 2; };
  let todo = cells.filter(c => c.clientHeight);
  for(let l = 1; l <= 11 && todo.length; l++){
    const hit = todo.filter(over); if(!hit.length) break;
    hit.forEach(c => c.classList.add("x" + l)); todo = hit;
  }
}
window.addEventListener("resize", () => { try{ calFitP(); }catch(_){} });
let CALFIT_T = 0;
function calFitSoon(){ clearTimeout(CALFIT_T); CALFIT_T = setTimeout(() => { try{ calFitP(); }catch(_){} }, 80); } // regroupe les demandes : les vignettes et les polices arrivent en différé
try{ if(document.fonts && document.fonts.ready) document.fonts.ready.then(calFitSoon); }catch(_){}
function calFitWatch(){ const box = $("calbox2"); if(!box || box._fw || !window.ResizeObserver) return; box._fw = new ResizeObserver(calFitSoon); box._fw.observe(box); }
function renderCalP(){ // grand calendrier de la page « Calendrier » : mêmes données que le widget (CAL), toujours en vue agrandie
  const box = $("calbox2"); if(!box || document.querySelector('[data-block="calp"]').hidden) return;
  if(!KEY()){ box.textContent = ""; $("calmonth2").textContent = ""; $("calsum2").textContent = ""; return; }
  calLabel($("calmonth2"), CAL.m);
  const r = calWeeksHtml(CAL.m, calAllEv(), CAL.acts || []);
  const first = !box.querySelector(".calw"); // vignettes en attente : cadres de hauteur fixe, elles apparaissent sans décaler la mise en page ; seule la toute première image est masquée jusqu'à sa mesure
  box.innerHTML = r.html + (r.n ? "" : `<div class="hint">${esc(t("calNone"))}</div>`);
  bindCalChips(box);
  calMiniLoad(box);
  renderCalSum($("calsum2"));
  { const w = box.querySelector(".calw"); if(w && first && box.querySelector(".cal-mini[data-aid]")){ w.style.visibility = "hidden"; clearTimeout(CAL_REV_T); CAL_REV_T = setTimeout(() => calReveal(true), 220); } } // jamais d'image non ajustée : le calendrier n'apparaît qu'une fois mesuré (vignettes chargées ou 220 ms au plus)
  calFitP(); calFitSoon(); calFitWatch(); calReveal();
  updateIcuLinks();
}
let CAL_REV_T = 0;
function calReveal(force){
  const box = $("calbox2"), w = box && box.querySelector(".calw"); if(!w || w.style.visibility !== "hidden") return;
  if(!force && box.querySelectorAll(".cal-mini[data-aid]:not([data-done])").length) return;
  try{ calFitP(); }catch(_){} w.style.visibility = ""; clearTimeout(CAL_REV_T);
}
function renderCalW(){
  const box = $("calbox"); if(!box) return;
  if(!KEY()){ box.textContent = ""; $("calmonth").textContent = ""; return; }
  calLabel($("calmonth"), CAL.m);
  const r = calHtml(CAL.m, CAL.ev, false, null, CAL.acts || [], CAL.big);
  box.innerHTML = r.html + (r.n ? "" : `<div class="hint">${esc(t("calNone"))}</div>`);
  bindCalChips(box);
  bindCalTips(box, () => (CAL.ev || []).concat(CAL.acts || []));
  if(CAL.big) calMiniLoad(box);
  renderCalSum();
  updateIcuLinks();
}
// Totaux du mois affiché : réalisé (activités) et reste à faire (séances planifiées à venir, hors jours déjà faits) ; un seul trait, pas de requête en plus
function renderCalSum(el = $("calsum")){
  if(!el) return;
  if(!KEY()){ el.textContent = ""; return; }
  const sum = (L, f) => L.reduce((x, e) => x + (f(e) || 0), 0), A = CAL.acts || [], E = CAL.ev || [];
  const seg = (lbl, L, dist) => {
    if(!L.length) return "";
    const sec = sum(L, e => e.moving_time || (e.workout_doc && e.workout_doc.duration)), ld = Math.round(sum(L, e => e.icu_training_load)), km = dist ? sum(L, e => e.distance) / 1000 : 0;
    const bits = [L.length === 1 ? t("calSess1") : t("calSessN", L.length)];
    if(sec) bits.push(hm(sec)); if(ld) bits.push(ld + " TSS"); if(km >= 1) bits.push(Math.round(km) + " km");
    return `<span><b>${esc(lbl)}</b> ${esc(bits.join(" · "))}</span>`;
  };
  el.innerHTML = seg(t("calDone"), A, true) + seg(t("calLeft"), E, false);
}
$("calprev").onclick = () => { CAL.m--; loadCal().catch(() => {}); };
$("calnext").onclick = () => { CAL.m++; loadCal().catch(() => {}); };
$("rcal").onclick = () => loadCal(true).catch(() => {});
$("calprev2").onclick = () => { CAL.m--; loadCal().catch(() => {}); };
$("calnext2").onclick = () => { CAL.m++; loadCal().catch(() => {}); };
// molette sur le calendrier de la page : mois précédent / suivant (une case qui défile elle-même garde la molette ; Ctrl + molette = zoom, inchangé)
{ let acc = 0, lock = 0, last = 0;
  $("calbox2").addEventListener("wheel", e => {
    if(e.ctrlKey || e.metaKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    const c = e.target.closest && e.target.closest(".cal-d");
    if(c && c.scrollHeight > c.clientHeight + 1 && (e.deltaY > 0 ? c.scrollTop + c.clientHeight < c.scrollHeight - 1 : c.scrollTop > 0)) return;
    e.preventDefault();
    const now = Date.now(); if(now - last > 250) acc = 0; last = now;
    if(now - lock < 350) return; // un cran de molette = un mois, même avec l'inertie du pavé tactile
    acc += e.deltaY; if(Math.abs(acc) < 40) return;
    const d = acc > 0 ? 1 : -1; acc = 0; lock = now; CAL.m += d; loadCal().catch(() => {});
  }, {passive: false}); }
$("rcal2").onclick = () => loadCal(true).catch(() => {});
$("caltoday2").onclick = () => { CAL.m = 0; loadCal().catch(() => {}); setTimeout(() => { const td = document.querySelector("#calbox2 .cal-d.today"); if(td) td.scrollIntoView({block: "center", behavior: "smooth"}); }, 80); };
$("caltoday").onclick = () => { CAL.m = 0; loadCal().catch(() => {}); if(CAL.big) setTimeout(() => { const td = document.querySelector("#calbox .cal-d.today"); if(td) td.scrollIntoView({block: "center", behavior: "smooth"}); }, 80); };
const CAL_ICON = {
  max: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  min: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>'
};
function setCalMax(on){
  CAL.big = !!on;
  const sec = document.querySelector('[data-block="cal"]'), b = $("calmax"), k = CAL.big ? "calMin" : "calMax";
  sec.classList.toggle("cal-max", CAL.big);
  document.documentElement.classList.toggle("calmax", CAL.big);
  b.setAttribute("aria-pressed", String(CAL.big));
  b.dataset.ia = "title:" + k + ";aria-label:" + k;
  b.title = t(k); b.setAttribute("aria-label", t(k));
  b.querySelector("svg").innerHTML = CAL_ICON[CAL.big ? "min" : "max"];
  renderCal();
  sec.scrollTop = 0;
  if(!CAL.big && CAL.forced){ CAL.forced = false; applyWidgets(); } // calendrier ouvert depuis l'outil Replanifier alors que le widget était masqué : on le remasque
}
$("calmax").onclick = () => setCalMax(!CAL.big);
// glisser une séance vers le bord gauche / droit du calendrier (ou sur les flèches ‹ ›) change de mois, pour déplacer une séance d'un mois à l'autre
function calEdgeNav(sec, box, prevB, nextB){
  let timer = null, dir = 0, last = 0;
  const mark = d => { box.classList.toggle("nav-l", d < 0); box.classList.toggle("nav-r", d > 0); prevB.classList.toggle("dragnav", d < 0); nextB.classList.toggle("dragnav", d > 0); };
  const stop = () => { clearTimeout(timer); timer = null; dir = 0; mark(0); };
  const arm = d => {
    if(dir === d && timer) return; stop(); dir = d; mark(d);
    timer = setTimeout(() => { const still = Date.now() - last < 500; stop(); if(still && CALDRAG.ev){ CAL.m += d; loadCal().catch(() => {}); } }, 700);
  };
  sec.addEventListener("dragover", e => {
    if(!CALDRAG.ev) return; last = Date.now();
    const r = box.getBoundingClientRect(), z = Math.min(90, r.width * .12);
    const d = e.target.closest("#" + prevB.id) ? -1 : e.target.closest("#" + nextB.id) ? 1 : (e.clientY >= r.top && e.clientY <= r.bottom ? (e.clientX < r.left + z ? -1 : e.clientX > r.right - z ? 1 : 0) : 0);
    if(d) arm(d); else stop();
  });
  ["drop", "dragend"].forEach(n => document.addEventListener(n, () => { stop(); if(n === "dragend") CALDRAG.ev = null; }, true));
}
calEdgeNav(document.querySelector('[data-block="cal"]'), $("calbox"), $("calprev"), $("calnext"));
calEdgeNav(document.querySelector('[data-block="calp"]'), $("calbox2"), $("calprev2"), $("calnext2"));
document.addEventListener("keydown", e => { if(e.key === "Escape" && CAL.big && !document.querySelector("dialog[open]")) setCalMax(false); });
// clic sur un jour vide : ouvre l'éditeur manuel avec cette date
[$("calbox"), $("calbox2")].forEach(bx => setupCalBox(bx, bx.id === "calbox2" ? calAllEv : () => CAL.ev, () => loadCal(true).catch(() => {}), k => {
  if(CAL.big) setCalMax(false);
  mode = "edit"; store.set("si_mode", mode); applyMode();
  $("date").value = k; refreshDateBtn();
  const ed = document.querySelector('[data-block="edit"]');
  if(ed) ed.scrollIntoView({behavior: "smooth", block: "start"});
}));
// sélecteur de date (popup)
let DT = "date"; // champ ciblé par le popup calendrier : "date" (séance) ou "pstart" (début du plan)
function refreshDateBtn(){
  [["date", "datebtn"], ["pstart", "pstartbtn"]].forEach(([f, b]) => {
    const v = $(f).value;
    $(b).textContent = v ? new Date(v + "T12:00:00").toLocaleDateString(loc(), {weekday: "short", day: "numeric", month: "short", year: "numeric"}) : t("pickDate");
  });
}
async function loadDCal(){
  if(KEY()){ const [a, b] = calRange(CAL.pm);
    [CAL.pev, CAL.dacts] = await Promise.all([
      icu(`/events?oldest=${a}&newest=${b}&category=WORKOUT`).catch(() => []),
      icu(`/activities?oldest=${a}&newest=${b}`).catch(() => [])
    ]);
    CAL.pev = mergeCal(CAL.pev, CAL.dacts);
  }
  else{ CAL.pev = []; CAL.dacts = []; }
  renderDCal();
}
function renderDCal(){
  calLabel($("dcalmonth"), CAL.pm);
  const r = calHtml(CAL.pm, CAL.pev, true, $(DT).value, CAL.dacts || []);
  $("dcalbox").innerHTML = r.html + (r.n ? "" : `<div class="hint">${esc(t("calNone"))}</div>`);
  bindCalChips($("dcalbox"));
  bindCalTips($("dcalbox"), () => (CAL.pev || []).concat(CAL.dacts || []));
}
function openDateDlg(field){
  DT = field;
  const cur = $(DT).value || iso(new Date()), d = new Date(cur + "T12:00:00"), now = new Date();
  CAL.pm = (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth();
  $("dateDlg").showModal(); loadDCal().catch(() => {});
}
$("datebtn").onclick = () => openDateDlg("date");
$("pstartbtn").onclick = () => openDateDlg("pstart");
$("closeDateCal").onclick = () => $("dateDlg").close();
$("dcalprev").onclick = () => { CAL.pm--; loadDCal().catch(() => {}); };
$("dcalnext").onclick = () => { CAL.pm++; loadDCal().catch(() => {}); };
$("dcalnow").onclick = () => { CAL.pm = 0; loadDCal().catch(() => {}); };
setupCalBox($("dcalbox"), () => CAL.pev, () => { loadDCal().catch(() => {}); loadCal(true).catch(() => {}); }, k => { $(DT).value = k; refreshDateBtn(); $("dateDlg").close(); });

