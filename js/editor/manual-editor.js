/* FlameCadence - Manual workout editor, automatic workout naming */
// ---------- Éditeur de séance manuel ----------
const ED = [];
let edUid = 0; const edCollapsed = new Set(); // identifiants de blocs + blocs repliés
const edSp = () => $("edsport").value, edKm = () => isBike(edSp()), edW = () => edKm() && $("unit").value === "w";
// Cible par défaut (option du formulaire) : une étape sans choix explicite (x.m absent) la suit ; le sélecteur de l'étape permet de la changer au cas par cas
const edM0 = () => edKm() && $("edmetric").value === "h" ? "h" : "p", edM = x => edKm() ? (x.m || edM0()) : "p";
const edIv = pc => { const f = ftpFor(edSp()); return edM0() === "h" ? String(Math.round(p2h(pc))) : String(edW() && f ? Math.round(f * pc / 100) : pc); };
// conversion de l'intensité d'une étape d'une cible à l'autre (via l'intensité équivalente en % FTP)
function edConv(v, from, to){
  if(v === "" || v == null || from === to) return v;
  const n = parseFloat(String(v).replace(",", ".")); if(!isFinite(n)) return v;
  const f = ftpFor(edSp());
  if(from === "p") return String(Math.round(p2h(edW() && f ? n / f * 100 : n)));
  const pc = h2p(n); return String(edW() && f ? Math.round(f * pc / 100) : Math.round(pc));
}
const opts = (a, cur) => a.map(([v, l]) => `<option value="${v}"${v === cur ? " selected" : ""}>${esc(l)}</option>`).join("");
function edDef(ty){
  const pc = {warm: 55, work: 95, rec: 50, cool: 50}[ty], f = ftpFor(edSp());
  return {k: "s", ty, mode: "t", v: ty === "work" ? "5:00" : ty === "rec" ? "2:00" : "10:00", i: edIv(pc), n: "", uid: ++edUid};
}
const edAt = p => { const a = String(p).split(".").map(Number); return a.length === 1 ? {list: ED, i: a[0]} : {list: ED[a[0]].items, i: a[1]}; };
// Échauffement / retour au calme standards : progression de paliers insérée en un clic
// depuis le bouton « Standard » de l'étape. Les intensités suivent le réglage des unités
// (% FTP ou watts absolus via la FTP sélectionnée), comme pour les autres étapes.
const ED_STD = {
  warm: [[3, 0, 50], [2, 0, 60], [2, 0, 70], [1, 0, 80], [1, 0, 90], [0, 30, 110], [1, 0, 55], [0, 30, 110], [1, 0, 55], [0, 30, 110], [2, 0, 55]],
  cool: [[2, 0, 60], [3, 0, 50], [5, 0, 40]]
};
function stdSteps(ty){
  const f = ftpFor(edSp());
  return (ED_STD[ty] || []).map(([m, s, pc]) => ({k: "s", ty, mode: "t", v: m + ":" + String(s).padStart(2, "0"), i: edIv(pc), n: "", uid: ++edUid}));
}
const edBtn = (a, txt, ttl, cls) => `<button class="alt small${cls ? " " + cls : ""}" data-a="${a}" type="button"${ttl ? ` title="${esc(ttl)}" aria-label="${esc(ttl)}"` : ""}>${txt}</button>`;
const edCtl = (rec, std) => `<span class="drg" title="${esc(t("dragLbl"))}" aria-label="${esc(t("dragLbl"))}">⠿</span><span class="ctl">${edBtn("up", "↑", t("mvUp"))}${edBtn("down", "↓", t("mvDown"))}${edBtn("dup", "⧉", t("dup"))}${rec ? edBtn("rec", esc(t("addRecAfter"))) : ""}${std ? edBtn("std", esc(std)) : ""}${edBtn("del", "✕", t("del"), "danger")}</span>`;
const edGuide = x => edKm() && edM(x) !== "h" && x.g !== "" && x.g != null && isFinite(+x.g); // étape en pente : l'intensité n'est qu'un guide d'effort
function edUnit(x){ // unité du champ d'intensité ; pour une étape en pente on affiche aussi l'équivalent (W ou % FTP)
  const hrm = edM(x) === "h", u = hrm ? "% LTHR" : edW() ? "W" : edKm() ? "% FTP" : "% " + t("pace");
  const f = edKm() ? ftpFor(edSp()) : 0, v = parseFloat(String(x.i).replace(",", "."));
  if(!edGuide(x) || !(f > 0) || !(v > 0)) return u;
  return edW() ? u + " ≈ " + Math.round(v / f * 100) + "% FTP" : u + " ≈ " + Math.round(v * f / 100) + " W";
}
function edStep(x, p){
  const hrm = edM(x) === "h", bpm = hrm && ICU.lthr > 0 && x.i !== "" && x.i != null ? ` title="≈ ${Math.round(parseFloat(x.i) * ICU.lthr / 100) || 0} bpm"` : "";
  const u = edUnit(x);
  return `<div class="st ${x.ty}" data-p="${p}"><select data-f="ty" aria-label="${esc(t("edT"))}">${opts(["warm", "work", "rec", "cool"].map(y => [y, t("tt_" + y)]), x.ty)}</select>` +
    `<select data-f="mode">${opts([["t", t("edTime")], ["d", t("edDist")]], x.mode)}</select>` +
    `<div class="fld"><input data-f="v" value="${esc(x.v)}" aria-label="${esc(t(x.mode === "d" ? "edDist" : "edTime"))}"><span>${x.mode === "d" ? (edKm() ? "km" : "m") : "mm:ss"}</span></div>` +
    (edKm() ? `<select data-f="m" title="${esc(t("mTitle"))}" aria-label="${esc(t("mTitle"))}">${opts([["p", t("mPow")], ["h", "♥ " + t("mHr")]], edM(x))}</select>` : "") +
    `<div class="fld"><input data-f="i" type="number" min="0" value="${esc(x.i)}"${bpm}${edGuide(x) ? ` title="${esc(t("edGuideT"))}"` : ""} aria-label="${esc(t("edInt"))}"><span>${esc(u)}</span></div>` +
    (edKm() && edM(x) !== "h" ? `<div class="fld s"><input data-f="i2" type="number" min="0" value="${esc(x.i2 == null ? "" : x.i2)}" placeholder="→" title="${esc(t("edRampT"))}" aria-label="${esc(t("edRampT"))}"><span>↗</span></div>` : "") +
    (edKm() ? `<div class="fld s"><input data-f="g" type="number" step="0.1" value="${esc(x.g == null ? "" : x.g)}" title="${esc(t("edSlopeT"))}" aria-label="${esc(t("edSlopeT"))}"><span>% ⛰</span></div>` : "") +
    `<input data-f="n" value="${esc(x.n)}" placeholder="${esc(t("edNote"))}">${edCtl(x.ty !== "rec", x.ty === "warm" || x.ty === "cool" ? t("std_" + x.ty) : null)}</div>`;
}
// Préréglages de répétitions standard : [répétitions, [[min, sec, %FTP] effort, [min, sec, %FTP] récup]]
const ED_GSTD = [
  [10, [[1, 0, 105], [1, 0, 50]]],
  [5,  [[2, 0, 100], [2, 0, 50]]],
  [5,  [[4, 0, 95],  [4, 0, 50]]],
  [4,  [[5, 0, 95],  [3, 0, 50]]],
  [3,  [[8, 0, 90],  [4, 0, 50]]],
  [8,  [[0, 30, 130], [0, 30, 55]]],
  [6,  [[0, 40, 120], [0, 20, 60]]],
  [2,  [[12, 0, 88], [6, 0, 50]]]
];
const gStdLabel = p => { const sec = x => x[0] * 60 + x[1]; return `${p[0]} × ${fmtDur(sec(p[1][0]))}/${fmtDur(sec(p[1][1]))} @${p[1][0][2]}%`; };
function gStdSteps(p){
  const f = ftpFor(edSp());
  return p[1].map(([m, s, pc], j) => ({k: "s", ty: j % 2 ? "rec" : "work", mode: "t", v: m + ":" + String(s).padStart(2, "0"), i: edIv(pc), n: "", uid: ++edUid}));
}
const gStdSel = i => `<select class="gstd" data-gstd="${i}" aria-label="${esc(t("gstdLbl"))}"><option value="">${esc(t("gstdLbl"))}</option>${ED_GSTD.map((p, k) => `<option value="${k}">${esc(gStdLabel(p))}</option>`).join("")}</select>`;
const edGrp = (g, i) => `<div class="grp" data-gi="${i}"><div class="gh" data-p="${i}"><b>${esc(t("repLbl"))}</b><span class="stp">${edBtn("rm", "−", t("repDec"))}<input data-f="r" type="number" min="1" max="50" value="${esc(g.r)}" aria-label="${esc(t("repLbl"))}">${edBtn("rp", "+", t("repInc"))}<span aria-hidden="true">×</span></span>${edCtl(false)}</div>${g.items.map((x, j) => edStep(x, i + "." + j)).join("")}<div class="actions">${gStdSel(i)}<button class="alt small" data-a="addin" data-g="${i}" data-ty="work" type="button">${esc(t("addWork"))}</button><button class="alt small" data-a="addin" data-g="${i}" data-ty="rec" type="button">${esc(t("addRec"))}</button></div></div>`;
function edDur(x){
  if(x.mode === "d") return (parseFloat(String(x.v).replace(",", ".")) || 0) + (edKm() ? "km" : "mtr");
  const [m, sc] = String(x.v).split(":"), sec = (parseInt(m, 10) || 0) * 60 + (parseInt(sc, 10) || 0), h = Math.floor(sec / 3600), mm = Math.floor(sec % 3600 / 60), ss = sec % 60;
  return (h ? h + "h" : "") + (mm ? mm + "m" : "") + (ss ? ss + "s" : "") || "0s";
}
function edLine(x){
  const ramp = edKm() && edM(x) !== "h" && x.i !== "" && x.i != null && x.i2 !== "" && x.i2 != null && isFinite(+x.i2) && +x.i2 !== +x.i; // intensité de fin différente = rampe (le sens est conservé)
  const i = ramp ? " " + x.i + " - " + x.i2 + (edW() ? "w ramp" : "% ramp") : x.i !== "" && x.i != null ? " " + x.i + (edM(x) === "h" ? "% LTHR" : (edW() ? "w" : "%") + (edKm() ? "" : " Pace")) : "", n = x.n || (x.ty === "rec" ? t("tt_rec") : "");
  const sl = edKm() && x.g !== "" && x.g != null && isFinite(+x.g) ? " slope " + (+x.g).toFixed(1) + " pct" : ""; // pente : mode « simulation » du home trainer dans le lecteur
  return `- ${edDur(x)}${i}${sl}${n ? " " + n : ""}`;
}
let EDMAP = {}; // n° de ligne du texte généré -> chemin de l'étape de l'éditeur (pour les poignées du graphe)
function edText(){
  const out = []; let lastTy = null; EDMAP = {};
  ED.forEach((x, gi) => {
    if(x.k === "g"){ if(out.length && out[out.length - 1] !== "") out.push(""); out.push(`${t("tMain")} ${parseInt(x.r, 10) || 1}x`); x.items.forEach((it, j) => { EDMAP[out.length] = gi + "." + j; out.push(edLine(it)); }); out.push(""); lastTy = null; return; } // ligne vide obligatoire avant la série (sinon intervals.icu ne la reconnaît pas)
    if(x.k === "b"){ if(lastTy !== null){ out.push(""); lastTy = null; } return; } // séparateur : force un nouveau titre
    // les étapes consécutives de même type sont regroupées sous un seul titre
    // (utile pour les échauffements / retours au calme multi-paliers)
    if(x.ty !== lastTy){ if(lastTy !== null) out.push(""); out.push(t("tt_" + x.ty)); lastTy = x.ty; }
    EDMAP[out.length] = String(gi); out.push(edLine(x));
  });
  return out.join("\n").trim();
}
function edSum(){
  const tot = parseWorkout(edText(), edSp(), ftpFor(edSp())).reduce((a, b) => a + b.d, 0);
  $("edsum").textContent = tot ? t("edTot", hm(tot)) : "";
}
function edHtml(){
  // regroupe les étapes consécutives de même type dans un bloc encadré (même logique
  // que les titres de sections du texte généré par edText) ; chaque bloc est repliable
  let out = "", run = [];
  const edSec = x => { if(x.mode !== "t") return 0; const [m, s] = String(x.v).split(":"); return (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0); };
  const flush = () => {
    if(!run.length) return;
    const ty = ED[run[0]].ty, bk = "b" + (ED[run[0]].uid || 0), closed = edCollapsed.has(bk);
    const tot = run.reduce((a, i) => a + edSec(ED[i]), 0);
    out += `<div class="blk blk-${ty}${closed ? " closed" : ""}" data-bs="${run[0]}" data-bn="${run.length}" data-bk="${bk}"><div class="blk-h"><span class="drg" title="${esc(t("dragLbl"))}" aria-label="${esc(t("dragLbl"))}">⠿</span>${esc(t("tt_" + ty))}<span class="badge">${run.length}${tot ? " · " + fmtDur(tot) : ""}</span><button class="alt small tglb" data-tb="${bk}" type="button" aria-expanded="${!closed}" title="${esc(t("collapse"))}" aria-label="${esc(t("collapse"))}">${closed ? "▸" : "▾"}</button></div>${run.map(i => edStep(ED[i], String(i))).join("")}</div>`;
    run = [];
  };
  ED.forEach((x, i) => { if(x.k === "g"){ flush(); out += edGrp(x, i); } else if(x.k === "b"){ flush(); } else run.push(i); });
  flush();
  return out;
}
// Aperçu mis à jour en direct : toute modification de l'éditeur régénère la séance
// dans le panneau d'aperçu (nom, sport, description, graphe) sans cliquer « Générer l'aperçu ».
// ---------- Nom de séance déduit automatiquement ----------
// Analyse les étapes (en % FTP / allure) et propose un nom du type « Seuil 5×5min », « Sweet Spot 3×10min »,
// « Endurance 1h30 », « Pyramide Tempo »… Les étapes ≥ 76 % qui se répètent à l'identique forment la série
// principale ; l'échauffement et le retour au calme (paliers distincts) n'y entrent pas.
const NAME_ZONES = [[56, "Recovery", "Récupération"], [76, "Endurance", "Endurance"], [88, "Tempo", "Tempo"], [95, "Sweet Spot", "Sweet Spot"],
  [106, "Threshold", "Seuil"], [131, "VO₂max", "VO₂max"], [151, "Anaerobic", "Anaérobie"], [Infinity, "Sprint", "Sprint"]];
const nameZone = (p, fr) => { const z = NAME_ZONES.find(z => p < z[0]); return fr ? z[2] : z[1]; };
function nameDur(s){
  s = Math.round(s);
  if(s < 90) return s + "s";
  if(s < 3600){ const m = Math.floor(s / 60), r = s % 60; return r ? m + "m" + String(r).padStart(2, "0") : m + "min"; }
  const h = Math.floor(s / 3600), m = Math.round(s % 3600 / 60); return h + "h" + (m ? String(m).padStart(2, "0") : "");
}
function inferName(steps, fr){
  if(!steps || !steps.length) return "";
  const pc = s => (s.a + s.b) / 2, total = steps.reduce((x, s) => x + s.d, 0);
  const hard = steps.filter(s => pc(s) >= 76);
  // série principale : étapes dures identiques (même durée, intensité à 5 % près) les plus nombreuses en temps cumulé
  const groups = {};
  hard.forEach(s => { const k = Math.round(s.d) + "@" + Math.round(pc(s) / 5) * 5; (groups[k] = groups[k] || {n: 0, d: s.d, sum: 0, t: 0}); groups[k].n++; groups[k].sum += pc(s); groups[k].t += s.d; });
  // on privilégie une répétition (≥ 2 fois) ; à défaut, un seul long effort (≥ 10 min)
  const gl = Object.values(groups), reps = gl.filter(g => g.n >= 2).sort((x, y) => y.t - x.t)[0];
  const best = reps || gl.filter(g => g.d >= 600).sort((x, y) => y.d - x.d)[0];
  const avgAll = steps.reduce((x, s) => x + pc(s) * s.d, 0) / total;
  if(!best){
    // pas de série identifiable : séance continue (récup / endurance / tempo) ou intervalles variés
    const lab = nameZone(Math.min(avgAll, 105), fr);
    if(hard.length >= 3 && hard.reduce((x, s) => x + s.d, 0) >= 600){
      const hp = hard.reduce((x, s) => x + pc(s) * s.d, 0) / hard.reduce((x, s) => x + s.d, 0);
      return fr ? "Intervalles " + nameZone(hp, fr) : nameZone(hp, fr) + " intervals";
    }
    return lab + " " + nameDur(total);
  }
  const lab = nameZone(best.sum / best.n, fr);
  // pyramide / échelle : durées dures toutes différentes, croissantes (puis décroissantes)
  const hd = hard.filter(s => s.d >= 30).map(s => Math.round(s.d));
  if(hd.length >= 4 && new Set(hd).size === hd.length){
    let k = 0; while(k + 1 < hd.length && hd[k + 1] > hd[k]) k++;
    const up = k === hd.length - 1, down = k > 0 && hd.slice(k).every((v, i, a) => i === 0 || v < a[i - 1]);
    if(up) return (fr ? "Échelle " : "Ladder ") + lab;
    if(down) return (fr ? "Pyramide " : "Pyramid ") + lab;
  }
  // over-unders : au moins 3 alternances d'étapes dures consécutives d'intensités différentes (≥ 5 %)
  let alt = 0; for(let i = 1; i < steps.length; i++) if(pc(steps[i]) >= 76 && pc(steps[i - 1]) >= 76 && Math.abs(pc(steps[i]) - pc(steps[i - 1])) >= 5) alt++;
  if(alt >= 5) return "Over-Unders";
  return best.n > 1 ? `${lab} ${best.n}×${nameDur(best.d)}` : `${lab} ${nameDur(best.d)}`;
}
let autoName = ""; // dernier nom déduit : remplacé à chaque modification tant que l'utilisateur ne l'a pas retouché
function edInferred(txt){
  const n = inferName(parseWorkout(txt, edSp(), ftpFor(edSp())), lang === "fr");
  $("edname").placeholder = n || t("edDefName");
  return n;
}
function edLive(){
  const txt = edText();
  if(!txt) return;
  $("sport").value = edSp(); syncUnit();
  const cur = $("name").value;
  // nom déduit uniquement quand l'onglet « Éditeur manuel » est affiché (pas depuis l'IA, la bibliothèque, l'import…)
  const manual = !document.querySelector('[data-block="edit"]').hidden, inferred = manual ? edInferred(txt) : "";
  if($("edname").value.trim()) $("name").value = $("edname").value.trim();
  else if(!cur || (manual && (cur === autoName || cur === t("edDefName")))) $("name").value = autoName = inferred || t("edDefName");
  $("desc").value = txt;
  EXPL = null; selLine = null;
  $("prev").hidden = false; setSrcAct(null);
  renderChart();
}
function edRender(){
  $("edunit").disabled = !edKm(); $("edmetric").disabled = !edKm();
  const anyH = ED.some(x => x.k === "g" ? x.items.some(y => edM(y) === "h") : x.k === "s" && edM(x) === "h");
  $("edhint").textContent = t(edW() ? "edHintW" : edKm() ? "edHintP" : "edHintPace") + " " + t("hDrag") + (anyH ? " " + t("edHintH") + (ICU.lthr > 0 ? "" : " " + t("edNoLthr")) : "");
  $("edbox").innerHTML = ED.length ? edHtml() : `<div class="hint">${esc(t("edNone"))}</div>`;
  edSum();
  edLive();
}
$("edbox").addEventListener("input", e => {
  const el = e.target, h = el.closest("[data-p]"); if(!h || !el.dataset.f) return;
  const {list, i} = edAt(h.dataset.p);
  if(el.dataset.f === "m"){ const was = edM(list[i]); list[i].i = edConv(list[i].i, was, el.value); list[i].m = el.value; edRender(); return; }
  list[i][el.dataset.f] = el.value;
  if(el.dataset.f === "g" || el.dataset.f === "i"){ const ie = h.querySelector('[data-f="i"]'), sp = ie && ie.nextElementSibling; if(ie && sp){ sp.textContent = edUnit(list[i]); if(edGuide(list[i])) ie.title = t("edGuideT"); else ie.removeAttribute("title"); } } // équivalent W / % FTP et infobulle « guide » mis à jour à la frappe
  if(el.dataset.f === "ty" || el.dataset.f === "mode") edRender(); else { edSum(); edLive(); } // aperçu mis à jour à chaque frappe (durée, intensité, répétitions…)
});
// le nom saisi dans l'éditeur se répercute en direct dans l'aperçu ; champ vidé => retour au nom déduit
let ED_M0 = store.get("si_edmetric") === "h" ? "h" : "p"; $("edmetric").value = ED_M0;
$("edmetric").addEventListener("change", () => {
  const to = $("edmetric").value, from = ED_M0; if(to === from) return;
  ED_M0 = to; store.set("si_edmetric", to);
  // les étapes qui suivent la cible par défaut sont converties ; celles dont la cible a été choisie à la main gardent la leur
  const conv = x => { if(x.k === "s" && !x.m){ x.i = edConv(x.i, from, to); if(x.i2 !== "" && x.i2 != null) x.i2 = edConv(x.i2, from, to); } };
  ED.forEach(x => { if(x.k === "g") x.items.forEach(conv); else conv(x); });
  edRender();
});
$("edname").addEventListener("input", () => { if(!$("edname").value.trim()) $("name").value = ""; edLive(); });
$("edbox").addEventListener("change", e => {
  const s = e.target.closest("[data-gstd]"); if(!s || s.value === "") return;
  const g = ED[+s.dataset.gstd], p = ED_GSTD[+s.value];
  if(g && p){ g.r = p[0]; g.items = gStdSteps(p); edRender(); say("gstdOk", "ok", gStdLabel(p)); }
});
$("edbox").addEventListener("click", e => {
  const tb = e.target.closest(".tglb");
  if(tb){ const k = tb.dataset.tb; if(edCollapsed.has(k)) edCollapsed.delete(k); else edCollapsed.add(k); edRender(); return; }
  const b = e.target.closest("[data-a]"); if(!b) return; const a = b.dataset.a;
  const gp = (a === "rm" || a === "rp") ? b.closest("[data-p]").dataset.p : null;
  if(a === "addin") ED[+b.dataset.g].items.push(edDef(b.dataset.ty));
  else{
    const {list, i} = edAt(b.closest("[data-p]").dataset.p);
    if(a === "rm" || a === "rp") list[i].r = Math.min(50, Math.max(1, (parseInt(list[i].r, 10) || 1) + (a === "rp" ? 1 : -1)));
    else if(a === "del") list.splice(i, 1);
    else if(a === "dup"){ const c = JSON.parse(JSON.stringify(list[i])); c.uid = ++edUid; list.splice(i + 1, 0, c); }
    else if(a === "rec") list.splice(i + 1, 0, edDef("rec"));
    else if(a === "std") list.splice(i, 1, ...stdSteps(list[i].ty));
    else if(a === "up" && i > 0){ const o = list[i - 1]; list[i - 1] = list[i]; list[i] = o; }
    else if(a === "down" && i < list.length - 1){ const o = list[i + 1]; list[i + 1] = list[i]; list[i] = o; }
  }
  edRender();
  if(gp !== null){ const nb = $("edbox").querySelector(`[data-p="${gp}"] [data-a="${a}"]`); if(nb) nb.focus(); }
});
