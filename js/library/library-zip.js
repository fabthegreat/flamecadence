/* FlameCadence - Whole library as one .zip, send library workouts to the player */
// ---------- Toute la bibliothèque dans un seul .zip (un dossier par catégorie) ----------
async function libZipRun(){
  const btn = $("libzip"), msg = $("libzipmsg"), spec = EXPORTS[$("libzipfmt").value];
  if(!spec || btn.dataset.busy) return;
  btn.dataset.busy = "1"; btn.disabled = true;
  const nameEl = $("name"), descEl = $("desc"), keepN = nameEl.value, keepD = descEl.value; // les générateurs d'export lisent le formulaire : on le restaure ensuite
  const ftp = curFtp(), enc = new TextEncoder(), files = [], used = {}, clean = x => String(x).replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 70);
  let skip = 0;
  try{
    for(let i = 0; i < LIBRARY.length; i++){
      if(i % 20 === 0){ msg.textContent = t("libZipProg", i, LIBRARY.length); await new Promise(r => setTimeout(r)); }
      const item = LIBRARY[i];
      try{
        const steps = parseWorkout(item.desc_en, item.sport, ftp);
        if(!steps || !steps.length){ skip++; continue; }
        const title = (lang === "fr" ? item.name_fr : item.name_en) || item.name_en || item.id;
        nameEl.value = title; descEl.value = item.desc_en;
        let data = spec[1](steps); if(typeof data === "string") data = enc.encode(data);
        const th = LIB_THEMES.find(g => g.id === libCat(item)) || LIB_THEMES[2], dir = clean(lang === "fr" ? th.fr : th.en);
        let base = dir + "/" + (clean(title) || "workout"); used[base] = (used[base] || 0) + 1; if(used[base] > 1) base += " (" + used[base] + ")";
        files.push({name: base + spec[0], data});
      }catch(e){ console.warn("lib zip", item && item.id, e); skip++; }
    }
    if(!files.length) throw new Error("empty");
    saveBlob(zipStore(files), "flamecadence-library-" + $("libzipfmt").value + ".zip");
    msg.textContent = t("libZipDone", files.length, skip ? t("libZipSkip", skip) : "");
  }catch(e){ msg.textContent = t("libZipFail", e && e.message ? e.message : e); }
  finally{ nameEl.value = keepN; descEl.value = keepD; delete btn.dataset.busy; btn.disabled = false; }
}
$("libzip").addEventListener("click", libZipRun);
// à l'ouverture d'une catégorie, on la ramène à l'écran pour que sa zone défilante soit entièrement visible
$("libContainer").addEventListener("click", e => {
  const sm = e.target.closest ? e.target.closest(".lib-theme>summary") : null; if(!sm) return;
  const d = sm.parentElement; setTimeout(() => { if(d.open) d.scrollIntoView({block: "nearest", behavior: "smooth"}); }, 0);
});
// envoie une séance de la bibliothèque dans le lecteur d'activité (bêta) : bascule sur l'onglet Lecteur et la charge
function libToPlayer(item){ if(item) sendToPlayer("lib:" + item.id, lang === "fr" ? item.name_fr : item.name_en, item.desc_en, item); }
function sendToPlayer(id, name, desc, item){
  const e = runMk(id.split(":")[0], id, name, "", item ? runStepsOf(item, runFtp()) : runSteps(desc, runFtp()));
  if(!e) return;
  if(typeof RUN !== "undefined" && RUN && RUN.el > 0 && RUN.el < RUN.total && !confirm(t("runConfirm"))) return;
  mode = "run"; store.set("si_mode", mode); applyMode(); // crée le lecteur au besoin
  if(!RUN) return;
  runPick(e, true); RUN.touched = true; $("runLs").open = false;
  window.scrollTo({top: 0, behavior: "smooth"});
}
// bouton « Lecteur » du bloc Aperçu : lance la séance en cours de construction sans passer par le calendrier
function prevPlayBtn(){
  const b = $("toplayer"); if(!b) return;
  let on = false; try{ on = betaRunOn() && isBike($("sport").value) && !!$("desc").value.trim(); }catch(e){}
  b.hidden = !on; if(on) b.textContent = "▶ " + t("runItT"); b.title = t("prevToPlT");
}
$("toplayer").onclick = () => sendToPlayer("prev:" + Date.now(), $("name").value.trim() || t("runWk"), $("desc").value);
$("libContainer").onclick = e => {
  const sb = e.target.closest("[data-star]");
  if(sb){ toggleStar(sb.dataset.star); if($("libstar").checked) renderLibraryKeepOpen(); else { const st = stars().includes(sb.dataset.star); sb.textContent = st ? "★" : "☆"; sb.setAttribute("aria-pressed", String(st)); } return; }
  const pb = e.target.closest("[data-lplay]");
  if(pb){ libToPlayer(LIBRARY[+pb.dataset.lplay]); return; }
  const btn = e.target.closest("[data-lib]"); if(!btn) return;
  const item = LIBRARY[+btn.dataset.lib];
  syncUnit(); // le type de sortie (indoor / extérieur) reste celui choisi dans la bibliothèque
  $("name").value = lang === "fr" ? item.name_fr : item.name_en;
  let d = lang === "fr" ? item.desc_fr : item.desc_en;
  if($("unit").value === "w" && isBike(item.sport) && curFtp() > 0) d = toWatts(d, curFtp());
  $("desc").value = d;
  EXPL = {en: item.expl_en, fr: item.expl_fr}; selLine = null;
  // Keep the Library tab active while showing the preview.
  $("prev").hidden = false; setSrcAct(null); renderChart();
  $("prev").scrollIntoView({behavior: "smooth", block: "start"});
  say("edBuilt", "ok");
};
$("libsport").onchange = () => { $("sport").value = $("libsport").value; $("sport").dispatchEvent(new Event("change")); renderLibrary(); };
$("libunit").onchange = () => { $("unit").value = $("libunit").value; $("unit").dispatchEvent(new Event("change")); };
$("unit").addEventListener("change", () => { $("libunit").value = $("unit").value; });
$("libunit").value = $("unit").value;

