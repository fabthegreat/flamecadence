/* FlameCadence - Settings and help dialog: fields, load/save, export/import of settings JSON */
// ---------- Réglages & Aide ----------
const FIELDS = ["gkey","model","ikey","aid","bmode","burl","bkey","bwrite","think","prov","hfkey","hfmodel","oaurl","oakey","oamodel","jamkey","jamtag"];
const DEF = {model: "gemini-3.7-flash", aid: "0", bmode: "icu", bwrite: "icu", think: "low", prov: "gemini", hfmodel: "meta-llama/Llama-3.1-8B-Instruct", oaurl: "https://api.groq.com/openai/v1", oamodel: ""};
const SECRET = ["gkey","ikey","bkey","hfkey","oakey"];
let modelList = [], hfList = [], oaList = [];
function provUI(){ const v = $("prov").value; $("pg").hidden = v !== "gemini"; $("ph").hidden = v !== "hf"; $("po").hidden = v !== "oa"; }
function badges(){
  [["gkey","bg"],["ikey","bi"],["hfkey","bh"],["oakey","bo"]].forEach(([k, b]) => {
    const ok = !!store.get("si_" + k); $(b).textContent = t(ok ? "saved" : "missing"); $(b).className = "badge " + (ok ? "ok" : "err");
  });
  $("bicu").textContent = t(store.get("si_ikey") ? "saved" : "missing"); $("bicu").className = "badge " + (store.get("si_ikey") ? "ok" : "err");
  const bm = BE.mode(), bok = !!(BE.url() && BE.key()); // onglet Backend : « désactivé » / « enregistré » / « manquant »
  $("bbe").textContent = t(bm === "icu" ? "beOff" : bok ? "saved" : "missing"); $("bbe").className = "badge " + (bm === "icu" ? "" : bok ? "ok" : "err");
}
function fillModels(list, sel){
  const ids = [...new Set([sel, ...list].filter(Boolean))];
  $("model").innerHTML = ""; ids.forEach(id => { const o = document.createElement("option"); o.value = o.textContent = id; $("model").appendChild(o); });
  $("model").value = sel;
}
function loadSettings(){
  FIELDS.forEach(k => { if(k !== "model") $(k).value = store.get("si_" + k) || DEF[k] || ""; });
  fillModels(modelList, store.get("si_model") || DEF.model);
  SECRET.forEach(k => $(k).type = "password");
  document.querySelectorAll(".tog").forEach(b => { b.dataset.i = "show"; b.textContent = t("show"); });
  $("jnote").hidden = true;
  provUI(); badges(); applyWidgets(); beUI();
}
document.querySelectorAll(".tog").forEach(b => b.onclick = () => {
  const i = $(b.dataset.for), show = i.type === "password";
  i.type = show ? "text" : "password"; b.dataset.i = show ? "hide" : "show"; b.textContent = t(b.dataset.i);
});
$("prov").onchange = provUI;
$("open").onclick = () => {
  loadSettings(); $("cfg").showModal(); sizeCfg();
  const pv = store.get("si_prov");
  if(pv === "hf"){ if(!hfList.length) $("refh").click(); }
  else if(pv === "oa"){ if(store.get("si_oakey") && !oaList.length) $("refo").click(); }
  else if(store.get("si_gkey") && !modelList.length) $("refm").click();
};
$("close").onclick = () => $("cfg").close();
$("cfg").addEventListener("close", loadSettings);
$("cfg").addEventListener("close", () => { try{ musUI(); }catch(e){} });
$("save").onclick = () => { FIELDS.forEach(k => store.set("si_" + k, $(k).value.trim())); WIDGETS.forEach(k => { const c = $("w_" + k); if(c && c.checked !== widgets.includes(k)) toggleWidget(k); }); $("cfg").close(); say("settingsSaved", "ok"); BE.reset(); loadAll(); };
$("clear").onclick = async () => { if(!(await ask("cfmClear"))) return; SECRET.forEach(k => store.set("si_" + k, "")); loadSettings(); };
// --- Import / export des réglages au format JSON ---
function jnote(k, cls, ...a){ const n = $("jnote"); n.hidden = false; n.textContent = t(k, ...a); n.className = "hint " + (cls || ""); }
$("impjson").onclick = () => $("impjsonin").click();
$("impjsonin").onchange = () => {
  const f = $("impjsonin").files[0]; $("impjsonin").value = "";
  if(!f) return;
  f.text().then(txt => {
    const j = JSON.parse(txt);
    let n = 0;
    FIELDS.forEach(k => { if(j[k] !== undefined && j[k] !== null){ $(k).value = String(j[k]); n++; } });
    // listes de modèles embarquées dans l'export, si présentes
    if(Array.isArray(j.geminiModels) && j.geminiModels.length){ modelList = j.geminiModels; fillModels(modelList, $("model").value || modelList[0]); }
    if(Array.isArray(j.hfModels) && j.hfModels.length){ hfList = j.hfModels; $("hfl").innerHTML = hfList.map(id => `<option value="${esc(id)}"></option>`).join(""); }
    if(Array.isArray(j.oaModels) && j.oaModels.length){ oaList = j.oaModels; $("oal").innerHTML = oaList.map(id => `<option value="${esc(id)}"></option>`).join(""); }
    if(Array.isArray(j.starred)){ setStars(j.starred.filter(x => typeof x === "string")); n++; renderLibraryKeepOpen(); }
    if(Array.isArray(j.widgetOrder)){ WORDER = sanitizeOrder(j.widgetOrder); store.set("si_worder", JSON.stringify(WORDER)); applyOrder(); n++; }
    if(j.weatherLocation && isFinite(j.weatherLocation.lat) && isFinite(j.weatherLocation.lon)){ store.set("si_wxloc", JSON.stringify({name: String(j.weatherLocation.name || "").slice(0, 80), lat: +j.weatherLocation.lat, lon: +j.weatherLocation.lon})); store.set("si_wxcache", ""); wxCurText(); loadWx(true); n++; }
    if(typeof j.font === "string" && FONTS.some(f => f[0] === j.font)){ font = j.font; store.set("si_font", font); fontUI(); n++; }
    if(typeof j.square === "boolean"){ store.set("si_square", j.square ? "1" : "0"); applySquare(); n++; }
    if(typeof j.theme === "string" && /^[a-z]+$/.test(j.theme)){ store.set("si_look", j.theme); applyLook(); n++; }
    else if(typeof j.sport === "boolean"){ store.set("si_look", j.sport ? "sport" : "classic"); applyLook(); n++; }
    if(!n) return jnote("jsonEmpty", "err");
    provUI(); badges(); beUI();
    jnote("jsonImpOk", "ok", f.name);
  }).catch(e => jnote("jsonErr", "err", e.message || String(e)));
};
$("expjson").onclick = () => {
  const o = {}; FIELDS.forEach(k => o[k] = $(k).value.trim());
  const stArr = stars(); if(stArr.length) o.starred = stArr;
  o.widgetOrder = WORDER.slice(); // ordre des widgets de la colonne de droite
  o.font = font; o.square = store.get("si_square") === "1"; o.theme = lookId();
  if(wxLoc()) o.weatherLocation = wxLoc();
  // listes de modèles disponibles par fournisseur (chargées via « Charger la liste »)
  if(modelList.length) o.geminiModels = modelList;
  if(hfList.length) o.hfModels = hfList;
  if(oaList.length) o.oaModels = oaList;
  const blob = new Blob([JSON.stringify(o, null, 2)], {type: "application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "flamecadence-settings.json"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};

$("openHelp").onclick = () => {
  $("helpBody").innerHTML = t("helpContent");
  $("helpDlg").showModal();
};
$("closeHelp").onclick = () => $("helpDlg").close();

// --- onglets des réglages ---
function cfgTab(k){
  document.querySelectorAll(".cfg-tabs [data-cfg]").forEach(x => x.setAttribute("aria-selected", String(x.dataset.cfg === k)));
  document.querySelectorAll("[data-cfgp]").forEach(p => p.hidden = p.dataset.cfgp !== k);
}
document.querySelectorAll(".cfg-tabs [data-cfg]").forEach(b => b.onclick = () => cfgTab(b.dataset.cfg));
// Hauteur fixe du dialogue de réglages : calée sur la plus grande section
function sizeCfg(){
  const ps = [...document.querySelectorAll("#cfg [data-cfgp]")];
  if(!ps.length) return;
  const prev = ps.map(p => p.hidden);
  const bf = $("beF"), bfh = bf.hidden; bf.hidden = false;
  ps.forEach(p => p.hidden = false);
  const h = Math.max(...ps.map(p => p.offsetHeight));
  ps.forEach((p, i) => p.hidden = prev[i]); bf.hidden = bfh;
  if(h) document.documentElement.style.setProperty("--cfgH", h + "px");
}
if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if($("cfg").open) sizeCfg(); });

async function fetchList(url, key){
  const r = await fetch(url, key ? {headers: {Authorization: "Bearer " + key}} : {});
  const j = await r.json();
  if(!r.ok) throw new Error((j.error && (j.error.message || (typeof j.error === "string" ? j.error : ""))) || ("HTTP " + r.status));
  return j;
}
function listBtn(btn, noteId, run){
  $(btn).onclick = async () => {
    const note = (k, c, ...a) => { $(noteId).textContent = t(k, ...a); $(noteId).className = "badge " + (c || ""); };
    $(btn).disabled = true; note("loading");
    try{ await run(note); }catch(e){ note("err", "err", errText(e)); }
    $(btn).disabled = false;
  };
}
async function geminiModels(key){
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {headers: {"x-goog-api-key": key}});
  const j = await r.json();
  if(!r.ok) throw new Error(j.error?.message || ("HTTP " + r.status));
  const ver = n => parseFloat((n.match(/^gemini-(\d+(?:\.\d+)?)-/) || [])[1]);
  return (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent")).map(m => m.name.replace("models/", ""))
    .filter(n => /flash/.test(n) && !/image|tts|live|audio|embed|robotics|computer|native/.test(n) && ver(n) >= 3.6)
    .sort((x, y) => ver(y) - ver(x) || x.localeCompare(y));
}
listBtn("refm", "mnote", async note => {
  const key = $("gkey").value.trim();
  if(!key) return note("needG", "err");
  modelList = await geminiModels(key);
  const cur = $("model").value;
  fillModels(modelList, modelList.includes(cur) ? cur : (modelList[0] || cur));
  modelList.length ? note("nModels", "ok", modelList.length) : note("noModels", "err");
});
listBtn("refh", "hnote", async note => {
  const j = await fetchList("https://router.huggingface.co/v1/models", $("hfkey").value.trim());
  hfList = (j.data || []).map(m => m.id).sort((x, y) => x.localeCompare(y));
  $("hfl").innerHTML = hfList.map(id => `<option value="${esc(id)}"></option>`).join("");
  note("nModels", "ok", hfList.length);
});
listBtn("refo", "onote", async note => {
  const base = $("oaurl").value.trim().replace(/\/+$/, "");
  if(!base) return note("needUrl", "err");
  const j = await fetchList(base + "/models", $("oakey").value.trim());
  oaList = (Array.isArray(j) ? j : (j.data || [])).map(m => m.id || m.name).filter(Boolean).sort((x, y) => x.localeCompare(y));
  $("oal").innerHTML = oaList.map(id => `<option value="${esc(id)}"></option>`).join("");
  note("nModels", "ok", oaList.length);
});
$("oaurl").onchange = () => { oaList = []; };

