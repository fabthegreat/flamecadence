/* FlameCadence - Plan built by the AI coach (optional) */
// ---------- Plan construit par le coach IA (option) : mêmes fournisseurs/clés que la génération de séance ----------
// L'IA ne crée pas de séances : elle choisit dans la bibliothèque (ids courts) et place les séances sur les dates autorisées.
// Le résultat est validé (id connu, date autorisée, 1 séance/jour, max n par semaine) puis passe dans le même PLAN.items que l'algorithme.
const PAI_SYSTEM = `You are an expert cycling coach. You build a multi-week training plan by choosing sessions from a fixed catalogue.
Rules:
- Use ONLY workouts from the catalogue, referenced by their id (e.g. "w12"). Never invent a workout.
- Use ONLY dates from the allowed dates list, at most one session per date, and exactly the requested number of sessions per week (fewer only when the week offers fewer dates).
- Progressive overload: weekly load builds week after week; every 4th week, and the last week of plans of 6+ weeks, is a recovery week (about 60-65% of the previous weekly TSS, no hard sessions).
- Follow the purpose of the plan. Vary the workouts: do not reuse an id unless the catalogue is too small.
- Never put two hard sessions (threshold, vo2max, sprint, force) on consecutive days. Put the longest endurance ride on the last training day of the week. If hard days are specified, put the quality sessions on them.
- Respect the athlete's notes whenever possible.
Reply only with JSON: {"summary": "2-3 sentences on the plan's progression", "recovery_weeks": [4, 8], "sessions": [{"date": "YYYY-MM-DD", "id": "w12"}]}. No markdown, no text outside the JSON.`;
const PAI_SCHEMA = {type: "OBJECT", properties: {summary: {type: "STRING"}, recovery_weeks: {type: "ARRAY", items: {type: "INTEGER"}}, sessions: {type: "ARRAY", items: {type: "OBJECT", properties: {date: {type: "STRING"}, id: {type: "STRING"}}, required: ["date", "id"]}}}, required: ["sessions"]};
async function planBuildAI(){
  const weeks = Math.min(24, Math.max(1, +$("pweeks").value || 8)), maxMin = +$("pmax").value || 90, wo = d => (d + 6) % 7;
  const days = [...document.querySelectorAll("#pdays input:checked")].map(i => +i.value).sort((a, b) => wo(a) - wo(b));
  if(!days.length) return say("pNone", "err");
  const n = Math.min(days.length, Math.max(1, +$("psess").value || 3));
  const hardSel = [...document.querySelectorAll("#phard input:checked")].map(i => +i.value).filter(d => days.includes(d)).sort((a, b) => wo(a) - wo(b));
  // fournisseur : même logique de contrôle que generate()
  const prov = $("prov").value, chat = prov !== "gemini"; let url = "", key, model;
  if(prov === "hf"){ url = "https://router.huggingface.co/v1/chat/completions"; key = $("hfkey").value.trim(); model = $("hfmodel").value.trim(); }
  else if(prov === "oa"){ if(!$("oaurl").value.trim()) return say("needUrl", "err"); url = $("oaurl").value.trim().replace(/\/+$/, "") + "/chat/completions"; key = $("oakey").value.trim(); model = $("oamodel").value.trim(); }
  else{ key = $("gkey").value.trim(); model = $("model").value.trim() || DEF.model; }
  if(!key){ say(prov === "hf" ? "needH" : prov === "oa" ? "needA" : "needG", "err"); $("cfg").showModal(); return; }
  if(!model){ say("needM", "err"); $("cfg").showModal(); return; }
  // catalogue compact (ids courts w1, w2…) limité aux séances qui rentrent dans la durée max
  const pool = planPool(), all = []; Object.keys(pool).forEach(c => pool[c].forEach(x => all.push([c, x])));
  let cat = all.filter(([c, x]) => x.mins <= maxMin + 0.5); if(cat.length < 10) cat = all;
  const byId = {}, lines = cat.map(([c, x], i) => { const id = "w" + (i + 1); byId[id] = x; return `${id} | ${c} | ${Math.round(x.mins)} min | TSS ${Math.round(x.tss)} | ${x.w.name_en}`; });
  // dates autorisées (mêmes règles que planBuild : jours cochés, semaine du début, rien avant le début)
  const start = new Date(($("pstart").value || iso(new Date())) + "T12:00:00"), mon = new Date(start); mon.setDate(mon.getDate() - (start.getDay() + 6) % 7);
  const fWd = new Intl.DateTimeFormat("en", {weekday: "short"}), allowed = new Set(), slotLines = [];
  for(let w = 0; w < weeks; w++){
    const ds = [];
    days.forEach(d => { const date = new Date(mon); date.setDate(mon.getDate() + w * 7 + wo(d)); if(date < start && w === 0 && date.toDateString() !== start.toDateString()) return; const sd = iso(date); allowed.add(sd); ds.push(sd + " " + fWd.format(date)); });
    slotLines.push(`Week ${w + 1}: ${ds.join(", ") || "(no date)"}`);
  }
  const DN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], ftp = ftpFor($("psport").value), notes = $("pnotes").value.trim();
  const userText = [
    `Purpose of the plan: ${$("pgoal").selectedOptions[0].textContent} (${$("pgoal").value}).`,
    `Weeks: ${weeks}. Sessions per week: ${n}. Maximum session length: ${maxMin} min. Sport: ${$("psport").value}.` + (ftp > 0 ? ` Athlete FTP: ${ftp} W (workouts are in % of FTP).` : ""),
    hardSel.length ? `Hard (quality) sessions preferably on: ${hardSel.map(d => DN[d]).join(", ")}.` : `Hard days: choose them yourself among the allowed dates.`,
    `Allowed dates (choose only from these):\n${slotLines.join("\n")}`,
    notes ? `Athlete notes: ${notes}` : "",
    `Workout catalogue (id | category | duration | TSS | name):\n${lines.join("\n")}`,
    `Write "summary" in ${lang === "fr" ? "French" : "English"}.`,
    chat ? `Reply only with a JSON object {"summary": "...", "recovery_weeks": [...], "sessions": [{"date": "YYYY-MM-DD", "id": "w12"}]} and no text around it.` : ""
  ].filter(Boolean).join("\n\n");
  $("pgen").disabled = true; const t0 = Date.now(); say(null); progStart("pAiBuilding");
  const run = async (ms, fn) => { const signal = abortGen ? abortGen.signal : new AbortController().signal; const to = setTimeout(() => { if(abortGen) abortGen.abort(); }, ms); try{ return await fn(signal); }finally{ clearTimeout(to); } };
  const parse = txt => { const m = txt.replace(/<think>[\s\S]*?<\/think>/g, "").match(/\{[\s\S]*\}/); const j = JSON.parse((m ? m[0] : txt).replace(/```json|```/g, "").trim()); if(!Array.isArray(j.sessions)) throw new Error(t("badResp")); return j; };
  const callGemini = mdl => run(240000, async signal => {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(mdl)}:generateContent`, {method: "POST", signal,
      headers: {"Content-Type": "application/json", "x-goog-api-key": key},
      body: JSON.stringify({systemInstruction: {parts: [{text: PAI_SYSTEM}]}, contents: [{role: "user", parts: [{text: userText}]}],
        generationConfig: {...(/^gemini-3/.test(mdl) && $("think").value !== "default" ? {thinkingConfig: {thinkingLevel: $("think").value}} : {}), responseMimeType: "application/json", responseSchema: PAI_SCHEMA}})});
    const j = await r.json().catch(() => ({}));
    if(!r.ok){ const err = new Error(j.error?.message || ("HTTP " + r.status)); err.fatal = r.status === 401 || /api key/i.test(err.message); throw err; }
    return parse(j.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "");
  });
  try{
    let j;
    if(chat){
      const txt = await run(240000, async signal => {
        const r = await fetch(url, {method: "POST", signal, headers: {"Content-Type": "application/json", Authorization: "Bearer " + key},
          body: JSON.stringify({model, max_tokens: 8000, messages: [{role: "system", content: PAI_SYSTEM}, {role: "user", content: userText}]})});
        const jj = await r.json().catch(() => ({}));
        if(!r.ok) throw new Error((jj.error && (jj.error.message || (typeof jj.error === "string" ? jj.error : ""))) || ("HTTP " + r.status));
        return (jj.choices && jj.choices[0] && jj.choices[0].message && jj.choices[0].message.content) || "";
      });
      j = parse(txt);
    }else{
      let cands = [model], errs = [];
      for(let k = 0; k < cands.length; k++){
        try{ j = await callGemini(cands[k]); break; }
        catch(e){
          errs.push(e); if(e.fatal || (abortGen && abortGen.signal.aborted)) break;
          if(k === 0){ if(!modelList.length){ try{ modelList = await geminiModels(key); }catch(_){} } cands = [model, ...modelList.filter(x => x !== model)]; }
          if(k + 1 < cands.length) $("progk").textContent = t("tryNext", cands[k], cands[k + 1]);
        }
      }
      if(!j) throw new Error(errs[0].name === "AbortError" ? t("timeout") : errs[0].message);
    }
    // validation : id connu, date autorisée, une séance par jour, au plus n par semaine
    const items = [], seen = new Set(), perWeek = {}; let bad = 0;
    j.sessions.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach(sx => {
      const x = byId[String(sx.id || "").trim().toLowerCase()], d = String(sx.date || "").slice(0, 10);
      if(!x || !allowed.has(d) || seen.has(d)){ bad++; return; }
      const week = Math.floor(Math.round((new Date(d + "T12:00:00") - mon) / 864e5) / 7) + 1;
      if((perWeek[week] || 0) >= n){ bad++; return; }
      perWeek[week] = (perWeek[week] || 0) + 1; seen.add(d);
      items.push({date: d, week, w: x.w, mins: x.mins, tss: x.tss, cat: PCATS[x.w.category], rec: false});
    });
    if(!items.length){ say("pAiBad", "err"); }
    else{
      const rw = new Set((j.recovery_weeks || []).map(Number)); items.forEach(x => { x.rec = rw.has(x.week); });
      PLAN.items = items; PLAN.maxMin = maxMin; planRender();
      const sm = $("paisum"); if(j.summary){ sm.textContent = t("pAiNote", String(j.summary).slice(0, 700)); sm.hidden = false; } else sm.hidden = true;
      if(bad) say("pAiPartial", "ok", items.length, bad); else say("pAiDone", "ok", items.length, Math.round((Date.now() - t0) / 1000));
    }
  }catch(e){
    if(e.name !== "AbortError"){ say(prov === "hf" ? "errH" : prov === "oa" ? "errA" : "errG", "err", errText(e)); $("cfg").showModal(); }
  }
  progEnd(); $("pgen").disabled = false;
}
function planEngineUI(){ const ai = $("pengine").value === "ai"; $("paibox").hidden = !ai; $("phint").hidden = ai; }
$("pengine").value = store.get("si_pengine") === "ai" ? "ai" : "algo";
$("pnotes").value = store.get("si_pnotes");
$("pengine").addEventListener("change", () => { store.set("si_pengine", $("pengine").value); planEngineUI(); });
$("pnotes").addEventListener("input", () => store.set("si_pnotes", $("pnotes").value));
planEngineUI();
$("pgen").onclick = () => $("pengine").value === "ai" ? planBuildAI() : planBuild();
$("pbox").addEventListener("click", e => {
  const ed = e.target.closest("[data-pedit]"); if(ed){ planEdit(+ed.dataset.pedit); return; }
  const sw = e.target.closest("[data-pswap]"); if(sw){ planSwap(+sw.dataset.pswap); return; }
  const b = e.target.closest("[data-pdel]"); if(!b) return; PLAN.items.splice(+b.dataset.pdel, 1); planRender();
});
$("psend").onclick = async () => {
  if(!KEY()) return say("needI", "err");
  const b = $("psend"), L = PLAN.items.slice(); let ok = 0; b.disabled = true;
  try{
    for(const x of L){
      b.textContent = ok + " / " + L.length;
      const r = await icuRaw(icuUrl("/events"), {method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({category: "WORKOUT", start_date_local: x.date + "T00:00:00", type: $("psport").value, name: "W" + x.week + " · " + (lang === "fr" ? x.w.name_fr : x.w.name_en), description: brandDesc("W" + x.week + " · " + (lang === "fr" ? x.w.name_fr : x.w.name_en), planDesc(x.w))})});
      if(!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 200));
      ok++;
    }
    PLAN.items = []; planRender(); say("pDone", "ok", ok); loadCal(true).catch(() => {});
  }catch(e){ PLAN.items = L.slice(ok); planRender(); say("errI", "err", errText(e)); loadCal(true).catch(() => {}); }
  b.textContent = t("pSend"); b.disabled = false;
};
{ const d = new Date(); d.setDate(d.getDate() + (8 - d.getDay()) % 7 || 7); $("pstart").value = iso(d); refreshDateBtn(); } // prochain lundi

// menu « Plus » (contact, GitHub, café) : se ferme au clic extérieur, sur un lien ou avec Échap
document.addEventListener("click", e => { const m = $("more"); if(m.open && (!m.contains(e.target) || e.target.closest(".menu a"))) m.open = false; });
document.addEventListener("keydown", e => { if(e.key === "Escape") $("more").open = false; });

