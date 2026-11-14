/* FlameCadence - Player: HUD, road view, map, full screen */
function runFit(){ // hauteur = zone réellement visible (barres du navigateur / geste Android exclues) ; sans effet en vrai plein écran natif
  const el = document.querySelector('[data-block="run"]'), v = window.visualViewport;
  if(!el.classList.contains("rfs")){ el.style.height = el.style.top = ""; return; }
  const h = Math.round(v ? v.height : innerHeight); el.style.height = h + "px"; el.style.top = Math.round(v ? v.offsetTop : 0) + "px";
  // barre de navigation Android qui réapparaît (ou barre du navigateur) : le manque de hauteur est absorbé par le graphique du profil, pas par les mesures principales
  const o = innerWidth > innerHeight ? "l" : "p", M = RUN.fsMax = RUN.fsMax || {}; M[o] = Math.max(M[o] || 0, h);
  el.style.setProperty("--cvh", Math.max(40, Math.round(Math.min(150, Math.max(52, M[o] * .15)) - (M[o] - h))) + "px");
  runDraw();
}
// application installée déjà en plein écran (manifeste) : on n'ajoute pas de plein écran natif de la page, qui masquait les barres système de façon plus agressive (balayage depuis le bord) ; le lecteur reste simplement affiché en recouvrement
const runPwaFs = () => matchMedia("(display-mode: fullscreen)").matches;
// ---- second écran : route en vue subjective (pseudo-3D). La vitesse suit la puissance réelle ; à l'arrêt ou en pause la route s'immobilise.
const RS = {raf: 0, v: 0, dist: 0, t: 0, sig: "", acc: 0, cost: 0}, HZ = {key: "", tops: [], i: -1};
// ---- HUD façon Zwift : valeurs en haut, étapes de la séance à droite, étape en cours et progression en bas
function hzBuild(){
  let top = 0; HZ.tops = []; HZ.i = -1;
  $("hzList").innerHTML = RUN.steps.map(st => {
    const h = Math.max(34, Math.min(150, Math.round(st.dur / 60 * 7))); HZ.tops.push(top); top += h + 4;
    return `<div class="hs" style="height:${h}px;--c:${runZC(st.z)}"><div class="hf"></div><b>${st.g != null ? st.g.toFixed(1) + " %  ·  " + st.pw + " W" : st.pw === st.pw2 ? st.pw + " W" : st.pw + "→" + st.pw2 + " W"}</b><span>${esc(st.name)} · ${st.m > 0 ? fmtDistShort(st.m) : runFmt(st.dur)}</span></div>`;
  }).join("");
}
function hzUpdate(){
  const R = typeof RUN !== "undefined" ? RUN : null, has = !!(R && R.steps && R.steps.length), ftp = has ? runFtp() : 0, st = has ? R.steps[R.i] : null;
  if(has){
    const key = (R.cur ? R.cur.id : "") + "|" + R.steps.length + "|" + ftp; if(key !== HZ.key){ HZ.key = key; hzBuild(); }
    if(R.i !== HZ.i){ HZ.i = R.i; [...$("hzList").children].forEach((c, k) => { c.classList.toggle("past", k < R.i); c.classList.toggle("cur", k === R.i); }); $("hzList").style.transform = `translateY(${-Math.max(0, HZ.tops[R.i] - 8)}px)`; }
  }else if(HZ.key){ HZ.key = ""; $("hzList").innerHTML = ""; }
  const ap = has ? Math.round(R.ap || 0) : 0, tg = has ? runTgt(st, R.left) : 0, pr = has ? Math.round((st.m > 0 ? 1 - Math.max(0, R.mleft) / st.m : 1 - R.left / st.dur) * 100) : 0;
  const clk = runClock(), sa = has && R.sa && R.sa.i === R.i && R.sa.n ? Math.round(R.sa.s / R.sa.n) : 0;
  const sig = [Math.round(RS.v * 3.6), ap, tg, $("runHRv").textContent, $("runCV").textContent, has ? (R.cadOk || 0) + "|" + R.el + "|" + R.total + "|" + R.left + "|" + Math.round(R.mleft) + "|" + R.i : "", pr, clk, sa].join("~");
  try{ mapSync(has); }catch(e){}
  if(sig === RS.sig) return; RS.sig = sig;
  $("hzSp").textContent = Math.round(RS.v * 3.6); $("hzAp").textContent = has ? ap : "--"; $("hzHr").textContent = $("runHRv").textContent; runHrZone(); $("hzCd").textContent = $("runCV").textContent; { const k = $("hzCk"); if(k){ k.classList.toggle("cok", has && R.cadOk === 1); k.classList.toggle("cbad", has && R.cadOk === 2); } }
  const pw = $("hzPw"), dv = ap - tg, near = Math.abs(dv) <= Math.max(5, tg * .05);
  pw.style.setProperty("--zc", runZC(ap > 0 ? zoneOf(ap / ftp * 100) : 1)); pw.style.setProperty("--tc", has && tg ? runZC(zoneOf(tg / ftp * 100)) : "#fff");
  $("hzTg").textContent = has ? (st.g != null ? "≈ " : "▶ ") + tg + " W" + (ap > 0 && tg && !near ? (dv > 0 ? " ▲" : " ▼") : "") : "";
  $("hzEl").textContent = has ? runFmt(R.el) : "00:00"; $("hzTot").textContent = has ? "/ " + (R.hasM ? "~" : "") + runFmt(R.total) + " · " + (R.hasM ? "~" : "") + runFmt(Math.max(0, Math.round(R.total - R.el))) + " " + t("runRemS") : "";
  $("hzNm").textContent = has ? runTitle(st.name) : ""; $("hzLf").textContent = has ? (st.m > 0 ? fmtDistShort(R.mleft) : runFmt(R.left)) : "";
  $("hzPr").style.width = has ? Math.round(runProg() / R.total * 100) + "%" : "0";
  runTm();
  $("hzSt").textContent = has ? [t("hzStep", R.i + 1, R.steps.length), "Z" + st.z, Math.round(tg / ftp * 100) + "% · " + t("hzFtp", ftp), st.cad && st.cad !== "—" ? st.cad + " rpm" : "", st.g != null ? "⛰ " + st.g.toFixed(1) + "%" : "", sa ? "⌀ " + sa + " W" : ""].filter(Boolean).join("  ·  ") : "";
  $("hzNx").textContent = has && R.steps[R.i + 1] ? t("runNx") + (lang === "fr" ? " : " : ": ") + runNxTxt(R.steps[R.i + 1]) : "";
  if(has){ const c = $("hzList").children[R.i]; if(c) c.firstChild.style.height = pr + "%"; }
}
function roadStart(){ if(RS.raf) return; RS.t = performance.now(); RS.raf = requestAnimationFrame(roadFrame); }
function roadStop(){ if(RS.raf) cancelAnimationFrame(RS.raf); RS.raf = 0; }
// Rendu allégé : ciel, nuages, collines, brume et arbres sont dessinés UNE fois dans des calques en cache ; à chaque image on ne fait que les copier (drawImage)
// et tracer les lignes du sol (valeurs précalculées). Résolution interne plafonnée à 800 px de large, cadence plafonnée (~35 i/s), qualité réduite si la machine peine.
const RDS = (() => { let sd = 7; const r = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
  return {
    trees: Array.from({length: 40}, (_, i) => ({z: i * 480 / 40 + r() * 6, side: i % 2 ? 1 : -1, off: 1.4 + r() * 1.9, s: .7 + r() * .75, k: i % 3})),
    blades: Array.from({length: 140}, () => ({z: r() * 480, x: (r() < .5 ? -1 : 1) * (1.25 + r() * 4), l: .5 + r(), k: r()})),
    clouds: Array.from({length: 7}, () => ({x: r(), y: .08 + r() * .5, w: .1 + r() * .14, a: .35 + r() * .4}))
  }; })();
const rdMix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const rdRgb = (c, al) => al == null ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al})`;
const rdSc = (c, k) => [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)];
const rdFog = tt => Math.pow(Math.max(0, 1 - tt * 2.6), 1.4) * .9, RDL = 10, RC = {key: "", C: null};
const rdCol = dark => ({haze: dark ? [36, 42, 96] : [208, 226, 242], gB: dark ? [24, 58, 34] : [88, 134, 60], rB: dark ? [54, 57, 64] : [96, 98, 104], sB: dark ? [88, 86, 80] : [168, 158, 130]});
function rdBuild(w, h, dark){
  const mk = (cw, ch) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(cw)); c.height = Math.max(1, Math.round(ch)); return c; };
  const yh = h * .44, H = h - yh, K = rdCol(dark), haze = K.haze, C = {w, h, yh, H, K, rows: {}};
  let c = mk(w, yh + 1), g = c.getContext("2d"); C.sky = c; // ciel + halo + soleil / lune
  let sk = g.createLinearGradient(0, 0, 0, yh); sk.addColorStop(0, rdRgb(dark ? [8, 12, 38] : [64, 134, 210])); sk.addColorStop(1, rdRgb(haze)); g.fillStyle = sk; g.fillRect(0, 0, w, yh + 1);
  const sx = w * .7, sy = yh * .55, sr = Math.min(w, h) * (dark ? .22 : .38), sg = g.createRadialGradient(sx, sy, 0, sx, sy, sr);
  sg.addColorStop(0, dark ? "rgba(190,200,255,.28)" : "rgba(255,246,205,.75)"); sg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = sg; g.fillRect(0, 0, w, yh);
  g.fillStyle = dark ? "#e6eaff" : "#fffbe6"; g.beginPath(); g.arc(sx, sy, Math.min(w, h) * (dark ? .03 : .034), 0, 7); g.fill();
  C.TW = w * 1.4; c = mk(C.TW, yh); g = c.getContext("2d"); C.cl = c; // nuages (tuile qui se répète)
  RDS.clouds.forEach(cl => { const cx = cl.x * C.TW, cy = cl.y * yh, cw = cl.w * w;
    [[0, 0, 1], [-.55, .12, .7], [.6, .1, .8]].forEach(([ox, oy, k]) => { const x = cx + ox * cw, y = cy + oy * cw * .3;
      g.save(); g.translate(x, y); g.scale(1, .32); const rg = g.createRadialGradient(0, 0, 0, 0, 0, cw * k); rg.addColorStop(0, dark ? `rgba(120,130,190,${cl.a * .35})` : `rgba(255,255,255,${cl.a})`); rg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = rg; g.fillRect(-cw * k, -cw * k, cw * k * 2, cw * k * 2); g.restore(); }); });
  C.HW = w * 1.6; C.hh = Math.ceil(h * .14); c = mk(C.HW, C.hh); g = c.getContext("2d"); C.hl = c; // collines en trois plans (perspective atmosphérique)
  const HL = dark ? [[[32, 40, 88], .06, 3.1, 2.1], [[24, 44, 70], .045, 4.3, 3.6], [[16, 40, 44], .03, 5.7, 5.2]] : [[[160, 188, 212], .06, 3.1, 2.1], [[118, 156, 158], .045, 4.3, 3.6], [[72, 118, 82], .03, 5.7, 5.2]];
  HL.forEach(([col, amp, f1, f2]) => { g.fillStyle = rdRgb(col); g.beginPath(); g.moveTo(0, C.hh);
    for(let x = 0; x <= C.HW + 8; x += 8){ const u = x / C.HW; g.lineTo(x, C.hh - (Math.sin(u * f1 * 3.6) * .5 + Math.sin(u * f2 * 7.2 + 1.3) * .3 + .9) * h * amp); }
    g.lineTo(C.HW + 8, C.hh); g.fill(); });
  C.hzH = h * .05 + H * .2; c = mk(w, C.hzH); g = c.getContext("2d"); C.hz = c; // brume basse
  const hz = g.createLinearGradient(0, 0, 0, C.hzH); hz.addColorStop(0, rdRgb(haze, 0)); hz.addColorStop(h * .05 / C.hzH * .9, rdRgb(haze, .6)); hz.addColorStop(1, rdRgb(haze, 0)); g.fillStyle = hz; g.fillRect(0, 0, w, C.hzH);
  const TP = dark ? [[[14, 40, 28], [26, 62, 44]], [[14, 40, 28], [26, 62, 44]], [[14, 40, 28], [26, 62, 44]]] : [[[36, 88, 50], [70, 128, 70]], [[52, 98, 44], [94, 140, 62]], [[30, 76, 58], [60, 118, 92]]];
  C.tree = TP.map(([dk, lt]) => { const t = mk(100, 200), q = t.getContext("2d"); // sprite d'arbre (hauteur de référence 180 px, pied à y = 190)
    q.fillStyle = "rgba(0,0,0,.16)"; q.beginPath(); q.ellipse(50, 190, 40, 6, 0, 0, 7); q.fill();
    q.fillStyle = rdRgb(dark ? [40, 30, 26] : [84, 62, 42]); q.fillRect(44.6, 122, 10.8, 68);
    q.fillStyle = rdRgb(dk); q.beginPath(); q.ellipse(50, 78, 36, 61, 0, 0, 7); q.fill();
    q.fillStyle = rdRgb(lt); q.beginPath(); q.ellipse(59, 68, 22, 44, 0, 0, 7); q.fill(); return t; });
  return C;
}
function rdRows(C, step){ // lignes du sol : tout ce qui ne dépend que de la hauteur est calculé une fois (couleurs comprises)
  const K = C.K, rows = [];
  for(let y = Math.ceil(C.yh); y < C.h; y += step){
    const tt = (y - C.yh) / C.H, f = rdFog(tt), gc = [], rc = [];
    for(let l = 0; l < RDL; l++){ const wv = -.1 + .2 * l / (RDL - 1); gc.push(rdRgb(rdMix(rdSc(K.gB, 1 + wv), K.haze, f))); rc.push(rdRgb(rdMix(rdSc(K.rB, 1 + wv * .7), K.haze, f))); }
    rows.push({y, tt, zd: 14 / tt, rw: tt * C.w * .42 + 1, ck: (1 - tt) * (1 - tt) * C.w * .38, sh: rdRgb(rdMix(K.sB, K.haze, f)), ln: rdRgb(rdMix([236, 236, 230], K.haze, Math.min(1, f * 1.05))), gc, rc});
  }
  return rows;
}
// ---- Mini-carte satellite du parcours (écran d'animation) : vrai tracé pour les cols (route OpenStreetMap entre le départ et le sommet, mise en cache), parcours virtuel généré pour les autres séances ; fond = imagerie Esri
const COL_GEO = { // départ et sommet : coordonnées (a, b) ou noms de lieux à géocoder (qa, qb ; Nominatim, résultat mis en cache) ; le tracé est obtenu en routant entre les deux, puis vérifié par sa longueur. Clé = nom de la séance avant la longueur (« Col — depuis »)
  "Alpe d'Huez — from Le Bourg-d'Oisans": {a: [45.0553, 6.0309], b: [45.0905, 6.0703]},
  "Mont Ventoux — from Bédoin": {a: [44.1244, 5.1795], b: [44.1739, 5.2785]},
  "Col du Tourmalet — from Luz-Saint-Sauveur": {a: [42.8733, -0.0040], b: [42.9097, 0.1424]},
  "Col d'Aubisque — from Laruns": {a: [42.9890, -0.4380], b: [42.9769, -0.3410]},
  "Col de la Madeleine — from La Chambre": {a: [45.3590, 6.2950], b: [45.4290, 6.3740]},
  "Col de Joux Plane — from Samoëns": {a: [46.0832, 6.7280], b: [46.1004, 6.7256]},
  "Col du Galibier — from Saint-Michel-de-Maurienne": {a: [45.2175, 6.4645], b: [45.0640, 6.4075]},
  "Col de la Ramaz — from Mieussy": {a: [46.1347, 6.5233], b: [46.1633, 6.5747]},
  "Col de la Colombière — from Scionzier (Cluses)": {qa: "Scionzier", b: [45.9922, 6.4758]},
  "Col du Télégraphe — from Saint-Michel-de-Maurienne": {a: [45.2175, 6.4645], qb: "Col du Télégraphe"},
  "Col du Galibier — from Valloire": {qa: "Valloire", b: [45.0640, 6.4075]},
  "Col de la Croix de Fer — from Saint-Étienne-de-Cuines": {qa: "Saint-Étienne-de-Cuines", b: [45.2275, 6.2033]},
  "Col de la Loze — from Brides-les-Bains via Méribel": {qa: "Brides-les-Bains", qb: "Col de la Loze", bike: true},
  "Col d'Izoard — from Briançon": {qa: "Briançon", b: [44.8203, 6.7358]},
  "Col du Grand Colombier — from Culoz": {qa: "Culoz", qb: "Col du Grand Colombier"},
  "Col du Tourmalet — from Sainte-Marie-de-Campan": {qa: "Sainte-Marie-de-Campan", b: [42.9082, 0.1451]},
  "Col d'Aspin — from Arreau": {qa: "Arreau", b: [42.9423, 0.3274]},
  "Col de Peyresourde — from Bagnères-de-Luchon": {qa: "Bagnères-de-Luchon", qb: "Col de Peyresourde"},
  "Port de Balès — from Mauléon-Barousse": {qa: "Mauléon-Barousse", qb: "Port de Balès"},
  "Plateau de Beille — from Les Cabannes": {qa: "Les Cabannes, Ariège", qb: "Plateau de Beille"},
  "Passo dello Stelvio — from Prato allo Stelvio": {qa: "Prato allo Stelvio", b: [46.5286, 10.4533], cc: "it"},
  "Passo del Mortirolo — from Mazzo di Valtellina": {qa: "Mazzo di Valtellina", qb: "Passo del Mortirolo", cc: "it"},
  "Monte Zoncolan — from Ovaro": {qa: "Ovaro", qb: "Monte Zoncolan", cc: "it"}
};
// séance du lecteur → clé de COL_GEO : par identifiant de bibliothèque, sinon (séance du calendrier…) par le nom du col quand il est sans ambiguïté
function colKey(cur){
  const id = (cur && cur.id) || "", nm = (cur && cur.name) || "", ks = Object.keys(COL_GEO);
  const k = ks.find(x => id.indexOf("lib:" + x + " (") === 0); if(k) return k;
  return ks.find(x => nm.indexOf(x.split(" — ")[0] + " — ") === 0) || null;
}
const MAP = {key: "", fail: "", tok: 0, real: false, len: 0, path: null, prog: null, dot: null, sig: -1}, MAP_FAKE = [41.93, 2.97];
function mapMerc(lat, lon, z){ const n = 256 * Math.pow(2, z), r = lat * Math.PI / 180; return [(lon + 180) / 360 * n, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n]; }
function mapFake(seed){ // route sinueuse reproductible (même séance = même parcours), longueur ≈ 6,5 km
  let h = 2166136261; for(const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  let x = 0, y = 0, a = rnd() * 6.283, c = 0; const co = [];
  for(let i = 0; i < 260; i++){ c = Math.max(-.14, Math.min(.14, (c + (rnd() - .5) * .09) * .95)); a += c; x += Math.cos(a) * 25; y += Math.sin(a) * 25; co.push([MAP_FAKE[0] - y / 111320, MAP_FAKE[1] + x / (111320 * Math.cos(MAP_FAKE[0] * Math.PI / 180))]); }
  return co;
}
async function mapGeo(q, cc){ // géocodage d'un lieu (Nominatim, OpenStreetMap), mis en cache
  const ck = "si_geo_" + q; try{ const c = JSON.parse(store.get(ck) || "null"); if(Array.isArray(c) && c.length === 2) return c; }catch(e){}
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), 8000);
  try{
    const r = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=" + (cc || "fr") + "&q=" + encodeURIComponent(q), {signal: ac.signal}), j = await r.json();
    if(Array.isArray(j) && j[0]){ const p = [+(+j[0].lat).toFixed(5), +(+j[0].lon).toFixed(5)]; store.set(ck, JSON.stringify(p)); return p; }
  }catch(e){}
  finally{ clearTimeout(to); }
  return null;
}
function mapDist(a, b){ const r = Math.PI / 180, dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r, h = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); }
async function mapRoute(key, km){
  const g = COL_GEO[key]; if(!g) return null;
  try{ const c = JSON.parse(store.get("si_route_" + key) || "null"); if(Array.isArray(c) && c.length > 10) return c; }catch(e){}
  const a = g.a || await mapGeo(g.qa, g.cc), b = g.b || await mapGeo(g.qb, g.cc); if(!a || !b) return null;
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), 9000);
  try{
    const base = g.bike ? "https://routing.openstreetmap.de/routed-bike/route/v1/driving/" : "https://router.project-osrm.org/route/v1/driving/";
    const r = await fetch(base + a[1] + "," + a[0] + ";" + b[1] + "," + b[0] + "?overview=full&geometries=geojson", {signal: ac.signal});
    const j = await r.json(), rt = j && j.routes && j.routes[0];
    if(!rt || !(rt.distance > km * 750 && rt.distance < km * 1250)) return null; // longueur incohérente avec le col : on n'affiche pas un faux « vrai » tracé
    let co = rt.geometry.coordinates.map(q => [q[1], q[0]]);
    if(rt.distance > km * 1040){ let acc = 0, i = co.length - 1; while(i > 0 && acc < km * 1000){ acc += mapDist(co[i - 1], co[i]); i--; } co = co.slice(i); } // le village de départ peut être avant le pied du col : on ne garde que les derniers km (longueur officielle) en partant du sommet
    const k = Math.ceil(co.length / 500); if(k > 1) co = co.filter((_, i) => i % k === 0 || i === co.length - 1);
    co = co.map(q => [+q[0].toFixed(5), +q[1].toFixed(5)]); store.set("si_route_" + key, JSON.stringify(co)); return co;
  }catch(e){ return null; }
  finally{ clearTimeout(to); }
}
function mapBuild(co, real, full){
  const box = $("hzMap"), s2 = $("runS2"), W = full ? Math.max(320, Math.min(1600, s2.clientWidth || innerWidth)) : 640, H = full ? Math.max(240, Math.min(1000, s2.clientHeight || innerHeight)) : 480, rx = full ? Math.min(230, W * .3) : 0, ty0 = full ? 90 : 0, by0 = full ? 60 : 0, q = co.map(p => mapMerc(p[0], p[1], 20)), xs = q.map(p => p[0]), ys = q.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let z = Math.floor(20 - Math.log2(Math.max((x1 - x0) / (W - rx - 90), (y1 - y0) / (H - ty0 - by0 - 90), 1e-6))); z = Math.max(4, Math.min(17, z));
  const k = Math.pow(2, z - 20), ox = (x0 + x1) / 2 * k - (W - rx) / 2, oy = (y0 + y1) / 2 * k - (ty0 + (H - ty0 - by0) / 2), n = Math.pow(2, z); let im = "";
  for(let ty = Math.floor(oy / 256); ty <= Math.floor((oy + H) / 256); ty++) for(let tx = Math.floor(ox / 256); tx <= Math.floor((ox + W) / 256); tx++){
    if(ty < 0 || ty >= n) continue; im += `<image href="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${((tx % n) + n) % n}" x="${(tx * 256 - ox).toFixed(1)}" y="${(ty * 256 - oy).toFixed(1)}" width="256" height="256"/>`;
  }
  const pt = q.map(p => [p[0] * k - ox, p[1] * k - oy]), d = pt.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(""), e = pt[pt.length - 1];
  const tx = "font-size=\"15\" fill=\"#fff\" stroke=\"#000\" stroke-width=\"3\" paint-order=\"stroke\" font-family=\"sans-serif\"";
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(real ? "Route" : t("mapVirt"))}">${im}<path d="${d}" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/><path id="hzMapR" d="${d}" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path id="hzMapP" d="${d}" fill="none" style="stroke:var(--acc,#ff9d00)" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="0 99999"/><circle cx="${e[0].toFixed(1)}" cy="${e[1].toFixed(1)}" r="8" fill="#ef4444" stroke="#fff" stroke-width="3"/><circle id="hzMapD" cx="${pt[0][0].toFixed(1)}" cy="${pt[0][1].toFixed(1)}" r="11" fill="#fff" style="stroke:var(--acc,#ff9d00)" stroke-width="5"/><text x="${W - 8}" y="${H - 8}" text-anchor="end" ${tx} font-size="13">Imagery © Esri</text>${real ? "" : `<text x="10" y="22" ${tx}>${esc(t("mapVirt"))}</text>`}</svg>`;
  MAP.path = box.querySelector("#hzMapR"); MAP.prog = box.querySelector("#hzMapP"); MAP.dot = box.querySelector("#hzMapD"); MAP.len = 0; MAP.sig = -1;
}
function mapKey(){ const R = RUN; return R && R.cur ? R.cur.id + "|" + R.steps.length : ""; }
function mapWanted(){ const R = typeof RUN !== "undefined" ? RUN : null; return !!(R && R.cur && R.steps && R.steps.some(x => x.m > 0) && (colKey(R.cur) || ROUTES.get(R.steps)) && store.get("si_rm_map") !== "0"); } // second écran = carte satellite d'un col uniquement
function runHas2(){ return mapWanted() && MAP.fail !== mapKey(); }
function runPgUI(){ const b = $("runPg"); if(b) b.hidden = !runHas2(); }
async function mapLoad(tok){
  const R = RUN, ck = colKey(R.cur), key = mapKey(); let co = null;
  if(ck) co = await mapRoute(ck, R.steps.reduce((a, x) => a + (x.m || 0), 0) / 1000); else co = ROUTES.get(R.steps);
  if(tok !== MAP.tok) return;
  if(!co){ // pas de tracé : pas de second écran
    MAP.fail = key; MAP.real = false; MAP.path = null; $("runS2").classList.remove("mapfull"); $("hzMap").hidden = true; runPgUI();
    if(document.querySelector('[data-block="run"]').classList.contains("rs2")) runScr(1);
    return;
  }
  MAP.real = true; $("runS2").classList.add("mapfull"); mapBuild(co, true, true); runPgUI();
}
function mapFrac(){ // avancement sur le tracé : cols = distance parcourue sur les tronçons en pente (échauffement au départ, retour au calme au sommet) ; autres séances = avancement de la séance
  const R = RUN; if(!MAP.real) return R.total ? runProg() / R.total : 0; let M = 0, done = 0;
  R.steps.forEach((x, k) => { if(x.m > 0){ M += x.m; if(k < R.i) done += x.m; else if(k === R.i) done += x.m - Math.max(0, R.mleft); } });
  return M ? done / M : 0;
}
function mapSync(has){
  const box = $("hzMap"); if(!box) return;
  if(!has || !mapWanted() || MAP.fail === mapKey()){ box.hidden = true; $("runS2").classList.remove("mapfull"); runPgUI(); return; }
  const key = mapKey();
  if(key !== MAP.key){ MAP.key = key; MAP.path = null; MAP.real = false; box.hidden = true; $("runS2").classList.add("mapfull"); runPgUI(); mapLoad(++MAP.tok); return; } // pendant le chargement : fond sombre, pas de route animée
  if(!MAP.path) return; box.hidden = false;
  if(!MAP.len){ try{ MAP.len = MAP.path.getTotalLength(); }catch(e){} if(!MAP.len) return; }
  const f = Math.max(0, Math.min(1, mapFrac())), sg = Math.round(f * 2000); if(sg === MAP.sig) return; MAP.sig = sg;
  try{ MAP.prog.setAttribute("stroke-dasharray", (MAP.len * f).toFixed(1) + " " + (MAP.len + 10)); const pt = MAP.path.getPointAtLength(MAP.len * f); MAP.dot.setAttribute("cx", pt.x.toFixed(1)); MAP.dot.setAttribute("cy", pt.y.toFixed(1)); }catch(e){}
}
function roadFrame(now){
  RS.raf = requestAnimationFrame(roadFrame);
  const cv = $("runRd"), cw = cv.clientWidth, chh = cv.clientHeight, mf = $("runS2").classList.contains("mapfull"); if(!mf && (!cw || !chh)) return; // en mode carte plein écran le canvas est masqué (taille 0) : on continue quand même pour mettre à jour la carte et le HUD
  const dt = Math.min(.1, (now - RS.t) / 1000); RS.t = now;
  const P = typeof RUN !== "undefined" && RUN && !RUN.paused ? (+RUN.ap || 0) : 0, target = runSpeed(P, RUN.steps[RUN.i] && RUN.steps[RUN.i].g != null ? RUN.steps[RUN.i].g : 0); // m/s (même modèle que la distance des étapes en pente : puissance, pente, poids)
  RS.v += (target - RS.v) * Math.min(1, dt * 1.5); if(!target && RS.v < .02) RS.v = 0; RS.dist += RS.v * dt;
  RS.acc += dt; if(RS.acc < .028) return; RS.acc = 0; // ~35 images/s au maximum
  if($("runS2").classList.contains("mapfull")){ hzUpdate(); return; } // cols : carte satellite seule, la route animée n'est pas dessinée
  const t0 = performance.now(), sc = Math.min(1, 800 / cw), w = Math.round(cw * sc), h = Math.round(chh * sc);
  if(cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
  const th = document.documentElement.dataset.theme, dark = th ? th === "dark" : matchMedia("(prefers-color-scheme:dark)").matches, key = w + "x" + h + (dark ? "d" : "l");
  if(RC.key !== key){ RC.key = key; RC.C = rdBuild(w, h, dark); }
  if(RS.dist === RS.ld && key === RS.lk){ hzUpdate(); return; } // à l'arrêt : rien à redessiner, seules les valeurs du HUD changent
  RS.ld = RS.dist; RS.lk = key;
  const C = RC.C, g = cv.getContext("2d"), yh = C.yh, H = C.H, dist = RS.dist, K = C.K, curve = Math.sin(dist / 260) * .6 + Math.sin(dist / 97) * .15;
  g.drawImage(C.sky, 0, 0);
  const o = (((dist * .05 - curve * w * .04) % C.TW) + C.TW) % C.TW; g.drawImage(C.cl, -o, 0); g.drawImage(C.cl, C.TW - o, 0);
  g.drawImage(C.hl, (C.HW - w) / 2 + curve * w * .2, 0, w, C.hh, 0, Math.round(yh + 1 - C.hh), w, C.hh);
  const step = (h > 560 ? 3 : 2) + (RS.cost > 11 ? 1 : 0) + (RS.cost > 20 ? 1 : 0), rows = C.rows[step] || (C.rows[step] = rdRows(C, step));
  for(let i = 0; i < rows.length; i++){
    const r = rows[i], q = r.zd + dist, wv = Math.sin(q * .9) * .035 + Math.sin(q * .23 + 1) * .05;
    let l = ((wv + .1) / .2 * (RDL - 1) + .5) | 0; l = l < 0 ? 0 : l > RDL - 1 ? RDL - 1 : l;
    const cx = w / 2 + curve * r.ck, rw = r.rw, y = r.y;
    g.fillStyle = r.gc[l]; g.fillRect(0, y, w, step);
    g.fillStyle = r.sh; g.fillRect(cx - rw * 1.1, y, rw * 2.2, step);
    g.fillStyle = r.rc[l]; g.fillRect(cx - rw, y, rw * 2, step);
    const lw = Math.max(1, rw * .018); g.fillStyle = r.ln; g.fillRect(cx - rw * .93, y, lw, step); g.fillRect(cx + rw * .93 - lw, y, lw, step);
    if(r.tt > .04 && (Math.floor(q / 5) & 1) === 0) g.fillRect(cx - lw / 2, y, lw, step);
  }
  g.drawImage(C.hz, 0, Math.round(yh - h * .05));
  // brins d'herbe (deux tracés groupés)
  [[1.35, d => d > .5], [.7, d => d <= .5]].forEach(([k, pick]) => {
    g.strokeStyle = rdRgb(rdSc(K.gB, k)); g.lineWidth = 1; g.beginPath();
    RDS.blades.forEach(b => { if(!pick(b.k)) return; const a = ((b.z - dist) % 480 + 480) % 480 + 14, tt = 14 / a; if(tt < .06) return;
      const x = w / 2 + curve * (1 - tt) * (1 - tt) * w * .38 + b.x * (tt * w * .42 + 1), by = yh + tt * H; g.moveTo(x, by); g.lineTo(x + (b.k - .5) * tt * 6, by - b.l * tt * h * .035); });
    g.stroke();
  });
  // arbres : sprites en cache, du plus loin au plus proche ; la brume = transparence croissante avec la distance
  const tr = RDS.trees.map(t => ({t, a: ((t.z - dist) % 480 + 480) % 480 + 14})).sort((p, q) => q.a - p.a);
  tr.forEach(({t, a}) => {
    const tt = 14 / a; if(tt < .05 || tt > 1) return;
    const x = w / 2 + curve * (1 - tt) * (1 - tt) * w * .38 + t.side * (tt * w * .42 + 1) * t.off, by = yh + tt * H, k = tt * h * .46 * t.s / 180;
    g.globalAlpha = 1 - rdFog(tt) * .85; g.drawImage(C.tree[t.k], x - 50 * k, by - 190 * k, 100 * k, 200 * k);
  });
  g.globalAlpha = 1;
  hzUpdate();
  RS.cost = RS.cost * .85 + (performance.now() - t0) * .15; // coût moyen d'une image : sert à baisser la qualité si besoin
}
// second écran du lecteur : bouton ●○, balayage horizontal ou flèches du clavier
function runScr(n){
  const el = document.querySelector('[data-block="run"]'), two = n === 2 && el.classList.contains("rfs") && runHas2();
  el.classList.toggle("rs2", two); if(two) roadStart(); else roadStop();
  const b = $("runPg"), l = t(two ? "runScrP" : "runScrN"); b.textContent = two ? "○●" : "●○"; b.title = l; b.setAttribute("aria-label", l);
  if(typeof RUN !== "undefined" && RUN) setTimeout(() => { runFit(); runDraw(); }, 0); // le profil se redessine à son retour
}
(function(){
  const el = document.querySelector('[data-block="run"]'); let x0 = 0, y0 = 0, on = false;
  $("runPg").onclick = () => runScr(el.classList.contains("rs2") ? 1 : 2);
  el.addEventListener("pointerdown", e => { on = el.classList.contains("rfs") && e.pointerType !== "mouse"; x0 = e.clientX; y0 = e.clientY; });
  el.addEventListener("pointerup", e => {
    if(!on) return; on = false;
    const dx = e.clientX - x0, dy = e.clientY - y0; if(Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    runScr(dx < 0 ? 2 : 1);
  });
  el.addEventListener("pointercancel", () => { on = false; });
  document.addEventListener("keydown", e => { if(el.classList.contains("rfs") && !/INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || "")){ if(e.key === "ArrowRight") runScr(2); else if(e.key === "ArrowLeft") runScr(1); } });
})();
function runFs(on){ // plein écran natif si disponible, sinon (iPhone…) simple recouvrement de la page
  const el = document.querySelector('[data-block="run"]'), cur = el.classList.contains("rfs"); on = on === undefined ? !cur : on; if(on === cur) return;
  el.classList.toggle("rfs", on); runWant(false); runScr(1); try{ runPgUI(); }catch(err){} // on revient toujours au premier écran
  if(on){ const ph = el.querySelector(".phead"); ph.append($("runPlay"), $("runFin"), $("runFs")); } // Démarrer / Terminer et enregistrer / bouton quitter : ligne du haut ; ERG et nom du trainer ne sont plus affichés en plein écran
  else{ $("runPrev").after($("runPlay")); $("runNext").after($("runFin")); $("runWkName").after($("runFs")); }
  if(on && el.requestFullscreen && !runPwaFs()) el.requestFullscreen().then(() => { RUN.fsApi = true; }).catch(() => {});
  if(!on){ RUN.fsApi = false; if(document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
  const b = $("runFs"), l = t(on ? "runFsX" : "runFs"); b.title = l; b.setAttribute("aria-label", l); $("runFsP").setAttribute("d", on ? "M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" : "M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"); runFit(); setTimeout(runFit, 120); setTimeout(runFit, 500);
}
// ---- ERG : contrôle du home trainer via le Fitness Machine Control Point FTMS (0x2AD9) : 0x00 prise de contrôle, 0x05 puissance cible (W), 0x07 démarrer/reprendre, 0x08 arrêt/pause, 0x01 reset
const FEC = "6e40fec1-b5a3-f393-e0a9-e50e24dcca9e";
