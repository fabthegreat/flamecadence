/* FlameCadence - Fitness / fatigue / form chart */
// ---------- Graphe fitness ----------
const fitDays = () => +$("fper").value || 60;
async function loadFit(){ LAST.fit = await icu(`/wellness?oldest=${daysAgo(fitDays() - 1)}&newest=${daysAgo(0)}`); renderFit(); }
$("fper").onchange = () => { store.set("si_fper", $("fper").value); loadFit().catch(e => { $("fitbox").textContent = t("errI", errText(e)); }); };
function fitInfo(i){
  const x = (LAST.fw || [])[i]; if(!x) return; const f = Math.round;
  $("finfo").textContent = new Date(x.id + "T12:00:00").toLocaleDateString(loc(), {day: "numeric", month: "short", ...(fitDays() >= 180 ? {year: "numeric"} : {})}) + " · " + t("fFit") + " " + f(x.ctl) + " · " + t("fFat") + " " + f(x.atl || 0) + " · " + t("fForm") + " " + f(x.ctl - (x.atl || 0));
}
function renderFit(){
  const box = $("fitbox"), w = (LAST.fit || []).filter(x => x.ctl != null).sort((a, b) => a.id < b.id ? -1 : 1);
  LAST.fw = w;
  if(!w.length){ box.textContent = LAST.fit ? t("nodata") : ""; return; }
  const n = w.length, X = i => (i / Math.max(1, n - 1) * 300).toFixed(1), mx = Math.max(10, ...w.map(x => Math.max(x.ctl, x.atl || 0))) * 1.08;
  const tb = w.map(x => x.ctl - (x.atl || 0)), tm = Math.max(10, ...tb.map(Math.abs)), Y = v => (70 - v / mx * 66).toFixed(1), Z = v => (100 - v / tm * 19).toFixed(1);
  box.innerHTML = `<svg id="fsvg" viewBox="0 0 300 122" preserveAspectRatio="none" role="img" aria-label="${esc(t("fitT"))}"><path class="fc" d="M0 70${w.map((x, i) => `L${X(i)} ${Y(x.ctl)}`).join("")}L300 70Z"/><polyline class="fa" points="${w.map((x, i) => X(i) + "," + Y(x.atl || 0)).join(" ")}"/><line class="fz" x1="0" x2="300" y1="100" y2="100"/><path class="ft" d="M0 100${tb.map((v, i) => `L${X(i)} ${Z(v)}`).join("")}L300 100Z"/><line id="fcur" class="fcur" x1="0" x2="0" y1="0" y2="122"/></svg><div class="hint" id="finfo"></div><div class="leg"><span><i style="background:#3b82c4"></i>${esc(t("fFit"))}</span><span><i style="background:#d6336c"></i>${esc(t("fFat"))}</span><span><i style="background:#e3cf3f"></i>${esc(t("fForm"))}</span></div>`;
  fitInfo(n - 1);
}
$("fitbox").addEventListener("pointermove", e => {
  const sv = e.target.closest ? e.target.closest("#fsvg") : null; if(!sv || !(LAST.fw || []).length) return;
  const r = sv.getBoundingClientRect(), fr = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), i = Math.round(fr * (LAST.fw.length - 1)), x = i / Math.max(1, LAST.fw.length - 1) * 300, c = $("fcur");
  c.setAttribute("x1", x); c.setAttribute("x2", x); c.style.opacity = 1; fitInfo(i);
});
$("fitbox").addEventListener("pointerleave", () => { const c = $("fcur"); if(c) c.style.opacity = 0; fitInfo((LAST.fw || []).length - 1); });

