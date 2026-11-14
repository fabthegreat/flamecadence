/* FlameCadence - Glossary: tooltip on every technical term */
// ---------- Glossaire : info-bulle sur chaque terme technique affiché ----------
// Un MutationObserver enveloppe les termes (FTP, TSS, IF, zones…) dans <abbr class="gl"> partout dans l'interface,
// y compris dans les contenus générés dynamiquement. Le texte de l'info-bulle suit la langue courante.
const GL = {
  ftp: ["FTP · Functional Threshold Power", "FTP · Puissance seuil fonctionnelle", "The highest average power you can hold for about an hour. Workout intensities in % FTP are relative to it.", "Puissance moyenne maximale que tu peux tenir environ une heure. Les intensités des séances en % FTP s'y rapportent."],
  tss: ["TSS · Training Stress Score", "TSS · Training Stress Score", "The load of a session, combining its duration and intensity. One hour at FTP equals 100 TSS.", "La charge d'une séance, qui combine durée et intensité. Une heure à la FTP vaut 100 TSS."],
  if: ["IF · Intensity Factor", "IF · Facteur d'intensité", "Normalized power divided by FTP. 1.00 means the session averaged a threshold effort; 0.70 is an easy ride.", "Puissance normalisée divisée par la FTP. 1,00 = effort moyen au seuil ; 0,70 = sortie facile."],
  np: ["NP · Normalized Power", "NP · Puissance normalisée", "A weighted average of power that reflects the real physiological cost of a variable effort better than the plain average.", "Moyenne pondérée de la puissance qui reflète mieux le coût physiologique d'un effort irrégulier que la moyenne simple."],
  ef: ["EF · Efficiency Factor", "EF · Facteur d'efficacité", "Normalized power divided by average heart rate. At a similar effort, a rising EF suggests better aerobic fitness.", "Puissance normalisée divisée par la fréquence cardiaque moyenne. À effort comparable, un EF qui monte suggère une meilleure forme aérobie."],
  ctl: ["CTL · Chronic Training Load", "CTL · Charge chronique", "Your \"fitness\": an exponentially weighted average of daily training load over roughly 42 days.", "Ta « forme de fond » (fitness) : moyenne pondérée de la charge quotidienne sur environ 42 jours."],
  atl: ["ATL · Acute Training Load", "ATL · Charge aiguë", "Your \"fatigue\": an exponentially weighted average of daily training load over roughly 7 days.", "Ta « fatigue » : moyenne pondérée de la charge quotidienne sur environ 7 jours."],
  tsb: ["TSB · Training Stress Balance", "TSB · Équilibre de charge", "Your \"form\": CTL minus ATL. Negative means you are carrying fatigue, positive means you are fresh.", "Ta « fraîcheur » : CTL moins ATL. Négatif = fatigue accumulée, positif = frais."],
  hr: ["HR · Heart rate", "FC · Fréquence cardiaque", "Heartbeats per minute (bpm), a measure of how hard your body is working.", "Battements du cœur par minute (bpm), indicateur de l'effort que fournit ton corps."],
  wkg: ["W/kg · Power-to-weight", "W/kg · Rapport poids/puissance", "Watts per kilogram of body weight: the key figure for climbing.", "Watts par kilo de poids de corps : le chiffre clé en montée."],
  vo2max: ["VO₂max", "VO₂max", "Maximal oxygen uptake. VO₂max intervals are hard efforts of about 3 to 8 minutes at roughly 106 to 120% of FTP.", "Consommation maximale d'oxygène. Les intervalles VO₂max sont des efforts durs d'environ 3 à 8 min à 106–120 % de la FTP."],
  sweetspot: ["Sweet Spot", "Sweet Spot", "Roughly 88 to 94% of FTP: hard but sustainable, a time-efficient way to raise FTP.", "Environ 88 à 94 % de la FTP : dur mais soutenable, un moyen efficace de progresser en peu de temps."],
  threshold: ["Threshold", "Seuil", "Efforts around FTP (about 91 to 105%): the highest intensity you can sustain for long blocks.", "Efforts autour de la FTP (environ 91 à 105 %) : l'intensité maximale tenable sur de longs blocs."],
  tempo: ["Tempo", "Tempo", "A steady, moderately hard effort at about 76 to 90% of FTP (zone 3).", "Effort régulier et modérément dur, à environ 76–90 % de la FTP (zone 3)."],
  overunder: ["Over-Under", "Over-Under", "Intervals alternating just below and just above threshold power (for example 95% / 105% FTP) to train riding and recovering around threshold.", "Intervalles alternant juste sous puis juste au-dessus de la puissance seuil (ex. 95 % / 105 % FTP) pour s'entraîner à rouler et récupérer autour du seuil."],
  anaerobic: ["Anaerobic", "Anaérobie", "Very hard efforts above about 120% of FTP, lasting from seconds to around two minutes.", "Efforts très durs au-dessus d'environ 120 % de la FTP, de quelques secondes à environ deux minutes."],
  cp: ["CP · Critical Power", "CP · Puissance critique", "The boundary between sustainable and unsustainable effort, estimated from maximal tests such as 3 and 12 minutes all-out.", "Frontière entre effort soutenable et non soutenable, estimée par des tests maximaux (par ex. 3 et 12 minutes)."],
  taper: ["Taper", "Affûtage", "Reducing training volume before an event to shed fatigue while keeping fitness.", "Réduction du volume d'entraînement avant une échéance pour évacuer la fatigue sans perdre la forme."],
  kj: ["kJ · Kilojoules", "kJ · Kilojoules", "Mechanical work done on the pedals. On the bike, kilojoules of work are roughly equal to kilocalories burned (about 1 kJ ≈ 1 kcal), because the body is around 24% efficient.", "Travail mécanique produit sur les pédales. À vélo, les kilojoules de travail valent à peu près les kilocalories dépensées (1 kJ ≈ 1 kcal), car le rendement du corps est d'environ 24 %."],
  rpm: ["rpm", "rpm", "Revolutions per minute: pedalling cadence.", "Tours par minute : cadence de pédalage."],
  z1: ["Zone 1 · Active recovery", "Zone 1 · Récupération active", "Below 56% of FTP: very easy spinning.", "Moins de 56 % de la FTP : très facile."],
  z2: ["Zone 2 · Endurance", "Zone 2 · Endurance", "56 to 75% of FTP: comfortable, conversational pace that builds the aerobic base.", "56 à 75 % de la FTP : allure confortable, en discutant, qui construit la base aérobie."],
  z3: ["Zone 3 · Tempo", "Zone 3 · Tempo", "76 to 90% of FTP: steady and moderately hard.", "76 à 90 % de la FTP : régulier et modérément dur."],
  z4: ["Zone 4 · Threshold", "Zone 4 · Seuil", "91 to 105% of FTP: hard, sustainable for long intervals.", "91 à 105 % de la FTP : dur, tenable sur de longs intervalles."],
  z5: ["Zone 5 · VO₂max", "Zone 5 · VO₂max", "106 to 120% of FTP: very hard efforts of a few minutes.", "106 à 120 % de la FTP : efforts très durs de quelques minutes."],
  z6: ["Zone 6 · Anaerobic", "Zone 6 · Anaérobie", "121 to 150% of FTP: short, intense efforts of 30 s to 2 min.", "121 à 150 % de la FTP : efforts courts et intenses de 30 s à 2 min."],
  z7: ["Zone 7 · Neuromuscular", "Zone 7 · Neuromusculaire", "Above 150% of FTP: all-out sprints of a few seconds.", "Plus de 150 % de la FTP : sprints maximaux de quelques secondes."]
};
const GL_ALIAS = {"seuil": "threshold", "anaérobie": "anaerobic", "affûtage": "taper", "vo₂max": "vo2max", "over-under": "overunder", "over-unders": "overunder", "fc": "hr", "w/kg": "wkg", "sweetspot": "sweetspot"};
const GL_RE = /(?<![\p{L}\p{N}_/])(?:[Ss]weet [Ss]pot|[Oo]ver-[Uu]nders?|[Tt]hreshold|[Ss]euil|[Tt]empo|[Aa]naerobic|[Aa]naérobie|[Tt]aper|[Aa]ffûtage|VO₂max|VO2max|W\/kg|FTP|TSS|CTL|ATL|TSB|IF|NP|EF|HR|FC|CP|Z[1-7]|rpm|kJ)(?![\p{L}\p{N}_])/gu;
const GL_SKIP = "script,style,textarea,input,select,option,button,svg,noscript,code,pre,title,abbr.gl,#gltip,.tip,[data-nogl]";
const glKey = m => { const k = m.toLowerCase().replace(/\s+/g, ""); return GL_ALIAS[k] || k; };
function glWrap(node){
  const txt = node.nodeValue; GL_RE.lastIndex = 0; if(!txt || !GL_RE.test(txt)) return;
  GL_RE.lastIndex = 0;
  const fr = document.createDocumentFragment(); let last = 0, m, any = false;
  while((m = GL_RE.exec(txt))){
    const k = glKey(m[0]); if(!GL[k]) continue; any = true;
    if(m.index > last) fr.appendChild(document.createTextNode(txt.slice(last, m.index)));
    const a = document.createElement("abbr"); a.className = "gl"; a.dataset.gl = k; a.textContent = m[0]; fr.appendChild(a); last = m.index + m[0].length;
  }
  if(!any) return;
  if(last < txt.length) fr.appendChild(document.createTextNode(txt.slice(last)));
  node.replaceWith(fr);
}
function glScan(root){
  if(!root || (root.nodeType === 1 && root.matches && root.closest(GL_SKIP))) return;
  if(root.nodeType === 3){ if(root.parentElement && !root.parentElement.closest(GL_SKIP)) glWrap(root); return; }
  if(root.nodeType !== 1) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode: n => n.parentElement && !n.parentElement.closest(GL_SKIP) && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT}), list = [];
  while(w.nextNode()) list.push(w.currentNode);
  list.forEach(glWrap);
}
{
  const gt = document.createElement("div"); gt.id = "gltip"; gt.setAttribute("role", "tooltip"); gt.hidden = true; document.body.appendChild(gt);
  let pend = new Set(), raf = 0, cur = null, hideT = 0;
  const flush = () => { raf = 0; const l = [...pend]; pend = new Set(); l.forEach(n => { if(n.isConnected) glScan(n); }); obs.takeRecords(); };
  const obs = new MutationObserver(recs => {
    for(const r of recs){
      if(r.type === "characterData") pend.add(r.target);
      else r.addedNodes.forEach(n => { if(n.nodeType === 1 || n.nodeType === 3) pend.add(n); });
    }
    if(pend.size && !raf) raf = requestAnimationFrame(flush);
  });
  obs.observe(document.body, {childList: true, subtree: true, characterData: true});
  glScan(document.body);
  const hide = () => { clearTimeout(hideT); gt.hidden = true; cur = null; };
  const show = a => {
    const d = GL[a.dataset.gl]; if(!d) return;
    const fr = lang === "fr" ? 1 : 0; clearTimeout(hideT); cur = a;
    gt.innerHTML = `<b>${esc(d[fr])}</b>${esc(d[2 + fr])}`;
    (a.closest("dialog[open]") || document.body).appendChild(gt); // reste visible au-dessus d'une boîte de dialogue modale
    gt.hidden = false; gt.style.left = "0px"; gt.style.top = "0px";
    const r = a.getBoundingClientRect(), w = gt.offsetWidth, h = gt.offsetHeight;
    gt.style.left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8)) + "px";
    gt.style.top = (r.top - h - 8 >= 8 ? r.top - h - 8 : Math.min(r.bottom + 8, innerHeight - h - 8)) + "px";
  };
  document.addEventListener("pointerover", e => {
    const a = e.target.closest ? e.target.closest("abbr.gl") : null;
    if(a){ show(a); if(e.pointerType === "touch"){ clearTimeout(hideT); hideT = setTimeout(hide, 4000); } }
    else if(cur) hide();
  });
  document.addEventListener("pointerdown", e => { if(cur && !(e.target.closest && e.target.closest("abbr.gl"))) hide(); }, true);
  window.addEventListener("scroll", () => { if(cur) hide(); }, true);
  document.addEventListener("keydown", e => { if(e.key === "Escape" && cur) hide(); });
}
loadAll();

(function(){
  const mq=matchMedia("(max-width:560px)"),tools=document.querySelector("header .tools"),menu=document.querySelector("#more .menu");
  if(!tools||!menu)return;
  const row=document.createElement("div");row.className="mrow";menu.insertBefore(row,menu.firstChild);
  const ids=["coffeeTop","open","theme"],lang=tools.querySelector(".lang"),more=document.getElementById("more");
  const home=new Map();
  function place(){
    const m=mq.matches;
    const els=ids.map(id=>document.getElementById(id)).concat([lang]).filter(Boolean);
    els.forEach(el=>{
      if(!home.has(el))home.set(el,{p:el.parentNode,n:el.nextSibling});
      if(m){row.appendChild(el);el.style.removeProperty("display");}
    });
    if(!m){const order=[document.getElementById("coffeeTop"),document.getElementById("theme"),lang,more,document.getElementById("open")].filter(Boolean);order.forEach(el=>tools.appendChild(el));}
  }
  mq.addEventListener("change",place);place();
  const o=document.getElementById("open");
  if(o)o.addEventListener("click",()=>{more.open=false;});
})();
