/* FlameCadence - Drag handles on the preview chart (duration and intensity) */
// ---------- Poignées sur le graphe d'aperçu : ajuster durée (bord droit) et intensité (haut) en glissant ----------
// Valable quelle que soit l'origine de l'aperçu : depuis l'éditeur manuel on modifie l'étape de l'éditeur,
// sinon on réécrit directement la ligne correspondante de la description. Pour une série répétée,
// seule la première répétition porte les poignées (la modification s'applique à toutes les répétitions).
const edActive = () => { const m = document.querySelector('[data-block="edit"]'); return !!m && !m.hidden && ED.length > 0 && $("desc").value === edText(); };
function edHandles(box, meta, span, peak){
  if($("prev").hidden) return;
  const ed = edActive(), seen = new Set(); let h = "";
  meta.forEach((s, n) => {
    if(seen.has(s.line) || s.line == null || !(s.d > 0) || (ed && !EDMAP[s.line])) return; seen.add(s.line);
    const e = (s.start + s.d) / span * 100, c = (s.start + s.d / 2) / span * 100, wp = s.d / span * 100, y = 100 - (s.a + s.b) / 2 / peak * 96;
    h += `<div class="dgh dgt" data-k="t" data-n="${n}" style="left:calc(${e.toFixed(2)}% - 6px);top:${(y + (100 - y) / 2).toFixed(2)}%" title="${esc(t("hDur"))}"></div>`;
    if(wp >= 2) h += `<div class="dgh dgi" data-k="i" data-n="${n}" style="left:${c.toFixed(2)}%;top:${y.toFixed(2)}%;width:max(12px,min(34px,${wp.toFixed(2)}%))" title="${esc(t(s.g != null && !s.hr ? "hSlope" : "hInt"))}"></div>`;
  });
  if(h) box.insertAdjacentHTML("afterbegin", `<div class="dgl">${h}</div>`);
}
// réécriture d'une ligne de description : durée (en temps, ou distance mise à l'échelle) et intensité (%, W ou zone)
function lineTime(line, sec, orig){
  const dash = /^\s*-/.test(line), L = dash ? line : "- " + line.replace(/^\s+/, "");
  let nl = reTime(L, sec);
  if(nl === L && reTime(L, sec + 1) === L){ // pas de durée en temps : étape en distance
    const m = L.match(/(\d+(?:[.,]\d+)?)(\s*)(mtr|km|yrd)/i);
    if(m){ const v = parseFloat(m[1].replace(",", ".")) * sec / orig; nl = L.slice(0, m.index) + (m[3].toLowerCase() === "km" ? Math.round(v * 10) / 10 : Math.round(v)) + m[2] + m[3] + L.slice(m.index + m[0].length); }
  }
  return dash ? nl : nl.replace(/^- /, "");
}
function lineInt(line, pct0, pct, ftp){
  const hv = hrTok(line);
  if(hv){ const d = Math.round(p2h(pct) - p2h(pct0)), a = Math.round(hv.ha + d), b = Math.round(hv.hb + d); return line.slice(0, hv.idx) + a + (b !== a ? "-" + b : "") + "% LTHR" + line.slice(hv.end); }
  let m = line.match(/(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?\s*%/);
  if(m){ // une rampe « 50-70% » est décalée en bloc
    const d = pct - pct0, a = parseFloat(m[1].replace(",", ".")), b = m[2] ? parseFloat(m[2].replace(",", ".")) : null;
    return line.slice(0, m.index) + (b == null ? Math.round(a + d) : Math.round(a + d) + "-" + Math.round(b + d)) + "%" + line.slice(m.index + m[0].length);
  }
  m = line.match(/(\d+(?:[.,]\d+)?)\s*w\b/i);
  if(m && ftp > 0) return line.slice(0, m.index) + Math.round(ftp * pct / 100) + "w" + line.slice(m.index + m[0].length);
  m = line.match(/\bz([1-7])\b/i);
  if(m) return line.slice(0, m.index) + Math.round(pct) + "%" + line.slice(m.index + m[0].length);
  return line;
}
let edRz = null;
$("chart").addEventListener("pointerdown", e => {
  const hd = e.target.closest ? e.target.closest(".dgh") : null; if(!hd || e.button !== 0) return;
  const box = $("chart"), st = box._steps && box._steps[+hd.dataset.n], svg = box.querySelector("svg"); if(!st || st.line == null || !svg || !(st.d > 0)) return;
  const ed = edActive() && EDMAP[st.line], lines = ed ? null : $("desc").value.split("\n");
  let it = null;
  if(ed){ const q = edAt(EDMAP[st.line]); it = q.list[q.i]; if(!it) return; } else if(lines[st.line] == null) return;
  e.preventDefault();
  const r = svg.getBoundingClientRect(), total0 = box._steps.reduce((a, x) => a + x.d, 0);
  edRz = {k: hd.dataset.k, it, lines, li: st.line, line0: lines ? lines[st.line] : "", pid: e.pointerId, px0: e.clientX, py0: e.clientY, W: Math.max(r.width, 1), Hh: Math.max(r.height, 1),
    d0: st.d, orig: st.d, v0: it ? it.v : null, cnt: box._steps.filter(x => x.line === st.line).length, total0, scale: box._span || total0, peak: box._peak || 120, pct0: (st.a + st.b) / 2, pctOrig: (st.a + st.b) / 2, g0: st.g != null && !st.hr ? st.g : null};
  CH_FIX = {scale: edRz.scale, peak: edRz.peak};
  try{ box.setPointerCapture(e.pointerId); }catch(err){}
});
function edRzApply(s, e){
  const box = $("chart"), f = ftpFor(edSp());
  let nt = null; // ligne de description réécrite (source hors éditeur)
  if(s.k === "t"){
    const dur = Math.max(5, Math.round((s.d0 + (e.clientX - s.px0) / s.W * s.scale) / 5) * 5), tot = s.total0 + (dur - s.orig) * s.cnt;
    if(tot > s.scale){ s.scale = tot; s.px0 = e.clientX; s.d0 = dur; CH_FIX.scale = tot; } // l'échelle suit si la séance s'allonge
    if(s.it){
      if(s.it.mode === "d"){ const v0 = parseFloat(String(s.v0).replace(",", ".")) || 0, nv = v0 * dur / s.orig; s.it.v = String(edKm() ? Math.round(nv * 10) / 10 : Math.round(nv / 10) * 10); }
      else s.it.v = Math.floor(dur / 60) + ":" + String(dur % 60).padStart(2, "0");
    }else nt = lineTime(s.line0, dur, s.orig);
    s.label = fmtDur(dur);
  }else if(s.g0 != null){ // étape pilotée par la pente : le glissement vertical change la pente (la puissance, simple guide, ne bouge pas) ; hauteur du graphe ≈ 25 % de pente
    const g = Math.max(-25, Math.min(25, Math.round((s.g0 - (e.clientY - s.py0) / s.Hh * 100 / 96 * 25) * 10) / 10));
    if(s.it) s.it.g = String(g);
    else nt = s.line0.replace(/(\b(?:slope|pente)\s*)([+-]?\d+(?:[.,]\d+)?)(\s*pct\b)/i, (m, a, v, b) => a + g.toFixed(1) + b);
    s.label = "⛰ " + g.toFixed(1) + " %";
  }else{
    const pct = Math.max(10, Math.min(300, Math.round(s.pct0 - (e.clientY - s.py0) / s.Hh * 100 / 96 * s.peak)));
    if(pct > s.peak){ s.peak = pct; s.py0 = e.clientY; s.pct0 = pct; CH_FIX.peak = pct; }
    const isH = s.it ? edM(s.it) === "h" : !!hrTok(s.line0 || "");
    if(s.it){ const o = parseFloat(s.it.i), nv = isH ? Math.round(p2h(pct)) : edW() && f ? Math.round(f * pct / 100) : pct; s.it.i = String(nv);
      if(!isH && s.it.i2 !== "" && s.it.i2 != null && isFinite(o)) s.it.i2 = String(Math.max(0, Math.round(+s.it.i2 + nv - o))); } // rampe : les deux extrémités suivent le glissement
    else nt = lineInt(s.line0, s.pctOrig, pct, f);
    s.label = isH ? "♥ " + Math.round(p2h(pct)) + t("pctLthr") + (ICU.lthr > 0 ? " · ≈ " + Math.round(ICU.lthr * p2h(pct) / 100) + " bpm" : "")
      : pct + (/Run|Swim/.test($("sport").value) ? t("pctPace") : t("pctFtp")) + (f > 0 && isBike($("sport").value) ? " · " + Math.round(f * pct / 100) + " W" : "");
  }
  if(s.it) edRender();
  else{
    if(!s.pu){ s.pu = true; pushUndo(); } // un seul point d'annulation par glissement
    s.lines[s.li] = nt; $("desc").value = s.lines.join("\n"); selLine = null; renderChart();
  }
  const tip = box.querySelector(".tip");
  if(tip){
    const r = box.getBoundingClientRect(); tip.textContent = s.label; tip.hidden = false;
    tip.style.left = Math.max(0, Math.min(e.clientX - r.left - tip.offsetWidth / 2, r.width - tip.offsetWidth)) + "px";
    tip.style.top = Math.max(0, e.clientY - r.top - tip.offsetHeight - 14) + "px";
  }
}
$("chart").addEventListener("pointermove", e => {
  const s = edRz; if(!s || e.pointerId !== s.pid) return;
  s.ev = e; if(s.raf) return;
  s.raf = requestAnimationFrame(() => { s.raf = 0; if(edRz === s) edRzApply(s, s.ev); });
});
const edRzEnd = e => {
  const s = edRz; if(!s || e.pointerId !== s.pid) return;
  if(s.raf){ cancelAnimationFrame(s.raf); s.raf = 0; if(e.type === "pointerup") edRzApply(s, e); }
  edRz = null; CH_FIX = null;
  try{ $("chart").releasePointerCapture(e.pointerId); }catch(err){}
  if(s.it) edRender(); else renderChart();
};
["pointerup", "pointercancel"].forEach(ev => $("chart").addEventListener(ev, edRzEnd));
$("chart").addEventListener("toggle", e => { if(e.target.classList && e.target.classList.contains("fuel")){ FUEL_OPEN = e.target.open; store.set("si_fuelopen", FUEL_OPEN ? "1" : "0"); } }, true);
{ const dd = $("descDet"); dd.open = store.get("si_descopen") === "1"; dd.addEventListener("toggle", () => store.set("si_descopen", dd.open ? "1" : "0")); }
// Glisser-déposer pour réordonner : étapes individuelles (⠿) et blocs entiers (⠿ du titre)
let edDrag = null;
$("edbox").addEventListener("mousedown", e => {
  document.querySelectorAll('#edbox [draggable="true"]').forEach(el => el.removeAttribute("draggable"));
  const dg = e.target.closest && e.target.closest(".drg") ? e.target.closest(".drg") : null;
  if(!dg) return;
  const row = dg.closest("[data-p]");
  if(row){ row.setAttribute("draggable", "true"); return; }
  const blk = dg.closest(".blk");
  if(blk) blk.setAttribute("draggable", "true");
});
$("edbox").addEventListener("dragstart", e => {
  const row = e.target.closest ? e.target.closest("[data-p]") : null;
  const blk = e.target.closest ? e.target.closest(".blk") : null;
  let d = null;
  if(row && row.getAttribute("draggable") === "true") d = row.dataset.p;
  else if(blk && blk.getAttribute("draggable") === "true") d = "b" + blk.dataset.bs + ":" + blk.dataset.bn;
  if(!d){ e.preventDefault(); return; }
  edDrag = d;
  e.dataTransfer.effectAllowed = "move";
  try{ e.dataTransfer.setData("text/plain", edDrag); }catch(err){}
});
$("edbox").addEventListener("dragend", () => {
  edDrag = null;
  document.querySelectorAll('#edbox [draggable="true"], #edbox .dropover').forEach(el => { el.removeAttribute("draggable"); el.classList.remove("dropover"); });
});
$("edbox").addEventListener("dragover", e => {
  if(!edDrag) return;
  const row = e.target.closest ? e.target.closest("[data-p]") : null;
  const isBlk = edDrag.charAt(0) === "b";
  let hl = null;
  if(isBlk){
    // un bloc peut être déposé sur un autre bloc, un bloc de répétitions entier
    // ou une étape racine (permet aussi de le placer tout en haut ou tout en bas)
    hl = (e.target.closest && (e.target.closest(".blk") || e.target.closest(".grp"))) || (row && row.dataset.p.indexOf(".") < 0 ? row : null);
  }else if(row && row.dataset.p !== edDrag) hl = row;
  if(!hl) return;
  e.preventDefault();
  document.querySelectorAll('#edbox .dropover').forEach(el => el.classList.remove("dropover"));
  hl.classList.add("dropover");
});
$("edbox").addEventListener("drop", e => {
  if(!edDrag) return;
  e.preventDefault();
  const d = edDrag; edDrag = null;
  document.querySelectorAll('#edbox .dropover').forEach(el => el.classList.remove("dropover"));
  const row = e.target.closest ? e.target.closest("[data-p]") : null;
  if(d.charAt(0) === "b"){
    // déplacement d'un bloc complet (suite d'étapes de même type) d'un seul geste
    // position avant/après selon la moitié haut/bas de l'élément survolé
    const el = e.target.closest ? (e.target.closest(".blk") || e.target.closest(".grp") || null) : null;
    let idx = -1;
    if(el){
      const r = el.getBoundingClientRect(), after = (e.clientY - r.top) > r.height / 2;
      idx = el.classList.contains("blk") ? (+el.dataset.bs) + (after ? +el.dataset.bn : 0) : (+el.dataset.gi) + (after ? 1 : 0);
    }else if(row && row.dataset.p.indexOf(".") < 0){
      const r = row.getBoundingClientRect();
      idx = (+row.dataset.p) + ((e.clientY - r.top) > r.height / 2 ? 1 : 0);
    }else return;
    const [bs, bn] = d.slice(1).split(":").map(Number);
    if(idx >= bs && idx <= bs + bn) return; // déposé sur lui-même : rien à faire
    const items = ED.splice(bs, bn);
    if(bs < idx) idx -= bn;
    ED.splice(Math.max(0, Math.min(ED.length, idx)), 0, ...items);
    edRender(); return;
  }
  if(!row) return;
  const src = edAt(d);
  const tgt = edAt(row.dataset.p);
  if(src.list !== tgt.list || src.i === tgt.i) return;
  const r = row.getBoundingClientRect(), after = (e.clientY - r.top) > r.height / 2;
  let j = tgt.i + (after ? 1 : 0);
  const it = src.list.splice(src.i, 1)[0];
  if(src.i < j) j--;
  src.list.splice(Math.max(0, Math.min(src.list.length, j)), 0, it);
  edRender();
});
document.querySelectorAll("[data-add]").forEach(b => b.onclick = () => { const ty = b.dataset.add;
  if(ty === "grp") ED.push({k: "g", r: 4, items: [edDef("work"), edDef("rec")]});
  else{
    // chaque ajout crée un bloc indépendant : on insère un séparateur si le dernier
    // élément est une étape (sinon le nouveau palier fusionnerait dans le bloc existant) ;
    // à l'intérieur d'un bloc, on change simplement le type d'une étape existante.
    if(ED.length && ED[ED.length - 1].k === "s") ED.push({k: "b"});
    ED.push(edDef(ty));
  }
  edRender(); });
$("edreset").onclick = async () => { if(!ED.length && !$("edname").value.trim()) return; if(ED.length && !(await ask("cfmReset"))) return; ED.length = 0; edCollapsed.clear(); CALEDIT = null; $("edname").value = ""; $("name").value = ""; calEdUI(); edRender(); say("edResetOk", "ok"); }; // le nom est effacé ; sport, FTP et unité sont conservés
$("edsport").onchange = edRender; $("unit").addEventListener("change", edRender);
$("edgo").onclick = () => {
  const txt = edText(); if(!txt) return say("edNone", "err");
  $("sport").value = edSp(); syncUnit(); $("name").value = $("edname").value.trim() || (autoName = edInferred(txt) || t("edDefName")); $("desc").value = txt;
  EXPL = null; selLine = null; $("prev").hidden = false; setSrcAct(null); renderChart(); $("prev").scrollIntoView({behavior: "smooth", block: "start"}); say("edBuilt", "ok");
};
$("edsport").value = $("sport").value;
[["unit", "edunit"], ["unit", "punit"]].forEach(([a, b]) => {
  $(b).onchange = () => { $(a).value = $(b).value; $(a).dispatchEvent(new Event("change")); };
  $(a).addEventListener("change", () => { $(b).value = $(a).value; });
});
