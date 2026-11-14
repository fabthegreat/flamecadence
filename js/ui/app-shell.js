/* FlameCadence - App shell: collapsible blocks, widgets, language, START-UP sequence at the end of the layout part, guided tour (kept together on purpose, see README) */
// ---------- Blocs repliables, liens, langue, démarrage ----------
// --- Col au hasard : tiré dans la bibliothèque à chaque chargement de la page ; tout est calculé à partir de la séance (tronçons distance + pente) ---
const CLB = {list: null, i: -1};
function clbParse(w){
  const segs = [...w.desc_en.matchAll(/^- (\d+)(km|mtr) (\d+)% slope (-?\d+(?:\.\d+)?) pct$/gm)].map(m => ({L: +m[1] / (m[2] === "km" ? 1 : 1000), pct: +m[3], g: +m[4]}));
  if(!segs.length) return null;
  const len = segs.reduce((a, s) => a + s.L, 0), net = segs.reduce((a, s) => a + s.L * 10 * s.g, 0);
  const gain = segs.reduce((a, s) => a + Math.max(0, s.L * 10 * s.g), 0), pts = [[0, 0]]; let x = 0, y = 0;
  segs.forEach(s => { x += s.L; y += s.L * 10 * s.g; pts.push([x, y]); });
  const n = {en: w.name_en, fr: w.name_fr}, cut = s => { const a = s.split(" — "); return [a[0], (a[1] || "").replace(/ \(.*$/, "")]; };
  return {w, segs, len, gain, avg: net / (len * 10), max: Math.max(...segs.map(s => s.g)), pts, en: cut(n.en), fr: cut(n.fr)};
}
function clbList(){ return CLB.list || (CLB.list = LIBRARY.filter(w => w.category === "cols").map(clbParse).filter(Boolean)); }
const clbCol = g => g < 4 ? "#34d399" : g < 6.5 ? "#a3e635" : g < 8.5 ? "#facc15" : g < 11 ? "#fb923c" : "#ef4444";
function clbEta(c){ // durée estimée avec le modèle physique de l'appli : à ta FTP si elle est connue, sinon coureur de référence
  const ftp = curFtp(), kg = totalKg();
  const sec = c.segs.reduce((a, s) => a + s.L * 1000 / (ftp > 0 ? physV(s.pct / 100 * ftp, s.g, kg) : colV(COLS_WKG, s.g)), 0);
  return ftp > 0 ? t("clbEtaMe", hm(sec), Math.round(c.segs[0].pct / 100 * ftp), c.segs[0].pct, Math.round(kg)) : t("clbEtaRef", hm(sec), COLS_WKG);
}
function clbSvg(c){
  const W = 320, H = 130, L = 40, B = 20, T = 8, R = 8, top = Math.max(100, Math.ceil(Math.max(...c.pts.map(p => p[1])) / 100) * 100), px = k => L + k / c.len * (W - L - R), py = m => T + (1 - m / top) * (H - T - B);
  const line = c.pts.map(p => px(p[0]).toFixed(1) + "," + py(Math.max(0, p[1])).toFixed(1)).join(" "), step = c.len <= 8 ? 1 : c.len <= 16 ? 2 : 5;
  let tx = "", gx = ""; for(let k = 0; k <= c.len; k += step) tx += `<text x="${px(k).toFixed(1)}" y="${H - 5}" text-anchor="middle">${k}</text>`;
  [0, .5, 1].forEach(f => { const m = Math.round(top * f); gx += `<line x1="${L}" x2="${W - R}" y1="${py(m).toFixed(1)}" y2="${py(m).toFixed(1)}" style="stroke:var(--line)"/><text x="${L - 4}" y="${(py(m) + 3).toFixed(1)}" text-anchor="end">${m} m</text>`; });
  let area = ""; const base = py(0).toFixed(1); // une tranche par tronçon, de la même couleur que la barre de pente
  c.segs.forEach((s, i) => { const p0 = c.pts[i], p1 = c.pts[i + 1], x0 = px(p0[0]).toFixed(1), x1 = px(p1[0]).toFixed(1), y0 = py(Math.max(0, p0[1])).toFixed(1), y1 = py(Math.max(0, p1[1])).toFixed(1), col = clbCol(s.g); area += `<polygon points="${x0},${base} ${x0},${y0} ${x1},${y1} ${x1},${base}" style="fill:${col};opacity:.5"/><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" style="stroke:${col};stroke-width:2.6;stroke-linecap:round"/>`; });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(c[lang === "fr" ? "fr" : "en"][0])}" style="display:block;font-size:9px;fill:var(--mute)">${gx}${tx}${area}</svg>`;
}
// description courte tirée de Wikipédia (API REST « summary », repli sur la recherche) : seulement quand le widget est visible, gardée 60 jours dans ce navigateur
const CLBW = {tok: 0, cache: null, pending: ""};
const clbWCache = () => CLBW.cache || (CLBW.cache = (() => { try{ const o = JSON.parse(store.get("si_clbwiki") || "{}"); return o && typeof o === "object" ? o : {}; }catch(e){ return {}; } })());
async function clbWikiGet(name, wl){
  const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const stop = ["col", "de", "du", "la", "le", "les", "des", "del", "dello", "della", "passo", "port", "plateau", "mont", "monte", "pass"];
  const toks = norm(name).split(/[^a-z0-9]+/).filter(w => w.length > 3 && !stop.includes(w));
  const sum = async title => { // la page doit être un article normal qui parle bien de ce col (garde-fou contre les homonymes)
    const r = await fetch(`https://${wl}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`);
    if(!r.ok) return null;
    const j = await r.json(); if(j.type !== "standard" || !j.extract) return null;
    const hay = norm(j.title + " " + j.extract); if(toks.length && !toks.some(k => hay.includes(k))) return null;
    return {x: j.extract, u: j.content_urls && j.content_urls.desktop ? j.content_urls.desktop.page : `https://${wl}.wikipedia.org/wiki/${encodeURIComponent(j.title.replace(/ /g, "_"))}`};
  };
  let r = await sum(name).catch(() => null); if(r) return r;
  const s = await fetch(`https://${wl}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=3&format=json&origin=*`).then(x => x.json()).catch(() => null);
  for(const h of ((s && s.query && s.query.search) || [])){ r = await sum(h.title).catch(() => null); if(r) return r; }
  return null;
}
function clbShort(x){ const s = x.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+(?:\s|$)/g) || [x]; let o = ""; for(const p of s){ if(o && (o + p).length > 460) break; o += p; if(o.length >= 280) break; } return o.trim(); }
async function clbWiki(){
  const box = $("clbWiki"), a = clbList(), c = a[CLB.i]; if(!box || !c) return;
  const wl = lang === "fr" ? "fr" : "en", key = wl + "|" + c.en[0], tok = ++CLBW.tok, cache = clbWCache(); let e = cache[key];
  if(!e || Date.now() - e.t > 5184000000){
    if(CLBW.pending === key) return; CLBW.pending = key;
    try{ const r = await clbWikiGet(c.en[0], wl); e = r ? {x: clbShort(r.x), u: r.u, t: Date.now()} : null; }catch(er){ e = null; }
    CLBW.pending = "";
    if(e){ cache[key] = e; try{ store.set("si_clbwiki", JSON.stringify(cache)); }catch(er){} }
    if(tok !== CLBW.tok){ const k2 = a[CLB.i] && (wl + "|" + a[CLB.i].en[0]); if(k2 !== key) return; }
  }
  const bx = $("clbWiki"); if(bx) bx.innerHTML = e ? `<div class="hint" style="margin-top:8px;color:var(--ink)">${esc(e.x)}</div><div class="hint" style="margin-top:4px">${esc(t("clbSrc"))} <a href="${esc(e.u)}" target="_blank" rel="noopener noreferrer">${esc(t("clbWiki"))}</a> · CC BY-SA</div>` : "";
}
function clbRender(){
  const box = $("clbbox"), a = clbList(); if(!box || !a.length) return;
  if(CLB.i < 0) CLB.i = Math.floor(Math.random() * a.length);
  const c = a[CLB.i], nm = c[lang === "fr" ? "fr" : "en"], nf = x => x.toLocaleString(lang === "fr" ? "fr" : "en", {maximumFractionDigits: 1}), player = (() => { try{ return betaRunOn(); }catch(e){ return false; } })();
  box.innerHTML = `<div class="clb-top"><div><div class="clb-n">${esc(nm[0])}</div><div class="clb-f">${esc(nm[1])} · ${CLB.i + 1}/${a.length}</div></div><div class="clb-nav"><button class="alt small icon" type="button" data-clb="prev" title="${esc(t("clbPrev"))}" aria-label="${esc(t("clbPrev"))}">‹</button><button class="alt small icon" type="button" data-clb="next" title="${esc(t("clbNext"))}" aria-label="${esc(t("clbNext"))}">›</button></div></div>`
    + clbSvg(c)
    + `<div class="clb-st"><div><small>${esc(t("clbLen"))}</small><b>${nf(c.len)} km</b></div><div><small>${esc(t("clbGain"))}</small><b>↑ ${Math.round(c.gain).toLocaleString(lang === "fr" ? "fr" : "en")} m</b></div><div><small>${esc(t("clbAvg"))}</small><b style="color:var(--acc)">${nf(c.avg)}%</b></div><div><small>${esc(t("clbMax"))}</small><b>${nf(c.max)}%</b></div></div>`
    + `<div class="hint" style="margin-top:8px">${esc(clbEta(c))}</div><div id="clbWiki"></div>`
    + `<div class="actions" style="margin-top:8px"><button class="small" type="button" data-clb="use">${esc(t("clbUse"))}</button>${player ? `<button class="alt small" type="button" data-clb="play" title="${esc(t("libToPlT"))}">▶ ${esc(t("runItT"))}</button>` : ""}</div>`;
  if(box.offsetParent) clbWiki();
}
$("clbbox").onclick = e => {
  const b = e.target.closest("button[data-clb]"), a = clbList(); if(!b || !a.length) return;
  const act = b.dataset.clb, c = a[CLB.i], w = c.w;
  if(act === "prev" || act === "next"){ CLB.i = (CLB.i + (act === "next" ? 1 : a.length - 1)) % a.length; clbRender(); return; }
  if(act === "play"){ libToPlayer(w); return; }
  $("name").value = lang === "fr" ? w.name_fr : w.name_en; $("desc").value = w.desc_en; const sp = $("sport"); if([...sp.options].some(o => o.value === w.sport)) sp.value = w.sport;
  mode = "lib"; store.set("si_mode", mode); applyMode(); // l'aperçu n'est visible que dans le groupe Générer
  $("prev").hidden = false; selLine = null; EXPL = null; setSrcAct(null); renderChart(); window.scrollTo({top: 0, behavior: "smooth"});
};
$("rclb").onclick = () => { const n = clbList().length; if(n > 1){ let k; do{ k = Math.floor(Math.random() * n); }while(k === CLB.i); CLB.i = k; } clbRender(); };
if("IntersectionObserver" in window) new IntersectionObserver(es => { if(es.some(x => x.isIntersecting)) clbWiki(); }).observe($("clbbox")); // le widget peut être masqué au chargement (onglet Agenda)
new MutationObserver(() => clbRender()).observe(document.documentElement, {attributes: true, attributeFilter: ["lang"]});
clbRender();
// --- Widgets visibles de la colonne de droite (réglages) ---
const WIDGETS = ["cal", "next", "fit", "last", "load", "best", "wx", "zon", "heat", "vo2", "climb"], WDEF = ["cal", "next", "fit", "last", "wx", "climb"];
let widgets = [];
function loadWidgets(){
  const raw = store.get("si_widgets");
  let v = null;
  try{ v = raw ? JSON.parse(raw) : null; }catch(e){ v = null; }
  // la météo (ajoutée ensuite) est activée une fois pour les utilisateurs existants ; ils peuvent la masquer dans les réglages
  const wxNew = !store.get("si_wxinit"), nxNew = !store.get("si_nxinit"); // « prochaine séance » : activée une fois pour les utilisateurs existants
  const zhNew = !store.get("si_zhinit"), zh = k => zhNew && (k === "zon" || k === "heat"); // « temps par zone » et « carte de chaleur » : activés une fois pour les utilisateurs existants
  widgets = WIDGETS.filter(k => v ? v.includes(k) || (k === "wx" && wxNew) || (k === "next" && nxNew) || zh(k) : WDEF.includes(k) || zh(k));
  if(zhNew){ store.set("si_widgets", JSON.stringify(widgets)); store.set("si_zhinit", "1"); }
  if(!store.get("si_vo2init")){ if(!widgets.includes("vo2")) widgets.push("vo2"); store.set("si_widgets", JSON.stringify(widgets)); store.set("si_vo2init", "1"); } // « VO₂max » : activé une fois pour les utilisateurs existants
  if(!store.get("si_clbinit")){ if(!widgets.includes("climb")) widgets.push("climb"); store.set("si_widgets", JSON.stringify(widgets)); store.set("si_clbinit", "1"); } // « col au hasard » : activé une fois pour les utilisateurs existants
  if(wxNew || nxNew){ if(v) store.set("si_widgets", JSON.stringify(widgets)); store.set("si_wxinit", "1"); store.set("si_nxinit", "1"); }
}
function applyWidgets(){
  WIDGETS.forEach(k => { const sec = document.querySelector(`[data-block="${k}"]`); if(sec) sec.hidden = !widgets.includes(k); });
  WIDGETS.forEach(k => { const c = $("w_" + k); if(c) c.checked = widgets.includes(k); });
  updateMoveBtns(); applyWTabs();
  if(KEY() && (widgets.includes("zon") || widgets.includes("heat"))) loadYr();
  if(KEY() && ICU.loaded && widgets.includes("vo2") && !VO2.loaded && !VO2.busy) loadVo2().catch(() => {});
}
function toggleWidget(k){ widgets = widgets.includes(k) ? widgets.filter(x => x !== k) : [...widgets, k]; store.set("si_widgets", JSON.stringify(widgets)); if(widgets.includes(k)){ wtab = grpOf(k); store.set("si_wtab", wtab); } applyWidgets(); }
// --- Onglets de la colonne de droite : les widgets sont regroupés (agenda / forme / analyse), un seul groupe est affiché à la fois ---
const WGROUPS = {agenda: ["cal", "next", "wx", "climb"], form: ["fit", "load", "vo2"], ana: ["last", "best", "zon", "heat"]};
const grpOf = k => Object.keys(WGROUPS).find(g => WGROUPS[g].includes(k));
let wtab = WGROUPS[store.get("si_wtab")] ? store.get("si_wtab") : "agenda";
function applyWTabs(){
  const has = g => WGROUPS[g].some(k => widgets.includes(k)), gs = Object.keys(WGROUPS).filter(has);
  if(!gs.includes(wtab)) wtab = gs[0] || "agenda";
  const bar = $("wtabs"); bar.hidden = gs.length < 2;
  bar.querySelectorAll("[data-wt]").forEach(b => { const on = b.dataset.wt === wtab; b.hidden = !has(b.dataset.wt); b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
  WIDGETS.forEach(k => { const sec = document.querySelector(`[data-block="${k}"]`); if(sec) sec.classList.toggle("wtabhid", gs.length > 1 && grpOf(k) !== wtab); });
}
function setWTab(g, persist){ if(!WGROUPS[g]) return; wtab = g; if(persist !== false) store.set("si_wtab", g); applyWTabs(); }
$("wtabs").querySelectorAll("[data-wt]").forEach(b => b.onclick = () => setWTab(b.dataset.wt));
$("wtabs").addEventListener("keydown", e => {
  if(e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const bs = [...$("wtabs").querySelectorAll("[data-wt]")].filter(b => !b.hidden), i = bs.findIndex(b => b.dataset.wt === wtab);
  if(i < 0) return; e.preventDefault();
  const n = bs[(i + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length]; setWTab(n.dataset.wt); n.focus();
});
// --- Ordre des widgets de la colonne de droite (monter / descendre), mémorisé dans le navigateur et dans l'export des réglages ---
let WORDER = WIDGETS.slice();
function sanitizeOrder(v){
  const a = Array.isArray(v) ? v.filter((x, i) => WIDGETS.includes(x) && v.indexOf(x) === i) : [];
  return [...a, ...WIDGETS.filter(k => !a.includes(k))]; // les clés manquantes sont ajoutées à la fin
}
function loadOrder(){
  let v = null; try{ const r = store.get("si_worder"); v = r ? JSON.parse(r) : null; }catch(e){ v = null; }
  WORDER = sanitizeOrder(v);
  if(Array.isArray(v) && !v.includes("next")){ WORDER = WORDER.filter(k => k !== "next"); WORDER.splice(WORDER.indexOf("cal") + 1, 0, "next"); store.set("si_worder", JSON.stringify(WORDER)); } // placé sous le calendrier la première fois
}
function updateMoveBtns(){
  const vis = WORDER.filter(x => widgets.includes(x));
  WORDER.forEach(k => {
    const sec = document.querySelector(`[data-block="${k}"]`); if(!sec) return;
    const gv = vis.filter(x => grpOf(x) === grpOf(k)); // monter / descendre : à l'intérieur de l'onglet
    sec.querySelectorAll(".mv").forEach(m => { m.disabled = m.dataset.dir === "up" ? gv[0] === k : gv[gv.length - 1] === k; });
  });
}
function applyOrder(){
  const aside = document.querySelector("aside.col"), grid = document.querySelector(".wgrid");
  WORDER.forEach(k => {
    const sec = document.querySelector(`[data-block="${k}"]`); if(sec && aside) aside.appendChild(sec);
    const c = $("w_" + k), l = c && c.closest("label"); if(l && grid) grid.appendChild(l); // même ordre dans la liste des réglages
  });
  updateMoveBtns();
}
function moveWidget(k, dir){
  const vis = WORDER.filter(x => widgets.includes(x) && grpOf(x) === grpOf(k)), i = vis.indexOf(k), j = i + dir;
  if(i < 0 || j < 0 || j >= vis.length) return;
  const a = WORDER.indexOf(k), b = WORDER.indexOf(vis[j]);
  [WORDER[a], WORDER[b]] = [WORDER[b], WORDER[a]]; // échange avec le widget visible voisin
  store.set("si_worder", JSON.stringify(WORDER));
  applyOrder();
  const sec = document.querySelector(`[data-block="${k}"]`);
  const pref = sec && (sec.querySelector(`.mv[data-dir="${dir < 0 ? "up" : "dn"}"]:not(:disabled)`) || sec.querySelector(".mv:not(:disabled)"));
  if(pref) pref.focus(); // le déplacement du nœud fait perdre le focus clavier : on le rend
}
let off = []; try{ const so = store.get("si_off"); if(so) off = JSON.parse(so).filter(k => k !== "req" && k !== "edit" && k !== "lib" && k !== "imp" && k !== "act" && k !== "plan" && k !== "cmp" && k !== "run"); }catch(e){}
function applyBlocks(){
  document.querySelectorAll("[data-block]").forEach(sec => {
    const closed = off.includes(sec.dataset.block); sec.classList.toggle("off", closed);
    const b = sec.querySelector(".tgl"); if(b) b.setAttribute("aria-expanded", String(!closed));
  });
}
document.querySelectorAll('[data-block]:not([data-block="req"]):not([data-block="edit"]):not([data-block="lib"]):not([data-block="imp"]):not([data-block="act"]):not([data-block="plan"]):not([data-block="shift"]):not([data-block="cmp"]):not([data-block="per"]):not([data-block="ses"]):not([data-block="exp"]):not([data-block="chat"]):not([data-block="run"]) > .phead').forEach(h => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "alt small icon tgl"; b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'; b.dataset.ia = "title:collapse;aria-label:collapse";
  b.onclick = () => { const k = h.parentNode.dataset.block; off = off.includes(k) ? off.filter(x => x !== k) : [...off, k]; store.set("si_off", JSON.stringify(off)); applyBlocks(); };
  const grp = document.createElement("span"), seg = document.createElement("span"); grp.className = "hctl"; seg.className = "seg"; // monter / descendre / réduire : restent groupés quand l'en-tête passe à la ligne
  (WIDGETS.includes(h.parentNode.dataset.block) ? ["up", "dn"] : []).forEach(d => {
    const m = document.createElement("button");
    m.type = "button"; m.className = "alt small icon mv"; m.dataset.dir = d;
    m.dataset.ia = d === "up" ? "title:mvUp;aria-label:mvUp" : "title:mvDn;aria-label:mvDn";
    m.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d === "up" ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"}"/></svg>`;
    m.onclick = () => moveWidget(h.parentNode.dataset.block, d === "up" ? -1 : 1);
    seg.appendChild(m);
  });
  grp.appendChild(seg);
  grp.appendChild(b); h.appendChild(grp);
});
function setLinks(){
  [["gh", LINKS.github], ["coffee", LINKS.coffee], ["coffeeTop", LINKS.coffee]].forEach(([id, url]) => {
    const a = $(id);
    if(url){ a.href = url; a.target = "_blank"; a.rel = "noopener"; a.classList.remove("soon"); }
    else{ a.removeAttribute("href"); a.classList.add("soon"); a.title = t("soon"); }
  });
}
function applyLang(){
  if($("tourbub")) setTimeout(() => tourShow(TOUR.i, 1), 0); // visite en cours : le texte de la bulle suit la langue
  document.documentElement.lang = lang; document.title = t("docTitle");
  document.querySelectorAll("[data-i]").forEach(el => { el.textContent = t(el.dataset.i); });
  document.querySelectorAll("[data-ia]").forEach(el => el.dataset.ia.split(";").forEach(p => { const [a, k] = p.split(":"); el.setAttribute(a, t(k)); }));
  document.querySelectorAll(".lang button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.l === lang)));
  applyTheme(); fontUI(); calEdUI(); try{ feelUI(); }catch(e){} try{ musUI(); }catch(e){} // le texte du mode Auto suit la langue
  setLinks(); fillFtp(); profText(); wxCurText(); renderWx(); cacheTick(0); badges(); refreshDateBtn(); renderChart(); renderBest(); renderLoad(); renderZon(); renderHeat(); renderVo2(); renderLast(); renderNext(); renderFit(); renderCal(); edRender(); renderLibrary(); renderActs(); planDays(); planRender(); applyMode(); updateIcuLinks(); if(RUN){ runBtUI(); runUI(); }
  if((mode === "ses" || (mode === "calp" && sesUnder)) && SES.m){ // analyse d'une séance : mois, calendrier et tableaux suivent la langue
    try{ $("sesMT").textContent = SES.m.toLocaleDateString(loc(), {month: "long", year: "numeric"}); if(SES.list.length) sesGrid(++SES.mt); if($("sesSel").value) sesShow(); }catch(e){}
  }
  if(MSG) say(MSG.k, MSG.cls, ...MSG.a);
}
document.querySelectorAll(".lang button").forEach(b => b.onclick = () => { lang = b.dataset.l; store.set("si_lang", lang); applyLang(); });
function applySquare(){ const on = store.get("si_square") === "1"; document.documentElement.toggleAttribute("data-square", on); const c = $("sqCorners"); if(c) c.checked = on; }
function applyMainW(){ const v = parseInt(store.get("si_mainw"), 10) || 0, r = document.documentElement.style; if(v) r.setProperty("--mainw", v + "px"); else r.removeProperty("--mainw"); document.documentElement.toggleAttribute("data-mainw", !!v); /* sans réglage : largeur par défaut du thème */ $("mainW").value = v || 760; $("mainWv").textContent = v ? v + " px" : "Auto"; }
$("mainW").oninput = e => { store.set("si_mainw", e.target.value); applyMainW(); try{ calFitP(); }catch(_){} };
$("mainWr").onclick = () => { store.set("si_mainw", ""); applyMainW(); try{ calFitP(); }catch(_){} };
$("sqCorners").onchange = e => { store.set("si_square", e.target.checked ? "1" : "0"); applySquare(); };
// thèmes d'aspect : « classic » = aucun attribut ; chaque autre thème = un bloc CSS :root[data-look="id"] + une option dans #themesel + ses textes (lk…). nav : la barre Générer/Analyser passe dans l'en-tête ; font : police Google chargée seulement avec ce thème
const LOOKS = {sport: {nav: true, font: "Barlow+Condensed:wght@600;700"}};
const MODE_HOME = (() => { const m = document.querySelector(".layout .mode:not(.cfg-tabs)"); return {m, p: m && m.parentNode, n: m && m.nextSibling}; })(); // emplacement d'origine du sous-menu
const SUB_HOME = (() => { const m = document.querySelector("p.sub"); return {m, p: m && m.parentNode, n: m && m.nextSibling}; })(); // emplacement d'origine du slogan
const GRP_HOME = {p: $("grp").parentNode, n: MODE_HOME.m || $("grp").nextSibling}; // emplacement d'origine de la barre Générer / Analyser
function lookId(){ const v = store.get("si_look"); return v === "0" || v === "classic" ? "classic" : /^[a-z]+$/.test(v || "") ? v : "sport"; }
function applyLook(){
  const id = lookId(), L = LOOKS[id] || {}, r = document.documentElement, g = $("grp"), h = document.querySelector("header");
  if(id === "classic") delete r.dataset.look; else r.dataset.look = id;
  if(L.font && !document.getElementById("fl-look-" + id)){ const l = document.createElement("link"); l.id = "fl-look-" + id; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=" + L.font + "&display=swap"; document.head.appendChild(l); }
  const mm = MODE_HOME.m, side = !!L.nav && matchMedia("(min-width:901px)").matches; // sous-menu : dans la barre latérale (écran large), sinon à sa place d'origine
  const sb = SUB_HOME.m; if(sb && sb.parentNode === h) SUB_HOME.p.insertBefore(sb, SUB_HOME.n); // slogan : sous le logo dans la barre latérale, sinon à sa place d'origine
  if(mm && mm.parentNode === h) MODE_HOME.p.insertBefore(mm, MODE_HOME.n);
  if(g && h){ if(L.nav){ if(g.parentNode !== h) h.insertBefore(g, h.querySelector(".tools")); } else if(g.parentNode === h) GRP_HOME.p.insertBefore(g, GRP_HOME.n); }
  if(mm && h && side) h.insertBefore(mm, g.nextSibling);
  if(sb && h && side) h.insertBefore(sb, h.querySelector(".brand").nextSibling);
  const s = $("themesel"); if(s) s.value = id;
}
$("themesel").onchange = e => { store.set("si_look", e.target.value); applyLook(); };
matchMedia("(min-width:901px)").addEventListener("change", () => applyLook()); // le sous-menu change d'emplacement quand on passe sous / sur 901 px
applyLook();
applySquare(); applyMainW();
$("fontsel").onchange = e => { font = e.target.value; store.set("si_font", font); applyFont(); };
$("theme").onclick = () => { theme = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % 3]; store.set("si_theme", theme); applyTheme(); };
$("date").value = iso(new Date()); refreshDateBtn();
loadWidgets(); loadOrder(); applyOrder(); applyBlocks(); applyMode(); loadSettings(); applyLang(); syncUnit(); $("edsport").value = $("sport").value; edRender(); renderLibrary();
$("bkind").value = store.get("si_bkind") || "VirtualRide"; $("actper").value = store.get("si_actper") || "14"; $("actout").value = store.get("si_actout") || "w"; $("actftpbox").hidden = $("actout").value !== "pct";
$("fper").value = store.get("si_fper") || "60"; $("vo2per").value = ["7", "14", "42"].includes(store.get("si_vo2per")) ? store.get("si_vo2per") : "7"; $("zper").value = ["4", "8", "12"].includes(store.get("si_zper")) ? store.get("si_zper") : "8"; $("zbas").value = store.get("si_zbas") === "hr" ? "hr" : "power"; $("edunit").value = $("unit").value; $("punit").value = $("unit").value;
// (plus d'ouverture automatique des réglages au chargement : la carte d'accueil guide la première visite, et les clés d'IA sont facultatives)

// ---------- Visite guidée : surbrillance d'un élément + bulle explicative, étape par étape ----------
const TOUR_STEPS = [
  {k: 0},
  {k: 11, sel: ["#open"]},
  {k: 13, sel: ["#grp"]},
  {k: 1, sel: [".mode:not(.cfg-tabs)"]},
  {k: 3, mode: "lib", sel: ['[data-block="lib"]']},
  {k: 4, mode: "edit", sel: ['[data-block="edit"]']},
  {k: 2, mode: "ai", sel: ['[data-block="req"]']},
  {k: 14, mode: "imp", sel: ['[data-block="imp"]']},
  {k: 15, mode: "act", sel: ['[data-block="act"]']},
  {k: 5, mode: "plan", sel: ['[data-block="plan"]']},
  {k: 16, mode: "shift", sel: ['[data-block="shift"]']},
  {k: 18, mode: "per", sel: ['[data-block="per"]']},
  {k: 6, mode: "cmp", sel: ['[data-block="cmp"]']},
  {k: 19, mode: "exp", sel: ['[data-block="exp"]']},
  {k: 7, w: ["cal"]},
  {k: 8, w: ["next"]},
  {k: 9, w: ["fit", "last", "load"]},
  {k: 10, w: ["zon", "heat"]},
  {k: 12, w: ["vo2"]},
  {k: 20, sel: ["#more"]}
];
const TOUR = {on: false, i: 0, list: [], mode0: null, y0: 0, hl: null, bub: null, ov: null};
function tourEl(st){
  const sels = st.w ? st.w.filter(k => widgets.includes(k)).map(k => `[data-block="${k}"]`) : (st.sel || []);
  for(const q of sels){ const e = document.querySelector(q); if(e && !e.hidden) return e; }
  return null;
}
function tourSetMode(m){
  if(!m || mode === m) return;
  const b = document.querySelector(`.mode:not(.cfg-tabs) [data-m="${m}"]`); if(b) b.click();
}
function tourPlace(){
  if(!TOUR.on) return;
  const st = TOUR.list[TOUR.i], el = st.k === 0 ? null : tourEl(st), hl = TOUR.hl, bub = TOUR.bub, vw = innerWidth, vh = innerHeight, M = 12;
  let r = null;
  if(el){
    const b = el.getBoundingClientRect(), top = Math.max(b.top, 0), cap = vh * 0.55, h = Math.min(b.bottom - top, cap);
    r = {x: Math.max(b.left - 6, 4), y: Math.max(top - 6, 4), w: Math.min(b.width + 12, vw - 8), h: h + 12};
    hl.className = ""; hl.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`;
  } else { hl.className = "none"; hl.style.cssText = `left:${vw / 2}px;top:${vh / 2}px;width:0;height:0`; }
  const bw = bub.offsetWidth, bh = bub.offsetHeight; let x, y;
  if(!r){ x = (vw - bw) / 2; y = (vh - bh) / 2; }
  else {
    x = Math.min(Math.max(r.x + r.w / 2 - bw / 2, M), vw - bw - M);
    if(r.y + r.h + M + bh <= vh - M) y = r.y + r.h + M;
    else if(r.y - M - bh >= M) y = r.y - M - bh;
    else{ x = (vw - bw) / 2; y = vh - bh - M; } // pas de place autour : bulle ancrée en bas de l'écran
  }
  bub.style.left = Math.round(x) + "px"; bub.style.top = Math.round(y) + "px";
}
function tourShow(i, dir){
  const L = TOUR.list;
  while(i >= 0 && i < L.length){ // saute les étapes dont l'élément n'est pas visible (widget masqué)
    const st = L[i]; tourSetMode(st.mode);
    if(st.w){ const wk = st.w.find(x => widgets.includes(x)); if(wk) setWTab(grpOf(wk), false); } // affiche l'onglet du widget présenté
    if(st.k === 0 || tourEl(st)) break;
    i += dir || 1;
  }
  if(i < 0 || i >= L.length) return i < 0 ? tourShow(0, 1) : tourEnd();
  TOUR.i = i; const st = L[i], el = st.k === 0 ? null : tourEl(st);
  if(el){ const b = el.getBoundingClientRect(); if(b.top < 70 || b.top > innerHeight * 0.4) window.scrollBy({top: b.top - 90, behavior: "auto"}); }
  const bub = TOUR.bub, last = i === L.length - 1;
  bub.setAttribute("aria-label", t("tr" + st.k + "T"));
  bub.innerHTML = `<h3>${esc(t("tr" + st.k + "T"))}</h3><p>${esc(t("tr" + st.k))}</p><div class="tfoot"><span class="tcount">${esc(t("tourOf", i + 1, L.length))}</span>${last ? "" : `<button type="button" class="alt" data-a="skip">${esc(t("tourSkip"))}</button>`}${i ? `<button type="button" class="alt" data-a="prev">${esc(t("tourPrev"))}</button>` : ""}<button type="button" data-a="next">${esc(last ? t("tourDone") : t("tourNext"))}</button></div>`;
  tourPlace();
  const nb = bub.querySelector('[data-a="next"]'); if(nb) nb.focus({preventScroll: true});
}
function tourEnd(){
  if(!TOUR.on) return;
  TOUR.on = false;
  [TOUR.ov, TOUR.hl, TOUR.bub].forEach(e => e && e.remove());
  document.removeEventListener("keydown", tourKey, true); removeEventListener("resize", tourPlace); removeEventListener("scroll", tourPlace, true);
  tourSetMode(TOUR.mode0); setWTab(TOUR.wtab0, false); window.scrollTo(0, TOUR.y0);
  $("tourbtn").focus({preventScroll: true});
}
function tourKey(e){
  if(!TOUR.on) return;
  if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); tourEnd(); }
  else if(e.key === "ArrowRight"){ e.preventDefault(); tourShow(TOUR.i + 1, 1); }
  else if(e.key === "ArrowLeft"){ e.preventDefault(); tourShow(TOUR.i - 1, -1); }
  else if(e.key === "Tab"){ // le focus reste dans la bulle
    const bs = [...TOUR.bub.querySelectorAll("button")]; if(!bs.length) return;
    const f = bs.indexOf(document.activeElement);
    if(e.shiftKey && f <= 0){ e.preventDefault(); bs[bs.length - 1].focus(); } else if(!e.shiftKey && f === bs.length - 1){ e.preventDefault(); bs[0].focus(); }
  }
}
function tourStart(){
  if(TOUR.on) return;
  const more = $("more"); if(more) more.open = false;
  TOUR.on = true; TOUR.mode0 = mode; TOUR.y0 = scrollY; TOUR.wtab0 = wtab;
  // les étapes dont le widget est masqué sont retirées d'avance, pour que le compteur « n / N » soit juste
  TOUR.list = TOUR_STEPS.filter(st => !st.w || st.w.some(k => widgets.includes(k)));
  const ov = document.createElement("div"), hl = document.createElement("div"), bub = document.createElement("div");
  ov.id = "tourov"; hl.id = "tourhl"; bub.id = "tourbub"; bub.setAttribute("role", "dialog"); bub.setAttribute("aria-live", "polite");
  document.body.append(ov, hl, bub); TOUR.ov = ov; TOUR.hl = hl; TOUR.bub = bub;
  bub.onclick = e => { const a = e.target.closest("[data-a]"); if(!a) return; const k = a.dataset.a; if(k === "skip") tourEnd(); else if(k === "prev") tourShow(TOUR.i - 1, -1); else if(TOUR.i >= TOUR.list.length - 1) tourEnd(); else tourShow(TOUR.i + 1, 1); };
  document.addEventListener("keydown", tourKey, true); addEventListener("resize", tourPlace); addEventListener("scroll", tourPlace, true);
  tourShow(0, 1);
}
$("tourbtn").onclick = tourStart;
// Première visite : carte d'accueil tant qu'aucune clé intervals.icu n'est enregistrée (masquable)
function welcomeUpdate(){ const w = $("welcome"); if(w) w.hidden = !!KEY() || store.get("si_welcome") === "1"; }
$("wlcConn").onclick = () => { $("open").click(); cfgTab("icu"); setTimeout(() => { try{ $("ikey").focus(); }catch(e){} }, 50); };
$("wlcTour").onclick = tourStart;
$("wlcX").onclick = () => { store.set("si_welcome", "1"); welcomeUpdate(); };
$("cfg").addEventListener("close", welcomeUpdate); welcomeUpdate();
// Installation sur l'écran d'accueil (Android / Chrome et dérivés) : l'invite native si le navigateur la propose, sinon le mode d'emploi
let DEFER_INSTALL = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); DEFER_INSTALL = e; });
window.addEventListener("appinstalled", () => { DEFER_INSTALL = null; $("installbtn").hidden = true; });
if(!(matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone)) $("installbtn").hidden = false;
$("installbtn").onclick = async () => { if(DEFER_INSTALL){ const p = DEFER_INSTALL; DEFER_INSTALL = null; p.prompt(); try{ await p.userChoice; }catch(e){} } else toast(t("installHow"), "ok"); };
