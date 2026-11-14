/* FlameCadence - GPX routes (OpenRunner, Strava, Komoot...) turned into slope-mode workouts */
// ---------- Parcours GPX (OpenRunner, Strava, Komoot…) → sortie en mode pente ----------
// P = [[lat, lon, altitude], …] ; profil lissé tous les 25 m, puis regroupé en tronçons de pente homogène (60 max)
// tracé simplifié (400 points max) pour la carte satellite du lecteur
function gpxCoords(P){ const s = Math.max(1, Math.ceil(P.length / 400)), o = [], f = p => [+p[0].toFixed(5), +p[1].toFixed(5)]; for(let i = 0; i < P.length; i += s) o.push(f(P[i])); o.push(f(P[P.length - 1])); return o; }
// tracés importés, gardés dans ce navigateur (8 derniers) et retrouvés par la suite des tronçons en pente (distance + pente), donc même renommée ou envoyée à l'agenda la séance garde sa carte
const ROUTES = {
  sig: st => (st || []).filter(x => x.m > 0 && x.g != null).map(x => Math.round(x.m) + ":" + (+x.g).toFixed(1)).join(","),
  load(){ try{ return JSON.parse(store.get("si_routes") || "{}") || {}; }catch(e){ return {}; } },
  save(st, co){ const k = this.sig(st); if(!k) return; const o = this.load(); delete o[k]; o[k] = co; const ks = Object.keys(o); while(ks.length > 8) delete o[ks.shift()]; try{ store.set("si_routes", JSON.stringify(o)); }catch(e){} },
  get(st){ const k = this.sig(st); return k ? this.load()[k] || null : null; }
};
function gpxBuild(P){
  const R = Math.PI / 180, D = [0]; let lastE = P.find(p => isFinite(p[2]))[2];
  P.forEach(p => { if(isFinite(p[2])) lastE = p[2]; else p[2] = lastE; });
  for(let i = 1; i < P.length; i++){
    const a = P[i - 1], b = P[i], s1 = Math.sin((b[0] - a[0]) * R / 2), s2 = Math.sin((b[1] - a[1]) * R / 2);
    D.push(D[i - 1] + 12742000 * Math.asin(Math.sqrt(s1 * s1 + Math.cos(a[0] * R) * Math.cos(b[0] * R) * s2 * s2)));
  }
  const STEP = 25, tot = D[D.length - 1], n = Math.floor(tot / STEP);
  if(n < 8) throw new Error(t("impGpxBad"));
  const E = []; let j = 0;
  for(let k = 0; k <= n; k++){
    const d = k * STEP; while(j < D.length - 2 && D[j + 1] < d) j++;
    const L = D[j + 1] - D[j], f = L > 0 ? Math.min(1, Math.max(0, (d - D[j]) / L)) : 0; E.push(P[j][2] + (P[j + 1][2] - P[j][2]) * f);
  }
  const S = E.map((_, k) => { let s = 0, c = 0; for(let q = Math.max(0, k - 3); q <= Math.min(n, k + 3); q++){ s += E[q]; c++; } return s / c; });
  let gain = 0; const G = [];
  for(let k = 0; k < n; k++){ gain += Math.max(0, S[k + 1] - S[k]); G.push(Math.max(-18, Math.min(25, (S[k + 1] - S[k]) / STEP * 100))); }
  const seg = (minL, thr) => {
    const out = []; let L = 0, Gs = 0;
    for(let k = 0; k < n; k++){
      if(L >= minL){ const la = G.slice(k, k + 4).reduce((a, b) => a + b, 0) / Math.min(4, n - k); if(Math.abs(la - Gs / L) > thr || L >= 3000){ out.push([L, Gs / L]); L = 0; Gs = 0; } }
      L += STEP; Gs += G[k] * STEP;
    }
    if(L > 0){ if(out.length && L < minL / 2){ const q = out[out.length - 1]; q[1] = (q[1] * q[0] + Gs) / (q[0] + L); q[0] += L; } else out.push([L, Gs / L]); }
    return out;
  };
  let minL = 250, thr = 1.5, segs = seg(minL, thr);
  while(segs.length > 60 && thr < 12){ thr += .5; minL = Math.min(1500, minL + 100); segs = seg(minL, thr); }
  const lines = segs.map(([L, g]) => { const g1 = Math.round(g * 10) / 10; return "- " + distTxt(L) + " " + (g1 < -1 ? 40 : g1 < 1.5 ? 65 : 75) + "% slope " + g1.toFixed(1) + " pct"; });
  return {txt: "Warmup\n- 10m 55%\n\nMain set\n" + lines.join("\n") + "\n\nCooldown\n- 5m 50%", km: tot / 1000, gain: Math.round(gain), n: segs.length, co: gpxCoords(P)};
}
function parseGpx(xml){
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if(doc.querySelector("parsererror")) throw new Error(t("impGpxBad"));
  let pts = [...doc.getElementsByTagName("trkpt")]; if(!pts.length) pts = [...doc.getElementsByTagName("rtept")];
  const P = pts.map(e => { const el = e.getElementsByTagName("ele")[0]; return [parseFloat(e.getAttribute("lat")), parseFloat(e.getAttribute("lon")), el ? parseFloat(el.textContent) : NaN]; }).filter(p => isFinite(p[0]) && isFinite(p[1]));
  if(P.length < 2) throw new Error(t("impGpxBad"));
  if(P.filter(p => isFinite(p[2])).length < P.length * .8) throw new Error(t("impNoEle"));
  const r = gpxBuild(P), nm = doc.getElementsByTagName("name")[0]; r.name = nm ? nm.textContent.trim() : ""; return r;
}
// pile des 10 derniers imports (dans ce navigateur) : nom, texte de la séance, et pour un GPX le tracé simplifié pour la carte
const impStack = () => { try{ const a = JSON.parse(store.get("si_imports") || "[]"); return Array.isArray(a) ? a.slice(0, 10) : []; }catch(e){ return []; } };
function impPush(e){
  const a = impStack().filter(x => !(x.n === e.n && x.d === e.d)); a.unshift(e);
  try{ store.set("si_imports", JSON.stringify(a.slice(0, 10))); }catch(_){}
  impHistRender();
}
function impHistRender(){
  const a = impStack(), box = $("impHist"); if(!box) return;
  box.hidden = !a.length;
  $("impHistList").innerHTML = a.map((e, i) => `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid var(--line)"><div style="flex:1;min-width:0"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.n || e.f || "--")}</div><div class="hint" style="margin:2px 0 0">${esc([e.f, new Date(e.t).toLocaleString(loc(), {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}), e.k ? e.k + " km" + (e.g ? " · " + e.g + " m" : "") : ""].filter(Boolean).join(" · "))}</div></div><button type="button" class="alt small" data-ih="load" data-i="${i}">${esc(t("impHistLoad"))}</button><button type="button" class="alt small icon danger" data-ih="del" data-i="${i}" title="${esc(t("del"))}" aria-label="${esc(t("del"))}">✕</button></div>`).join("");
}
$("impHistList").onclick = e => {
  const b = e.target.closest("button[data-ih]"); if(!b) return;
  const a = impStack(), i = +b.dataset.i, x = a[i]; if(!x) return;
  if(b.dataset.ih === "del"){ a.splice(i, 1); try{ store.set("si_imports", JSON.stringify(a)); }catch(_){} impHistRender(); return; }
  $("name").value = x.n || ""; $("desc").value = x.d || "";
  const sp = $("sport"); if(x.s && [...sp.options].some(o => o.value === x.s)) sp.value = x.s;
  $("prev").hidden = false; selLine = null; EXPL = null; setSrcAct(null); renderChart();
  if(x.co){ try{ ROUTES.save(parseWorkout(x.d, sp.value, curFtp()), x.co); }catch(_){} } // le tracé retrouve sa carte satellite dans le lecteur
  say("impOk", "ok", x.f || x.n);
};
impHistRender();
// choix à l'import d'une sortie enregistrée : watts absolus, ou % d'une FTP (intérieur, extérieur ou valeur libre)
function fitChoose(kind, defFtp){
  return new Promise(res => {
    const d = $("fitDlg"), sel = $("fitFtp"), v = $("fitFtpV"), opts = [];
    $("fitDlgT").textContent = t(kind === "act" ? "fitTAct" : "fitT"); const hn = d.querySelector('[data-i="fitHint"]'); if(hn) hn.textContent = t(kind === "act" ? "fitHintAct" : "fitHint");
    if(ICU.ftpIn) opts.push(["in", t("fitFtpIn", Math.round(ICU.ftpIn)), ICU.ftpIn]);
    if(ICU.ftpOut) opts.push(["out", t("fitFtpOut", Math.round(ICU.ftpOut)), ICU.ftpOut]);
    opts.push(["x", t("fitFtpX"), 0]);
    sel.innerHTML = opts.map(o => `<option value="${o[0]}">${esc(o[1])}</option>`).join("");
    const pre = opts.find(o => o[2] && o[2] === (defFtp || ftpFor($("sport").value))) || opts[0]; sel.value = pre[0]; v.value = pre[2] ? Math.round(pre[2]) : "";
    if(kind === "act"){ const r = document.querySelector('input[name="fitMode"][value="' + ($("actout").value === "pct" ? "pct" : "w") + '"]'); if(r) r.checked = true; } // proposition de départ = dernier choix du panneau, la décision se prend à chaque reconstruction
    const mode = () => document.querySelector('input[name="fitMode"]:checked').value;
    const cus = () => sel.value === "x", upd = () => { $("fitFtpBox").hidden = mode() === "w"; v.hidden = !cus(); }; // la case de saisie n'apparaît que pour « personnalisée »
    sel.onchange = () => { const o = opts.find(x => x[0] === sel.value); if(o && o[2]) v.value = Math.round(o[2]); upd(); if(cus()){ v.focus(); v.select(); } }; // « personnalisée » repart de la dernière valeur affichée
    document.querySelectorAll('input[name="fitMode"]').forEach(r => r.onchange = upd); upd();
    let done = false; const end = x => { if(done) return; done = true; if(d.open) d.close(); res(x); };
    $("fitOk").onclick = () => { const watt = mode() === "w", o = opts.find(x => x[0] === sel.value), ftp = Math.round(cus() || !o ? +v.value : o[2]); if(!watt && !(ftp > 0)){ v.focus(); return; } end({watt, ftp}); };
    $("fitNo").onclick = () => end(null); d.onclose = () => end(null);
    d.showModal();
  });
}
async function importFile(f){
  try{
    const ext = ((/\.([a-z0-9]+)$/i.exec(f.name) || [])[1] || "").toLowerCase();
    let steps, name = "", desc = null, ftpUsed = 0, gpx = null;
    if(ext === "fit"){
      steps = parseFit(new Uint8Array(await f.arrayBuffer()));
      if(steps.fitRecords){ // sortie enregistrée : watts absolus, ou % d'une FTP au choix (intérieur, extérieur, autre)
        const ch = await fitChoose(); if(!ch) return;
        if(ch.watt && !(curFtp() > 0)) throw new Error("FTP");
        desc = stepsToDesc(fitFromRecords(steps.fitRecords, ch.watt ? curFtp() : ch.ftp, ch.watt), ch.watt);
        steps = parseWorkout(desc, $("sport").value, curFtp()); steps.fromActivity = true;
      }else if(steps.fitWatts){ // séance FIT en watts : on les garde, ou on les convertit en % d'une FTP au choix (intérieur, extérieur, autre)
        const ch = await fitChoose(); if(!ch) return;
        if(ch.watt && !(curFtp() > 0)) throw new Error("FTP");
        const conv = steps.map(s => ch.watt ? {d: s.d, a: s.w ? s.a : s.a * curFtp() / 100, b: s.w ? s.b : s.b * curFtp() / 100} : {d: s.d, a: s.w ? s.a / ch.ftp * 100 : s.a, b: s.w ? s.b / ch.ftp * 100 : s.b});
        desc = stepsToDesc(conv, ch.watt); steps = parseWorkout(desc, $("sport").value, curFtp());
      }
    }
    else if(ext === "zwo" || ext === "xml") steps = parseZwo(await f.text());
    else if(ext === "mrc" || ext === "erg"){ const r = parseErgMrc(await f.text(), ext); steps = r.steps; name = r.name; if(r.watts) ftpUsed = r.ftp; }
    else if(ext === "json"){ const r = parseJsonWorkout(await f.text()); steps = r.steps; name = r.name; }
    else if(ext === "txt"){ const txt = (await f.text()).replace(/^\uFEFF/, "").trim(); steps = parseWorkout(txt, $("sport").value, curFtp()); desc = txt; } // le texte est gardé tel quel (répétitions, commentaires)
    else if(ext === "gpx"){ gpx = parseGpx(await f.text()); name = gpx.name; const sp = $("sport"); if([...sp.options].some(o => o.value === "VirtualRide")) sp.value = "VirtualRide"; steps = parseWorkout(gpx.txt, "VirtualRide", curFtp()); desc = gpx.txt; ROUTES.save(steps, gpx.co); }
    else return say("impUnk", "err");
    if(!steps.length) return say("impEmpty", "err");
    const nm = name.slice(0, 60) || f.name.replace(/\.[a-z0-9]+$/i, "").replace(/^\d{4}[-_]\d{2}[-_]\d{2}[-_ ]+/, "").replace(/[_-]+/g, " ").replace(/\s*\b\w/g, c => c.toUpperCase()).trim().slice(0, 60);
    if(nm) $("name").value = nm;
    $("desc").value = desc != null ? desc : stepsToDesc(steps);
    $("prev").hidden = false; selLine = null; EXPL = null; setSrcAct(null);
    renderChart(); impPush({t: Date.now(), f: f.name, n: $("name").value, d: $("desc").value, s: $("sport").value, co: gpx ? gpx.co : null, k: gpx ? +gpx.km.toFixed(1) : null, g: gpx ? gpx.gain : null});
    if(gpx) say("impOkG", "ok", f.name, gpx.km.toFixed(1), gpx.gain, gpx.n); else if(steps.fromActivity) say("impOkA", "ok", f.name); else if(ftpUsed) say("impOkW", "ok", f.name, Math.round(ftpUsed)); else say("impOk", "ok", f.name);
  }catch(e){
    say("impErr", "err", e && e.message === "FTP" ? t("impNoFtp") : e && e.message ? e.message : errText(e));
  }
}
$("imppick").onclick = () => $("impin").click();
$("impin").onchange = () => { const f = $("impin").files[0]; $("impin").value = ""; if(f) importFile(f); };
{
  const z = $("impzone");
  ["dragover", "dragenter"].forEach(ev => z.addEventListener(ev, e => { e.preventDefault(); z.style.borderColor = "var(--acc)"; }));
  ["dragleave", "drop"].forEach(ev => z.addEventListener(ev, e => { e.preventDefault(); z.style.borderColor = ""; }));
  z.addEventListener("drop", e => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if(f) importFile(f); });
}

