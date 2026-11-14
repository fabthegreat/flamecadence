/* FlameCadence - Bulk export of a period's activities as FIT files in a .zip */
// ---------- Export en lot : activités d'une période en fichiers FIT dans un .zip ----------
const CRC32T = (() => { const q = []; for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; q[n] = c >>> 0; } return q; })();
function crc32(u8){ let c = 0xFFFFFFFF; for(let i = 0; i < u8.length; i++) c = CRC32T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipStore(files){ // archive ZIP sans compression (les FIT sont déjà compacts) : aucun module externe
  const enc = new TextEncoder(), parts = [], cen = [], l16 = v => [v & 255, v >> 8 & 255], l32 = v => [v & 255, v >> 8 & 255, v >> 16 & 255, v >>> 24 & 255]; let off = 0;
  files.forEach(f => {
    const nm = enc.encode(f.name), crc = crc32(f.data), n = f.data.length, d = f.date instanceof Date && !isNaN(f.date) && f.date.getFullYear() >= 1980 ? f.date : new Date();
    const dt = d.getHours() << 11 | d.getMinutes() << 5 | d.getSeconds() >> 1, dd = (d.getFullYear() - 1980) << 9 | (d.getMonth() + 1) << 5 | d.getDate();
    const lh = Uint8Array.from([0x50, 0x4b, 3, 4, ...l16(20), ...l16(0x0800), ...l16(0), ...l16(dt), ...l16(dd), ...l32(crc), ...l32(n), ...l32(n), ...l16(nm.length), ...l16(0)]);
    parts.push(lh, nm, f.data);
    cen.push(Uint8Array.from([0x50, 0x4b, 1, 2, ...l16(20), ...l16(20), ...l16(0x0800), ...l16(0), ...l16(dt), ...l16(dd), ...l32(crc), ...l32(n), ...l32(n), ...l16(nm.length), ...l16(0), ...l16(0), ...l16(0), ...l16(0), ...l32(0), ...l32(off)]), nm);
    off += lh.length + nm.length + n;
  });
  const cl = cen.reduce((x, y) => x + y.length, 0);
  return new Blob([...parts, ...cen, Uint8Array.from([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...l16(files.length), ...l16(files.length), ...l32(cl), ...l32(off), 0, 0])], {type: "application/zip"});
}
const EXP = {run: false, stop: false};
const expMatch = (k, f) => f === "all" || (f === "bike" ? k === "ride" || k === "rideIn" : f === "other" ? k === "other" || k === "pong" : k === f);
async function expOriginal(a){ // repli : fichier FIT d'origine (décompressé s'il est en .gz)
  for(const u of ["fit-file", "file"]){
    try{
      const q = await icuRaw(`https://intervals.icu/api/v1/activity/${encodeURIComponent(a.id)}/${u}`); if(!q.ok) continue;
      let buf = new Uint8Array(await q.arrayBuffer());
      if(buf[0] === 0x1f && buf[1] === 0x8b){ if(typeof DecompressionStream === "undefined") continue; buf = new Uint8Array(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()); }
      if(buf.length > 14 && String.fromCharCode(buf[8], buf[9], buf[10], buf[11]) === ".FIT") return buf;
    }catch(e){}
  }
  return null;
}
async function expRun(){
  const msg = $("expMsg"), go = $("expGo"), stop = $("expStop"), from = $("expFrom").value, to = $("expTo").value, f = $("expType").value;
  if(EXP.run) return;
  if(!KEY()){ msg.textContent = t("needI"); return; }
  if(!from || !to || from > to){ msg.textContent = t("expBad"); return; }
  EXP.run = true; EXP.stop = false; go.disabled = true; stop.hidden = false; msg.textContent = "…";
  try{
    let acts = await icu(`/activities?oldest=${from}&newest=${to}`);
    acts = (Array.isArray(acts) ? acts : []).filter(a => a.id != null && expMatch(sesKind(a), f)).sort((x, y) => (x.start_date_local || "") < (y.start_date_local || "") ? 1 : -1); // du plus récent au plus ancien
    if(!acts.length){ msg.textContent = t("expNone"); return; }
    const mx = Math.max(0, Math.floor(+$("expMax").value || 0)), rest = mx && acts.length > mx ? acts.slice(mx) : []; if(mx) acts = acts.slice(0, mx); // Strava limite le nombre de fichiers par envoi
    const files = [], used = {}; let skip = 0, i = 0;
    for(const a of acts){
      if(EXP.stop) break;
      msg.textContent = t("expProg", ++i, acts.length);
      let data = null; try{ data = await sesBuildFit(a); }catch(e){ console.warn("FIT", e); }
      if(!data) data = await expOriginal(a);
      if(!data){ skip++; continue; }
      let nm = ((a.start_date_local ? String(a.start_date_local).slice(0, 10) + " " : "") + (a.name || a.type || "activity")).replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
      used[nm] = (used[nm] || 0) + 1; if(used[nm] > 1) nm += " (" + used[nm] + ")";
      files.push({name: nm + ".fit", data, date: new Date(a.start_date_local || Date.now())});
    }
    if(!files.length){ msg.textContent = t("expNoFile"); return; }
    saveBlob(zipStore(files), `flamecadence-${from}_${to}.zip`);
    const last = acts[Math.min(acts.length, i) - 1], ld = ((last && last.start_date_local) || "").slice(0, 10);
    if(!EXP.stop && rest.length && ld){ // lot suivant : la date de fin recule sous la dernière activité exportée (même jour : on la garde pour ne rien oublier)
      const same = rest.some(a => (a.start_date_local || "").slice(0, 10) === ld), d = new Date(ld + "T12:00:00"); if(!same) d.setDate(d.getDate() - 1); $("expTo").value = iso(d);
    }
    msg.textContent = t("expDone", files.length, (skip ? t("expSkip", skip) : "") + (EXP.stop ? t("expStopped") : "") + (!EXP.stop && rest.length ? t("expMore", rest.length) : ""));
  }catch(e){ msg.textContent = t("errI", errText(e)); }
  finally{ EXP.run = false; go.disabled = false; stop.hidden = true; }
}
{ $("expFrom").value = daysAgo(364); $("expTo").value = daysAgo(0);
  $("expGo").onclick = expRun; $("expStop").onclick = () => { EXP.stop = true; };
  document.querySelectorAll("[data-expp]").forEach(b => b.onclick = () => { const v = b.dataset.expp, n = new Date(); $("expTo").value = daysAgo(0); $("expFrom").value = v === "ytd" ? n.getFullYear() + "-01-01" : daysAgo(+v - 1); }); }
$("sesRef").onclick = () => sesMonth(false);
$("sesToday").onclick = () => { const n = new Date(); SES.m = new Date(n.getFullYear(), n.getMonth(), 1); sesMonth(false); };
$("sesPrev").onclick = () => { SES.m = new Date(SES.m.getFullYear(), SES.m.getMonth() - 1, 1); sesMonth(false, -1); };
$("sesNext").onclick = () => { SES.m = new Date(SES.m.getFullYear(), SES.m.getMonth() + 1, 1); sesMonth(false, 1); };

