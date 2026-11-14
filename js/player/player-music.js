/* FlameCadence - Player: music (Jamendo) */
function musApply(){ if(MUS.a) MUS.a.volume = Math.min(1, Math.max(0, musVol() * MUS.f)); }
function musFade(to, ms){ return new Promise(res => { clearInterval(MUS.ft); const from = MUS.f, t0 = Date.now(); MUS.ft = setInterval(() => { const p = Math.min(1, (Date.now() - t0) / ms); MUS.f = from + (to - from) * p; musApply(); if(p >= 1){ clearInterval(MUS.ft); res(); } }, 50); }); }
async function musGet(tag, off, spd){
  const u = "https://api.jamendo.com/v3.0/tracks/?client_id=" + encodeURIComponent(musKey()) + "&format=json&limit=40&offset=" + off + "&audioformat=mp32&order=popularity_month&speed=" + spd + (tag ? "&tags=" + encodeURIComponent(tag) : "");
  const r = await fetch(u); if(!r.ok) throw new Error("HTTP " + r.status);
  const j = await r.json(), h = j.headers || {};
  if(h.status && h.status !== "success") throw new Error(h.error_message || h.warnings || "error");
  return (j.results || []).filter(x => x.audio && !MUS.seen.has(x.id));
}
async function musFetch(tier){
  const spd = MUS_SPEED[tier], tag = store.get("si_jamtag"), off = Math.floor(Math.random() * 60);
  const tries = tag ? [[tag, off], [tag, 0], ["", off], ["", 0]] : [["", off], ["", 0]];
  let l = [];
  for(const [g, o] of tries){ l = await musGet(g, o, spd); if(l.length) break; } // genre trop restrictif : on le lâche
  for(let i = l.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  return l;
}
async function musPlay(tier){
  const my = ++MUS.seq; MUS.tier = tier; MUS.since = Date.now();
  try{
    const tg = store.get("si_jamtag"); if(MUS.qt !== tg){ MUS.q = {}; MUS.qt = tg; } // genre changé : on repart de piles neuves
    let q = MUS.q[tier];
    if(!q || !q.length){ MUS.msg = t("musLoad"); musUI(); q = MUS.q[tier] = await musFetch(tier); if(my !== MUS.seq) return; }
    const tr = q.shift();
    if(!tr){ MUS.msg = t("musNone"); musUI(); return; }
    if(MUS.a.getAttribute("src") && !MUS.a.paused) await musFade(0, 1200); // fondu sortant du morceau précédent
    if(my !== MUS.seq || !MUS.on) return;
    if(MUS.seen.size > 400) MUS.seen.clear();
    MUS.seen.add(tr.id); MUS.cur = tr; MUS.msg = ""; MUS.f = 0; MUS.a.src = tr.audio; musApply();
    await MUS.a.play(); MUS.err = 0; musFade(1, 1500); musUI();
  }catch(e){ if(my !== MUS.seq) return; MUS.msg = t("musErr", e && e.message ? e.message : e); musUI(); }
}
function musStart(){
  if(!musKey()){ MUS.msg = t("musNeed"); musUI(); return; }
  if(!MUS.a){
    const a = MUS.a = new Audio(); a.preload = "none";
    a.onended = () => { if(MUS.on) musPlay(musTier(musZone())); }; // morceau fini : suivant, au tempo de l'étape actuelle
    a.onerror = () => { if(!MUS.on || !a.getAttribute("src")) return; if(++MUS.err > 3){ MUS.msg = t("musErr", "audio"); musUI(); return; } setTimeout(() => { if(MUS.on) musPlay(musTier(musZone())); }, 800); };
  }
  MUS.on = true; MUS.hold = false; MUS.err = 0; MUS.msg = ""; musPlay(musTier(musZone())); musUI();
}
function musStop(){
  MUS.on = false; MUS.seq++; clearInterval(MUS.ft); MUS.cur = null; MUS.msg = "";
  if(MUS.a){ try{ MUS.a.pause(); MUS.a.removeAttribute("src"); MUS.a.load(); }catch(e){} }
  musUI();
}
function musSync(){ // appelé à chaque tick du lecteur : pause avec la séance, et changement de morceau quand le palier d'intensité change (étape ≥ 60 s, au moins 90 s après le dernier changement)
  if(!MUS.on || !MUS.a || !RUN || !RUN.steps || !RUN.steps.length) return;
  const a = MUS.a, hold = !!RUN.began && RUN.paused;
  if(hold){ if(!a.paused){ a.pause(); MUS.hold = true; } return; }
  if(MUS.hold){ MUS.hold = false; if(a.getAttribute("src")) a.play().catch(() => {}); }
  const st = RUN.steps[RUN.i], tr = musTier(st.z);
  if(tr !== MUS.tier && st.dur >= 60 && Date.now() - MUS.since > 90000) musPlay(tr);
}
function musUI(){
  const b = $("musGo"); if(!b) return;
  const key = !!musKey(), n = $("musNext");
  { const mm = musMini(), bm = $("musMin"), l = t(mm ? "musMax" : "musMin"); $("runMus").classList.toggle("min", mm); bm.textContent = mm ? "▴" : "▾"; bm.title = l; bm.setAttribute("aria-label", l); b.title = MUS.on && MUS.cur ? MUS.cur.name + " — " + MUS.cur.artist_name : ""; }
  $("runMus").hidden = !key || !musShown(); // visible seulement si un client ID Jamendo est renseigné et si le réglage « afficher la musique » est coché
  b.textContent = MUS.on ? "⏹ " + t("musStop") : "▶ " + t("musStart"); b.disabled = !MUS.on && !key;
  n.hidden = !MUS.on; n.title = t("musNext"); n.setAttribute("aria-label", t("musNext"));
  $("musInfo").textContent = MUS.msg || (!key ? t("musNeed") : MUS.on && MUS.cur ? "♪ " + MUS.cur.name + " — " + MUS.cur.artist_name + " · " + t("musT" + MUS.tier) : "");
  $("musVol").value = Math.round(musVol() * 100); $("musTag").value = store.get("si_jamtag");
}
function musBind(){
  $("musMin").onclick = () => { store.set("si_rm_musmin", musMini() ? "0" : "1"); musUI(); };
  $("musGo").onclick = () => MUS.on ? musStop() : musStart();
  $("musNext").onclick = () => { if(MUS.on) musPlay(musTier(musZone())); };
  $("musTag").onchange = e => { store.set("si_jamtag", e.target.value); if($("jamtag")) $("jamtag").value = e.target.value; if(MUS.on) musPlay(musTier(musZone())); }; // nouveau genre : on enchaîne tout de suite
  $("musVol").oninput = e => { store.set("si_musvol", e.target.value); musApply(); };
  musUI();
}
let RUN_WL = null; // empêche la mise en veille de l'écran pendant la séance
