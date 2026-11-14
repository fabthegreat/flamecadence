/* FlameCadence - Small UI helpers: toast, status line (say), progress bar, confirm dialog (ask) */
function toast(m, cls, act){ $("toastt").textContent = m; const el = $("toast"); el.className = cls || "err"; toastActCb = act || null; $("toastAct").hidden = !act; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; toastActCb = null; }, cls === "err" ? 12000 : 6000); }
function say(k, cls, ...a){
  const txt = k ? t(k, ...a) : "";
  MSG = k ? {k, cls, a} : null;
  $("msg").textContent = ""; $("msg").className = "";
  if(txt) toast(txt, cls || "info");
}
$("toastx").onclick = () => { $("toast").hidden = true; toastActCb = null; };
$("toastAct").onclick = () => { if(toastActCb){ toastActCb(); toastActCb = null; } $("toast").hidden = true; };
function progStart(k){
  clearInterval(ptimer); clearTimeout(phide); const t0 = Date.now();
  abortGen = new AbortController();
  $("progk").textContent = t(k); $("prog").hidden = false;
  const upd = () => { const sec = (Date.now() - t0) / 1000; $("progf").style.width = (92 * (1 - Math.exp(-sec / 20))).toFixed(1) + "%"; $("progs").textContent = Math.round(sec) + " s"; $("prog").querySelector(".pb").setAttribute("aria-valuenow", parseInt($("progf").style.width)); };
  upd(); ptimer = setInterval(upd, 250);
}
function progEnd(){
  clearInterval(ptimer); abortGen = null; if($("prog").hidden) return; $("progf").style.width = "100%";
  phide = setTimeout(() => { $("prog").hidden = true; $("progf").style.width = "0"; }, 500);
}
$("stopGen").onclick = () => { if(abortGen) abortGen.abort(); };

const ACT = {Ride: ["Ride", "Vélo"], VirtualRide: ["Virtual ride", "Vélo virtuel"], Run: ["Run", "Course à pied"], VirtualRun: ["Virtual run", "Course virtuelle"], TrailRun: ["Trail run", "Trail"], Swim: ["Swim", "Natation"], WeightTraining: ["Strength", "Renforcement"], Walk: ["Walk", "Marche"], Hike: ["Hike", "Randonnée"], Workout: ["Workout", "Séance"], Rowing: ["Rowing", "Aviron"], NordicSki: ["Nordic ski", "Ski nordique"], Yoga: ["Yoga", "Yoga"], TableTennis: ["Table tennis", "Tennis de table"]};
const actT = ty => (ACT[ty] || [ty, ty])[lang === "fr" ? 1 : 0] || "";
const errText = e => e.name === "AbortError" ? t("timeout") : e.name === "TypeError" ? t("cors") : e.message;

function ask(k){
  return new Promise(res => {
    const d = $("cfm"); $("cfmt").textContent = t(k);
    const done = v => { if(d.open) d.close(); res(v); };
    $("cfmy").onclick = () => done(true); $("cfmn").onclick = () => done(false);
    d.addEventListener("cancel", () => res(false), {once: true});
    d.showModal();
  });
}

