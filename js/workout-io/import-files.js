/* FlameCadence - Import .zwo / .fit / .erg / .mrc / .json / .txt files */
// ---------- Import .zwo / .fit ----------
function fmtDurImp(sec){
  sec = Math.round(sec);
  if(sec >= 3600 && sec % 3600 === 0) return (sec / 3600) + "h";
  if(sec >= 3600) return Math.floor(sec / 3600) + "h" + Math.round((sec % 3600) / 60);
  if(sec >= 60 && sec % 60 === 0) return (sec / 60) + "m";
  if(sec < 60) return sec + "s";
  return Math.floor(sec / 60) + "m" + (sec % 60);
}
function stepsToDesc(steps, watt){
  const key = s => (s.m ? "m" + Math.round(s.m) : Math.round(s.d)) + "|" + (s.g != null ? "g" + s.g + "|" : "") + (s.hr ? "h" + s.ha.toFixed(1) + "|" + s.hb.toFixed(1) : s.a.toFixed(1) + "|" + s.b.toFixed(1)) + (s.aw != null ? "|w" + s.aw + "|" + s.bw : "");
  const line = s => {
    if(s.hr) return "- " + (s.m ? distTxt(s.m) : fmtDurImp(s.d)) + " " + (Math.abs(s.ha - s.hb) > 0.5 ? Math.round(Math.min(s.ha, s.hb)) + "-" + Math.round(Math.max(s.ha, s.hb)) + "% LTHR ramp" : Math.round(s.ha) + "% LTHR");
    const wa = s.aw != null, A = wa ? s.aw : s.a, B = wa ? s.bw : s.b, wt = wa || watt; // étape en watts absolus : écrite telle quelle, sans repasser par un %
    const p = Math.abs(A - B) > 0.5
      ? Math.round(A) + " - " + Math.round(B) + (wt ? "w ramp" : "% ramp")
      : Math.round(A) + (wt ? "w" : "%");
    return "- " + (s.m ? distTxt(s.m) : fmtDurImp(s.d)) + " " + p + (s.g != null ? " slope " + s.g.toFixed(1) + " pct" : "");
  };
  const out = []; let i = 0;
  while(i < steps.length){
    if(i + 1 < steps.length && key(steps[i]) === key(steps[i + 1])){ // même étape répétée d'affilée
      let n = 1, j = i + 1;
      while(j < steps.length && key(steps[j]) === key(steps[i])){ n++; j++; }
      out.push(n + " x", line(steps[i]), ""); i = j; continue;
    }
    if(i + 3 < steps.length && key(steps[i]) === key(steps[i + 2]) && key(steps[i + 1]) === key(steps[i + 3])){ // couple effort/récup répété
      let n = 1, j = i + 2;
      while(j + 1 < steps.length && key(steps[j]) === key(steps[i]) && key(steps[j + 1]) === key(steps[i + 1])){ n++; j += 2; }
      out.push(n + " x", line(steps[i]), line(steps[i + 1]), ""); i = j; continue;
    }
    out.push(line(steps[i])); i++;
  }
  return out.join("\n");
}
function parseZwo(xml){
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if(doc.querySelector("parsererror")) throw new Error("invalid XML");
  const wk = doc.querySelector("workout");
  if(!wk) throw new Error("no <workout> element");
  const out = [];
  const p = (el, n) => { const v = el.getAttribute(n); return v == null ? null : parseFloat(v); };
  const add = (d, a, b) => { if(d > 0 && a != null) out.push({d: Math.round(d), a: a * 100, b: b * 100}); };
  for(const el of wk.children){
    const tag = el.tagName.toLowerCase();
    if(tag === "steadystate"){ add(p(el, "Duration"), p(el, "Power"), p(el, "Power")); }
    else if(tag === "warmup" || tag === "cooldown" || tag === "ramp" || tag === "warmdown"){
      const lo = p(el, "PowerLow"), hi = p(el, "PowerHigh");
      add(p(el, "Duration"), Math.min(lo, hi), Math.max(lo, hi));
    }
    else if(tag === "intervals" || tag === "intervalst"){
      const rep = p(el, "Repeat") || 1, on = p(el, "OnDuration"), off = p(el, "OffDuration");
      const op = p(el, "OnPower"), fp2 = p(el, "OffPower");
      for(let k = 0; k < rep; k++){ add(on, op, op); if(off && fp2 != null) add(off, fp2, fp2); }
    }
  }
  return out;
}
// --- lecture d'un fichier FIT (workout) ---
// Activité FIT (pas de séance dedans) : on reconstruit les étapes à partir de la puissance enregistrée, en % de la FTP
function fitFromRecords(rec, ftp, watt){ // watt : étapes en watts réellement roulés ; sinon en % de la FTP donnée
  if(!watt && !(ftp > 0)) throw new Error("FTP");
  const ref = ftp > 0 ? ftp : 200; // échelle des paliers (5 % de la FTP, ou de 200 W sans FTP)
  const pts = rec.filter(r => r[253] != null && r[7] != null && r[7] < 65535);
  if(pts.length < 120) throw new Error(t("impFitNoPw"));
  const t0 = pts[0][253], n = pts[pts.length - 1][253] - t0 + 1, P = new Array(n);
  let k = 0, last = pts[0][7];
  for(let s = 0; s < n; s++){ while(k < pts.length && pts[k][253] - t0 <= s){ last = pts[k][7]; k++; } P[s] = last; } // trous d'enregistrement : dernière valeur
  // Segmentation par droites : on lisse la puissance (~9 s), on découpe en blocs de 20 s, puis on fusionne les voisins tant qu'une droite les décrit
  // avec une erreur faible. Résultat : paliers constants là où la puissance est stable, VRAIES RAMPES là où elle monte ou descend progressivement (échauffement, retour au calme).
  const S = new Array(n); for(let i = 0; i < n; i++){ const w = P.slice(Math.max(0, i - 15), Math.min(n, i + 16)).sort((x, y) => x - y); S[i] = w[w.length >> 1]; } // médiane glissante sur ~31 s : ignore arrêts de pédalage et pics brefs, garde les vrais changements de palier
  const T = [0], TT = [0], S1 = [0], S2 = [0], ST = [0], R1 = [0];
  for(let i = 0; i < n; i++){ T.push(T[i] + i); TT.push(TT[i] + i * i); S1.push(S1[i] + S[i]); S2.push(S2[i] + S[i] * S[i]); ST.push(ST[i] + S[i] * i); R1.push(R1[i] + P[i]); }
  const fit = (a, b) => { // régression linéaire de la puissance lissée sur [a, b[ : pente, ordonnée, erreur quadratique moyenne
    const m = b - a, sT = T[b] - T[a], sTT = TT[b] - TT[a], sS = S1[b] - S1[a], sSS = S2[b] - S2[a], sST = ST[b] - ST[a], den = m * sTT - sT * sT;
    const sl = m > 1 && den > 0 ? (m * sST - sT * sS) / den : 0, ic = (sS - sl * sT) / m, sse = Math.max(0, sSS - sS * sS / m - sl * (sST - sT * sS / m));
    return {sl, ic, rmse: Math.sqrt(sse / m)};
  };
  const mean = (a, b) => (S1[b] - S1[a]) / (b - a);
  const TOLK = .035; let segs = []; for(let i = 0; i < n; i += 20) segs.push([i, Math.min(n, i + 20)]);
  if(segs.length > 1 && segs[segs.length - 1][1] - segs[segs.length - 1][0] < 10){ const l = segs.pop(); segs[segs.length - 1][1] = l[1]; }
  for(let tol = ref * TOLK; ; tol *= 1.25){ // on fusionne la paire la plus « droite » tant que l'erreur reste sous la tolérance ; tolérance relevée si on dépasse 40 étapes
    for(;;){
      let bj = -1, bv = Infinity;
      for(let j = 0; j + 1 < segs.length; j++){ const e = fit(segs[j][0], segs[j + 1][1]).rmse; if(e < bv){ bv = e; bj = j; } }
      if(bj < 0 || bv > tol) break;
      segs.splice(bj, 2, [segs[bj][0], segs[bj + 1][1]]);
    }
    if(segs.length <= 40) break;
  }
  for(;;){ // plages trop courtes (< 40 s) : absorbées par la voisine de niveau moyen le plus proche
    let j = -1, m = 40; segs.forEach((g, i) => { if(g[1] - g[0] < m){ m = g[1] - g[0]; j = i; } });
    if(j < 0 || segs.length === 1) break;
    const l = segs[j - 1], r = segs[j + 1], c = segs[j], mc = mean(c[0], c[1]);
    const to = !l ? j + 1 : !r ? j - 1 : Math.abs(mean(l[0], l[1]) - mc) <= Math.abs(mean(r[0], r[1]) - mc) ? j - 1 : j + 1;
    segs.splice(Math.min(j, to), 2, [Math.min(segs[to][0], c[0]), Math.max(segs[to][1], c[1])]);
  }
  const val = x => Math.round(Math.max(0, watt ? x : x / ftp * 100)), steps = [];
  segs.forEach(([a, b]) => {
    const f = fit(a, b), v0 = f.ic + f.sl * a, v1 = f.ic + f.sl * (b - 1);
    if(b - a >= 90 && Math.abs(v1 - v0) >= ref * .10) steps.push({d: b - a, a: val(v0), b: val(v1)}); // rampe
    else{ const p = val(mean(a, b)); steps.push({d: b - a, a: p, b: p}); }                              // palier
  });
  return steps;
}
function parseFit(bytes){
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if(bytes.length < 12 || bytes[1] !== 0x10 || String.fromCharCode(...bytes.slice(8, 12)) !== ".FIT") throw new Error("not a FIT file");
  const hl = bytes[0];
  const defs = new Map(), msgs = {};
  const rd = (base, p, big) => {
    switch(base){
      case 0: case 2: case 10: return bytes[p];
      case 1: return dv.getInt8(p);
      case 3: return dv.getInt16(p, !big);
      case 4: case 11: return dv.getUint16(p, !big);
      case 5: return dv.getInt32(p, !big);
      case 6: case 12: return dv.getUint32(p, !big);
      case 8: return dv.getFloat32(p, !big);
      case 9: return dv.getFloat64(p, !big);
      default: return null;
    }
  };
  const scan = (start, stop) => {
    defs.clear(); Object.keys(msgs).forEach(k => delete msgs[k]);
    let pos = start;
    try{
      while(pos < stop && pos < bytes.length){
        let h = bytes[pos++];
        if(h & 0x80){ pos += 2; continue; } // horodatage compressé : ignoré
        if(h & 0x40){
          pos++; // réservé
          const big = bytes[pos] === 1; // architecture : 0 = petit boutiste, 1 = gros boutiste
          pos++;
          const g = dv.getUint16(pos, !big); pos += 2;
          const n = bytes[pos++], fields = [];
          for(let k = 0; k < n; k++){ fields.push([bytes[pos], bytes[pos + 1], bytes[pos + 2]]); pos += 3; }
          defs.set(h & 0x0f, {g, fields, big});
        }else{
          const d = defs.get(h & 0x0f);
          if(!d) break;
          const rec = {};
          for(const [num, sz, tp] of d.fields){
            if((tp & 0x1f) === 7){ // chaîne
              let e = pos; while(e < bytes.length && bytes[e]) e++;
              rec[num] = new TextDecoder().decode(bytes.slice(pos, Math.min(e, pos + sz)));
              pos += sz;
            }else{
              rec[num] = rd(tp & 0x1f, pos, d.big);
              pos += sz;
            }
          }
          (msgs[d.g] = msgs[d.g] || []).push(rec);
        }
      }
    }catch(e){ /* flux désynchronisé ou tronqué : on garde ce qui a été lu */ }
  };
  scan(hl === 14 ? 14 : 12, hl === 14 ? 14 + dv.getUint32(4, true) : bytes.length);
  if(!(msgs[27] || []).length && hl === 12 && bytes.length > 14){
    // certaines écritures placent un CRC après une en-tête de 12 octets : les données commencent alors à 14
    scan(14, bytes.length);
  }
  // workout (26) / workout_step (27)
  const ftp = curFtp();
  const out = [];
  for(const r of (msgs[27] || [])){
    let d = 0;
    if((r[0] === 0 || r[0] == null) && r[1]) d = r[1] / 1000; // durée en ms
    if(!d) continue;
    let a = null, b = null, w = false;
    if(r[2] === 4 && r[3] != null){ // cible puissance relative (pour mille)
      const v = r[3];
      if(v <= 1000) a = b = v / 10; else{ a = b = v - 1000; w = true; } // > 1000 : watts absolus (décalage de 1000 dans le format FIT)
    }
    if(r[5] != null && r[6] != null){ // plage personnalisée
      const lo = r[5], hi = r[6];
      if(lo <= 1000 && hi <= 1000){ a = lo / 10; b = hi / 10; w = false; }
      else{ a = lo > 1000 ? lo - 1000 : lo; b = hi > 1000 ? hi - 1000 : hi; w = true; }
    }
    if(a == null) continue;
    out.push({d: Math.round(d), a, b, w});
  }
  out.fitWatts = out.some(x => x.w); // cibles en watts : importFile demande de les garder tels quels ou de les convertir en % d'une FTP
  if(!out.length && (msgs[20] || []).length) out.fitRecords = msgs[20]; // fichier d'activité : pas d'étapes ; importFile propose de les reconstruire à partir de la puissance enregistrée
  return out;
}
// .mrc / .erg : points « temps valeur » (minutes ; % de FTP pour .mrc, watts pour .erg) ; un saut vertical entre deux points = changement de palier
function parseErgMrc(txt, ext){
  const lines = txt.replace(/^\uFEFF/, "").split(/\r?\n/).map(l => l.trim());
  const di = lines.findIndex(l => /^\[COURSE DATA\]/i.test(l)); if(di < 0) throw new Error(t("impErgBad"));
  const head = lines.slice(0, di).join("\n");
  const pct = /PERCENT/i.test(head) || (!/WATTS/i.test(head) && ext === "mrc"), unit = /^SECONDS\b/im.test(head) ? 1 : 60;
  const fm = /^FTP\s*=\s*(\d+(?:\.\d+)?)/im.exec(head), ftp = fm ? +fm[1] : curFtp(), dm = /^DESCRIPTION\s*=\s*(.*)$/im.exec(head);
  if(!pct && !(ftp > 0)) throw new Error("FTP");
  const pts = [];
  for(const l of lines.slice(di + 1)){
    if(/^\[END\]/i.test(l)) break;
    const v = l.split(/[\s,;]+/).map(parseFloat); if(v.length >= 2 && isFinite(v[0]) && isFinite(v[1])) pts.push({t: v[0], v: v[1]});
  }
  const toP = v => Math.round((pct ? v : v / ftp * 100) * 10) / 10, steps = [];
  for(let k = 1; k < pts.length; k++){
    const d = Math.round((pts[k].t - pts[k - 1].t) * unit); if(d < 1) continue; // saut vertical : pas de durée
    const a = toP(pts[k - 1].v), b = toP(pts[k].v), last = steps[steps.length - 1];
    if(last && Math.abs(last.a - last.b) < 0.05 && Math.abs(a - b) < 0.05 && Math.abs(last.b - a) < 0.05) last.d += d; // fusionne les paliers identiques consécutifs (fichiers à points denses)
    else steps.push({d, a, b});
  }
  return {steps, name: dm ? dm[1].trim() : "", watts: !pct, ftp};
}
// .json : export FlameCadence (steps: duration_s / from_pct / to_pct)
function parseJsonWorkout(txt){
  const j = JSON.parse(txt.replace(/^\uFEFF/, "")), arr = j && !Array.isArray(j) ? j.steps : null;
  if(!Array.isArray(arr)) throw new Error(t("impJsonBad"));
  const steps = arr.map(x => ({d: Math.round(+x.duration_s), a: +x.from_pct, b: +x.to_pct})).filter(x => x.d > 0 && isFinite(x.a) && isFinite(x.b));
  return {steps, name: typeof j.name === "string" ? j.name.trim() : ""};
}
