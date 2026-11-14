/* FlameCadence - AI helpers (markdown lite, completion, context) and AI feedback on the last activity */
// --- analyse IA de la séance ---
// Mise en forme légère (markdown minimal) de l'analyse IA
function mdLite(txt){
  const inline = s => esc(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, "$1<i>$2</i>");
  const out = [];
  let list = null;
  const closeList = () => { if(list){ out.push(list === "ul" ? "</ul>" : "</ol>"); list = null; } };
  for(const raw of String(txt).split(/\r?\n/)){
    const line = raw.trim();
    if(!line){ closeList(); continue; }
    const li = line.match(/^[-*•]\s+(.*)$/) || line.match(/^\d+[.)]\s+(.*)$/);
    if(li){
      const kind = /^[-*•]/.test(line) ? "ul" : "ol";
      if(list !== kind){ closeList(); out.push(kind === "ul" ? "<ul>" : "<ol>"); list = kind; }
      out.push(`<li>${inline(li[1])}</li>`);
    }else{
      closeList();
      const h = line.match(/^#{1,4}\s+(.*)$/);
      if(h) out.push(`<h3>${inline(h[1])}</h3>`);
      else out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join("");
}
async function aiComplete(system, user){
  const prov = $("prov").value, chat = prov !== "gemini";
  let url = "", key, model;
  if(prov === "hf"){ url = "https://router.huggingface.co/v1/chat/completions"; key = $("hfkey").value.trim(); model = $("hfmodel").value.trim(); }
  else if(prov === "oa"){ url = $("oaurl").value.trim().replace(/\/+$/, "") + "/chat/completions"; key = $("oakey").value.trim(); model = $("oamodel").value.trim(); }
  else{ key = $("gkey").value.trim(); model = $("model").value.trim() || DEF.model; }
  if(!key) throw new Error(t(prov === "hf" ? "needH" : prov === "oa" ? "needA" : "needG"));
  if(!model) throw new Error(t("needM"));
  if(chat){
    const r = await fetch(url, {method: "POST", headers: {"Content-Type": "application/json", Authorization: "Bearer " + key},
      body: JSON.stringify({model, max_tokens: 4000, messages: [{role: "system", content: system}, {role: "user", content: user}]})});
    const j = await r.json().catch(() => ({}));
    if(!r.ok) throw new Error((j.error && (j.error.message || (typeof j.error === "string" ? j.error : ""))) || ("HTTP " + r.status));
    return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "";
  }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {method: "POST",
    headers: {"Content-Type": "application/json", "x-goog-api-key": key},
    body: JSON.stringify({systemInstruction: {parts: [{text: system}]}, contents: [{role: "user", parts: [{text: user}]}]})});
  const j = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error(j.error?.message || ("HTTP " + r.status));
  return (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
}
// Contexte d'entraînement envoyé à l'IA : séances faites avant (14 j), séances faites / planifiées après (7 j), séance prévue liée, forme (CTL/ATL)
async function aiContext(a){
  const out = [];
  try{
    const f = Math.round, d = (a.start_date_local || "").slice(0, 10), base = new Date(d + "T12:00:00"), sh = n => { const x = new Date(base); x.setDate(x.getDate() + n); return iso(x); };
    const [acts, evs, well] = await Promise.all([icu(`/activities?oldest=${sh(-14)}&newest=${sh(7)}`).catch(() => []), icu(`/events?oldest=${d}&newest=${sh(7)}&category=WORKOUT`).catch(() => []), icu(`/wellness?oldest=${sh(-7)}&newest=${d}`).catch(() => [])]);
    const line = x => `${(x.start_date_local || "").slice(0, 10)} ${x.type || ""} "${x.name || ""}" ${hm(x.moving_time || 0)}` + (x.icu_training_load ? `, load ${f(x.icu_training_load)}` : "") +
      (x.icu_intensity ? `, IF ${(x.icu_intensity > 5 ? x.icu_intensity / 100 : x.icu_intensity).toFixed(2)}` : "") + (x.icu_weighted_avg_watts ? `, NP ${f(x.icu_weighted_avg_watts)} W` : "") + (x.average_heartrate ? `, avg HR ${f(x.average_heartrate)}` : "");
    const L = (Array.isArray(acts) ? acts : []).filter(x => x.id != a.id && x.moving_time > 0), key = x => x.start_date_local || "";
    const prev = L.filter(x => key(x) < key(a)).sort((x, y) => key(x) < key(y) ? -1 : 1).slice(-8), next = L.filter(x => key(x) > key(a)).sort((x, y) => key(x) < key(y) ? -1 : 1).slice(0, 3);
    const E = Array.isArray(evs) ? evs : [], mine = E.find(e => String(e.paired_activity_id) === String(a.id)), plan = E.filter(e => !e.paired_activity_id && (e.start_date_local || "").slice(0, 10) > d).sort((x, y) => key(x) < key(y) ? -1 : 1).slice(0, 3);
    const W = (Array.isArray(well) ? well : []).filter(w => w.ctl != null).sort((x, y) => x.id < y.id ? -1 : 1).pop();
    if(W) out.push(`Fitness on ${W.id}: CTL ${f(W.ctl)}, ATL ${f(W.atl || 0)}, form ${f(W.ctl - (W.atl || 0))}`);
    if(mine) out.push(`Planned workout for this session: "${mine.name || ""}"${mine.description ? " — " + String(mine.description).replace(/\s+/g, " ").slice(0, 400) : ""}`);
    if(prev.length) out.push("Sessions before (oldest first):\n" + prev.map(line).join("\n"));
    if(next.length) out.push("Sessions done after:\n" + next.map(line).join("\n"));
    if(plan.length) out.push("Planned workouts ahead:\n" + plan.map(e => `${(e.start_date_local || "").slice(0, 10)} "${e.name || ""}"` + (e.moving_time ? " " + hm(e.moving_time) : "") + (e.icu_training_load ? `, planned load ${f(e.icu_training_load)}` : "")).join("\n"));
  }catch(e){}
  return out;
}
// Indicateurs calculés ici (le modèle ne doit pas faire d'arithmétique) : zones de puissance, moitiés de séance, découplage puissance/FC
function aiDerived(a, sw, sh, ftp){
  const f = Math.round, out = [], num = v => typeof v === "number" && !isNaN(v);
  const avg = (arr, s, e, skip0) => { let n = 0, sum = 0; for(let i = s; i < Math.min(e, arr.length); i++){ const v = arr[i]; if(!num(v) || (skip0 && v <= 0)) continue; sum += v; n++; } return n ? sum / n : 0; };
  if(a.icu_weighted_avg_watts && a.icu_average_watts) out.push(`Variability index (NP / average power): ${(a.icu_weighted_avg_watts / a.icu_average_watts).toFixed(2)}`);
  if(sw && sw.length > 600 && ftp){
    const lim = [.55, .75, .9, 1.05, 1.2, 1.5], c = [0, 0, 0, 0, 0, 0, 0]; let n = 0;
    for(const v of sw){ if(!num(v)) continue; let z = 0; const r = v / ftp; while(z < 6 && r > lim[z]) z++; c[z]++; n++; }
    if(n) out.push("Time in power zones (% of FTP, coasting counts as Z1): " + c.map((x, i) => x ? `Z${i + 1} ${f(x / n * 100)}%` : "").filter(Boolean).join(", "));
  }
  if(sw && sw.length > 1200){
    const m = Math.floor(sw.length / 2), p1 = avg(sw, 0, m), p2 = avg(sw, m, sw.length);
    let line = `First half vs second half: average power ${f(p1)} W vs ${f(p2)} W`;
    if(sh && sh.length > 1200){
      const h1 = avg(sh, 0, m, true), h2 = avg(sh, m, sh.length, true);
      if(h1 && h2){ line += `, average HR ${f(h1)} vs ${f(h2)} bpm`; if(p1 && p2){ const e1 = p1 / h1, e2 = p2 / h2; out.push(line); out.push(`Power-to-HR drift between halves (decoupling): ${((e1 - e2) / e1 * 100).toFixed(1)} % (below 5 % = good aerobic stability; positive = HR rising relative to power)`); return out; } }
    }
    out.push(line);
  }
  return out;
}
const SYSTEM_ANALYSIS = "You are an experienced cycling coach giving feedback to the athlete who rode the workout; address them as \"you\". " +
  "You receive the workout summary, pre-computed indicators, downsampled power and heart-rate curves, and sometimes a training context (sessions before and after, the planned workout, fitness/fatigue/form). " +
  "Definitions: intensity factor (IF) = normalized power / FTP and is already computed (it is not heart-rate based); variability index = NP / average power; form = CTL - ATL (negative = fatigued). Trust the numbers given and never recompute or question them. " +
  "The workout you analyze is the main subject: use the context only to judge how it fits the sequence (accumulated load, recovery, intensity distribution, execution versus the plan) and whether the next sessions still make sense. " +
  "Do not show your reasoning, drafts, calculations or a recap of the data. Put ONLY the final answer between <answer> and </answer> (anything outside is discarded). " +
  "Inside, use exactly this markdown, nothing else (no tables, no emojis): \n## Summary\n(2 sentences: what this session trained and how it went)\n## Execution\n(2-3 bullets: pacing, consistency, heart-rate behavior)\n## Load and recovery\n(2-3 bullets: intensity balance, fit with recent days and form)\n## Next days\n(1-2 concrete suggestions, taking the planned sessions into account)\n" +
  "Be specific and quote figures from the data. Stay under 250 words.";
// Extrait la réponse finale : balises <answer>, blocs <think> retirés (certains modèles « raisonnent » dans le contenu)
function aiAnswer(txt){
  let s = String(txt || "").replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "").replace(/<think(?:ing)?>[\s\S]*$/i, "");
  const all = [...s.matchAll(/<answer>([\s\S]*?)<\/answer>/gi)];
  if(all.length) s = all[all.length - 1][1];
  else{ const k = s.toLowerCase().lastIndexOf("<answer>"); if(k >= 0) s = s.slice(k + 8); }
  return s.replace(/<\/?answer>/gi, "").trim();
}
async function analyzeAct(a, sw, sh, btn){ // analyse IA d'une activité (widget « Dernière séance » et analyse d'une séance)
  if(!a) return say("aiNone", "err");
  btn.disabled = true; say(null); progStart("analyzing");
  try{
    const f = Math.round, S = [], A = [];
    const ftp = (a.type === "VirtualRide" ? ICU.ftpIn : ICU.ftpOut) || ICU.ftpIn || ICU.ftpOut || 0;
    S.push(`Workout: "${a.name || a.type}" (${actT(a.type)})`);
    S.push(`Date: ${(a.start_date_local || "").slice(0, 10)}`);
    S.push(`Duration: ${hm(a.moving_time || 0)}`);
    if(a.distance) S.push(`Distance: ${Math.round(a.distance) / 1000} km`);
    if(a.total_elevation_gain) S.push(`Elevation gain: ${f(a.total_elevation_gain)} m`);
    if(a.icu_training_load) S.push(`Training load: ${f(a.icu_training_load)}`);
    if(a.icu_intensity) S.push(`Intensity factor (IF = NP / FTP): ${(a.icu_intensity > 5 ? a.icu_intensity / 100 : a.icu_intensity).toFixed(2)}`);
    if(a.icu_weighted_avg_watts) S.push(`Normalized power (NP): ${f(a.icu_weighted_avg_watts)} W`);
    if(a.icu_average_watts) S.push(`Average power: ${f(a.icu_average_watts)} W`);
    if(a.average_heartrate) S.push(`Average HR: ${f(a.average_heartrate)} bpm`);
    if(a.max_heartrate) S.push(`Max HR: ${f(a.max_heartrate)} bpm`);
    if(a.average_cadence) S.push(`Average cadence: ${f(a.average_cadence)} rpm`);
    if(ftp) A.push(`Athlete FTP: ${f(ftp)} W`);
    const D = aiDerived(a, sw, sh, ftp), N = 60, step = sw && sw.length ? sw.length / N / 60 : (sh && sh.length ? sh.length / N / 60 : 0), every = step ? ` — each value is the average over about ${step < 1 ? f(step * 60) + " s" : step.toFixed(1) + " min"}` : "";
    const w = ds(sw || [], N).map(f), h = ds(sh || [], N).map(f);
    const C = [];
    if(w.some(Boolean)) C.push(`Power curve (watts, ${w.length} values in chronological order${every}): ${w.join(",")}`);
    if(h.some(Boolean)) C.push(`Heart-rate curve (bpm, ${h.length} values${every}): ${h.join(",")}`);
    const ctx = await aiContext(a);
    const user = ["WORKOUT\n" + S.join("\n"), A.length ? "ATHLETE\n" + A.join("\n") : "", D.length ? "COMPUTED INDICATORS\n" + D.join("\n") : "", C.length ? "CURVES\n" + C.join("\n") : "", ctx.length ? "TRAINING CONTEXT\n" + ctx.join("\n\n") : ""].filter(Boolean).join("\n\n") +
      `\n\nWrite the analysis in ${lang === "fr" ? "French" : "English"}, in the required format, with the final answer only inside <answer></answer>.`;
    const txt = aiAnswer(await aiComplete(SYSTEM_ANALYSIS, user));
    $("aiBody").innerHTML = mdLite(txt || t("badResp"));
    $("aiDlg").showModal();
  }catch(e){
    say($("prov").value === "hf" ? "errH" : $("prov").value === "oa" ? "errA" : "errG", "err", errText(e));
    $("cfg").showModal();
  }
  progEnd();
  btn.disabled = false;
}
const analyzeLast = () => analyzeAct(LAST.last, LAST.sw, LAST.sh, $("lastai"));
$("lastai").onclick = analyzeLast;
$("closeAi").onclick = () => $("aiDlg").close();
