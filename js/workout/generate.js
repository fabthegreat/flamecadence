/* FlameCadence - Workout generation and random workout */
// ---------- Génération ----------
const SYSTEM = `You are an expert coach. You create ONE structured workout.
Reply only with JSON containing "name" (short title), "description" (the workout text in intervals.icu workout format), and "explanation_en" and "explanation_fr" (2-3 sentences each, in English and in French: purpose of the session, physiological benefits, and where it fits in a training week).
Format of "description":
- One section per block: a title line (e.g. "Warmup", "Main set 3x", "Cooldown") followed by lines starting with "- ". Leave a blank line between sections.
- Durations: 10m, 30s, 1h. Cycling intensity: % of FTP, a single value per line (e.g. "- 10m 55%").
- FORBIDDEN: no ramps ("ramp") and no intensity ranges (no "50-75%" and no "90-95%"), because the Tacx trainer does not support them. For a gradual rise or fall (warm-up, cool-down, progression) use several short steps at constant intensity, increasing or decreasing (e.g. "- 3m 50%", "- 3m 60%", "- 4m 70%").
- Repetitions: "Main set 4x" then the lines of the block.
- Free-text cues may follow the values (e.g. "- 10m 95% cadence 90rpm").
No markdown, no text outside the JSON.`;
async function generate(ctx){
  const prov = $("prov").value, chat = prov !== "gemini", sport = $("sport").value;
  let url = "", key, model;
  const bad = k => { progEnd(); say(k, "err"); };
  if(prov === "hf"){ url = "https://router.huggingface.co/v1/chat/completions"; key = $("hfkey").value.trim(); model = $("hfmodel").value.trim(); }
  else if(prov === "oa"){ url = $("oaurl").value.trim().replace(/\/+$/, "") + "/chat/completions"; key = $("oakey").value.trim(); model = $("oamodel").value.trim(); }
  else{ key = $("gkey").value.trim(); model = $("model").value.trim() || DEF.model; }
  const ask1 = $("prompt").value.trim(), bike = isBike(sport), ftp = bike ? ftpFor(sport) : 0;
  if(prov === "oa" && !$("oaurl").value.trim()) return bad("needUrl");
  if(!key){ bad(prov === "hf" ? "needH" : prov === "oa" ? "needA" : "needG"); $("cfg").showModal(); return; }
  if(!model){ bad("needM"); $("cfg").showModal(); return; }
  if(!ask1) return bad("needAsk");
  const durTxt = $("dur").value ? `Total duration: about ${$("dur").value} minutes (warm-up and cool-down included).\n` : "";
  const ftpTxt = ftp > 0 ? `Athlete FTP (${sport === "VirtualRide" ? "indoor" : "outdoor"}): ${ftp} W (intensities stay expressed in % of FTP).\n` : "";
  const userText = `Sport: ${sport}. Date: ${$("date").value}.\n${durTxt}${ftpTxt}${typeof ctx === "string" ? ctx + "\n" : ""}Request: ${ask1}\nReply (name and instructions) in ${lang === "fr" ? "French" : "English"}.` + (chat ? `\nReply only with a JSON object {"name": "...", "description": "...", "explanation_en": "...", "explanation_fr": "..."} and no text around it.` : "");
  $("gen").disabled = true; $("rand").disabled = true;
  const t0 = Date.now();
  say(null); progStart("genning");
  const timed = async (ms, fn) => {
    const signal = abortGen ? abortGen.signal : new AbortController().signal;
    const to = setTimeout(() => { if(abortGen) abortGen.abort(); }, ms);
    try{ return await fn(signal); }finally{ clearTimeout(to); }
  };
  const parse = txt => {
    const m = txt.replace(/<think>[\s\S]*?<\/think>/g, "").match(/\{[\s\S]*\}/);
    const w = JSON.parse((m ? m[0] : txt).replace(/```json|```/g, "").trim());
    if(!w.name || !w.description) throw new Error(t("badResp"));
    return w;
  };
  const callGemini = (mdl, ms) => timed(ms, async signal => {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(mdl)}:generateContent`, {method: "POST", signal,
      headers: {"Content-Type": "application/json", "x-goog-api-key": key},
      body: JSON.stringify({systemInstruction: {parts: [{text: SYSTEM}]}, contents: [{role: "user", parts: [{text: userText}]}],
        generationConfig: {...(/^gemini-3/.test(mdl) && $("think").value !== "default" ? {thinkingConfig: {thinkingLevel: $("think").value}} : {}),
          responseMimeType: "application/json", responseSchema: {type: "OBJECT", properties: {name: {type: "STRING"}, description: {type: "STRING"}, explanation_en: {type: "STRING"}, explanation_fr: {type: "STRING"}}, required: ["name", "description"]}}})});
    const j = await r.json().catch(() => ({}));
    if(!r.ok){ const err = new Error(j.error?.message || ("HTTP " + r.status)); err.fatal = r.status === 401 || /api key/i.test(err.message); throw err; }
    const txt = j.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    return {w: parse(txt), usage: j.usageMetadata ? t("thoughts", j.usageMetadata.thoughtsTokenCount || 0) : ""};
  });
  try{
    let w, usage = "";
    if(chat){
      const txt = await timed(120000, async signal => {
        const r = await fetch(url, {method: "POST", signal, headers: {"Content-Type": "application/json", Authorization: "Bearer " + key},
          body: JSON.stringify({model, max_tokens: 3000, messages: [{role: "system", content: SYSTEM}, {role: "user", content: userText}]})});
        const j = await r.json().catch(() => ({}));
        if(!r.ok) throw new Error((j.error && (j.error.message || (typeof j.error === "string" ? j.error : ""))) || ("HTTP " + r.status));
        return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "";
      });
      w = parse(txt);
    }else{
      let cands = [model], errs = [];
      for(let n = 0; n < cands.length; n++){
        try{
          const r = await callGemini(cands[n], n ? 60000 : 120000);
          w = r.w; usage = r.usage; if(n) usage += t("usedModel", cands[n]);
          break;
        }catch(e){
          errs.push(e); if(e.fatal || (abortGen && abortGen.signal.aborted)) break;
          if(n === 0){
            if(!modelList.length){ try{ modelList = await geminiModels(key); }catch(_){} }
            cands = [model, ...modelList.filter(x => x !== model)];
          }
          if(n + 1 < cands.length) $("progk").textContent = t("tryNext", cands[n], cands[n + 1]);
        }
      }
      if(!w) throw new Error(errs[0].name === "AbortError" ? t("timeout") : errs[0].message);
    }
    $("name").value = w.name;
    $("desc").value = $("unit").value === "w" && bike && ftp > 0 ? toWatts(w.description, ftp) : w.description;
    EXPL = {en: w.explanation_en || "", fr: w.explanation_fr || ""}; selLine = null; renderChart();
    $("prev").hidden = false; setSrcAct(null); say("genDone", "ok", Math.round((Date.now() - t0) / 1000), usage);
  }catch(e){
    if(!(e.name === "AbortError")){
      say(prov === "hf" ? "errH" : prov === "oa" ? "errA" : "errG", "err", errText(e));
      $("cfg").showModal();
    }
  }
  progEnd();
  $("gen").disabled = false; $("rand").disabled = false;
}
$("gen").onclick = () => generate();

// ---------- Séance aléatoire ----------
const IDEAS = {
  bike: [["steady zone 2 endurance","endurance fondamentale en zone 2, régulière"], ["sweet spot, blocks of 10 to 20 min","sweet spot, blocs de 10 à 20 min"], ["threshold, 2 x 20 min","seuil, 2 blocs de 20 min"],
    ["VO2max, intervals of 3 to 5 min","VO2max, intervalles de 3 à 5 min"], ["over-unders around threshold","over-under autour du seuil"], ["pyramid of intensities","pyramide d'intensité"],
    ["low-cadence strength work","force à basse cadence en côte"], ["short sprints with long recoveries","sprints courts avec longue récupération"], ["continuous tempo","tempo continu"], ["very easy active recovery","récupération active très facile"]]
};
const DURS_RAND = {bike: [45, 60, 75, 90, 120]};
const pick = a => a[Math.floor(Math.random() * a.length)];
function classicRandom(){
  const k = "bike", [en, fr] = pick(IDEAS[k]), d = $("dur").value || pick(DURS_RAND[k]);
  $("date").value = iso(new Date()); refreshDateBtn();
  $("prompt").value = lang === "fr" ? `${fr}, durée totale d'environ ${d} min` : `${en}, total duration about ${d} min`;
  generate();
}
async function smartRandom(){
  if(!KEY()) return classicRandom();
  $("rand").disabled = true; progStart("analyzing");
  try{
    const rng = `oldest=${daysAgo(27)}&newest=${daysAgo(0)}`;
    const [acts, well] = await Promise.all([icu(`/activities?${rng}`), icu(`/wellness?oldest=${daysAgo(3)}&newest=${daysAgo(0)}`).catch(() => [])]);
    acts.sort((x, y) => (x.start_date_local || "") < (y.start_date_local || "") ? -1 : 1);
    const w = well[well.length - 1], ctl = w && w.ctl != null ? w.ctl : 0, tsb = w && w.ctl != null ? w.ctl - w.atl : 0;
    const lines = acts.slice(-14).map(a => `- ${(a.start_date_local || "").slice(0, 10)} ${a.type} "${a.name}" ${hm(a.moving_time || 0)}, load ${Math.round(a.icu_training_load || 0)}` + (a.icu_weighted_avg_watts ? `, NP ${Math.round(a.icu_weighted_avg_watts)} W` : "")).join("\n");
    const fit = w && w.ctl != null ? `Current form: CTL ${Math.round(w.ctl)}, ATL ${Math.round(w.atl)}, TSB ${Math.round(w.ctl - w.atl)}.` : "";
    const yest = acts.filter(a => (a.start_date_local || "").slice(0, 10) === daysAgo(1));
    const yLoad = yest.reduce((s, a) => s + (a.icu_training_load || 0), 0);
    const yIF = Math.max(0, ...yest.map(a => a.icu_intensity ? (a.icu_intensity > 5 ? a.icu_intensity / 100 : a.icu_intensity) : 0));
    const yTime = yest.reduce((s, a) => s + (a.moving_time || 0), 0), hard = yest.length && (yLoad >= 90 || yIF >= 0.85 || (ctl && yLoad > ctl * 1.2) || yTime >= 7200), mod = yest.length && !hard && (yLoad >= 60 || yTime >= 5400);
    let rule = "Yesterday: no recorded workout (rest day).";
    if(yest.length) rule = `Yesterday: ${yest.map(a => `"${a.name}" ${hm(a.moving_time || 0)}`).join(", ")}, total load ${Math.round(yLoad)}, max IF ${yIF.toFixed(2)} => ${hard ? "HARD session" : mod ? "moderately hard session" : "easy session"}.`;
    if(hard) rule += "\nMANDATORY: yesterday was hard, so today MUST be an easy day: active recovery or very easy endurance only, Z1-Z2 (at most 65% intensity), no intervals, no tempo, at most 60 minutes (this overrides any longer requested duration).";
    else if(mod) rule += "\nYesterday was fairly demanding: no hard intervals today, prefer endurance or light tempo.";
    if(!hard && tsb < -25) rule += "\nMANDATORY: accumulated fatigue is high (form " + Math.round(tsb) + "), so today MUST be an easy day: Z1-Z2 only, no intervals.";
    const ctx = `intervals.icu context (last 28 days):\n${lines || "- no workout"}\n${fit}\n${rule}\nPropose today's workout in the spirit of these recent workouts and adapted to my current load, with some variety.`;
    $("date").value = iso(new Date()); refreshDateBtn();
    $("prompt").value = t("randPrompt");
    $("rand").disabled = false;
    generate(ctx);
  }catch(e){
    progEnd(); $("rand").disabled = false; say("randFallback", "err", errText(e)); classicRandom();
  }
}
$("rand").onclick = smartRandom;

