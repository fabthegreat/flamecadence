/* FlameCadence - Player: voice announcements, timer tick, keep-alive, media session */
// ---------- Annonces vocales (synthèse vocale du navigateur) : l'intervalle suivant est annoncé 10 s avant son début ----------
const runVoiceOn = () => store.get("si_rm_voice") === "1";
function runSpeak(txt){
  try{ if(!window.speechSynthesis) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); u.lang = lang === "fr" ? "fr-FR" : "en-US"; speechSynthesis.speak(u); }catch(e){}
}
function runSpokenDur(sec){
  const m = Math.floor(sec / 60), r = Math.round(sec % 60), fr = lang === "fr", p = [];
  if(m) p.push(m + " " + (m > 1 || fr && false ? "minutes" : "minute")); if(r) p.push(r + " " + (fr ? (r > 1 ? "secondes" : "seconde") : (r > 1 ? "seconds" : "second")));
  return p.join(" ");
}
function runVoiceText(st){
  const d = runSpokenDur(st.dur), a = Math.round(st.pw + (RUN.nudge || 0)), b = Math.round(st.pw2 + (RUN.nudge || 0));
  return Math.abs(b - a) >= 10 ? t("vRamp", d, a, b) : t("vNext", d, a);
}
// minuterie du lecteur : un Worker n'est pas ralenti quand la page passe en arrière-plan (les setInterval de la page tombent à 1 par minute), donc les changements d'étape, la consigne de puissance et l'enregistrement continuent
function runTmStart(){
  try{
    const u = URL.createObjectURL(new Blob(["setInterval(function(){postMessage(0)},1000)"], {type: "text/javascript"})), w = new Worker(u);
    w.onmessage = () => { try{ runTick(); }catch(e){ console.error(e); } }; w._u = u; return w;
  }catch(e){ return setInterval(runTick, 1000); }
}
function runTmStop(){ const h = RUN.tm; RUN.tm = 0; if(h && h.terminate){ h.terminate(); try{ URL.revokeObjectURL(h._u); }catch(e){} } else clearInterval(h); }
// filet de sécurité : chaque notification Bluetooth (FC, puissance) relance l'horloge si elle a pris du retard (page masquée, minuteur gelé)
function runPump(){ if(typeof RUN !== "undefined" && RUN && RUN.tm && Date.now() - (RUN.lt || 0) > (document.hidden ? 1100 : 2500)) runTick(); }
function runTick(){
  RUN.lt = Date.now();
  // horloge basée sur l'heure réelle : un navigateur en arrière-plan ralentit ou gèle les minuteurs, on rattrape donc les secondes manquées
  const now = Date.now(); let n = 0;
  if(RUN.paused){ RUN.last = now; RUN.acc = 0; }
  else { RUN.acc = (RUN.acc || 0) + (now - (RUN.last || now)); RUN.last = now; n = Math.min(Math.floor(RUN.acc / 1000), 86400); RUN.acc -= n * 1000; }
  let chg = false;
  for(let k = 0; k < n && !RUN.paused; k++){
    const s0 = RUN.steps[RUN.i];
    { const v1 = runSpeed(RUN.ap, s0.g); RUN.dist = (RUN.dist || 0) + (s0.m > 0 ? RUN.vs + (v1 - RUN.vs) * .5 : v1); } // distance approximative : vitesse du modèle physique (puissance, pente, poids), 1 s par tour
    if(s0.m > 0){ // étape en pente définie par sa distance : on cumule la distance avec la vitesse du modèle (puissance réelle, pente, poids) ; plus de pédalage = plus de distance
      RUN.el++; RUN.vs += (runSpeed(RUN.ap, s0.g) - RUN.vs) * .5; RUN.mleft -= RUN.vs;
      RUN.left = RUN.vs > .5 ? Math.ceil(Math.max(0, RUN.mleft) / RUN.vs) : Math.ceil(s0.dur * Math.max(0, RUN.mleft) / s0.m); // temps restant estimé à la vitesse actuelle (compte à rebours sonore)
      if(RUN.mleft > 0) continue; RUN.left = 0;
    }else{
      if(RUN.left > 0){ RUN.left--; RUN.el++; }
      if(RUN.left > 0) continue;
    }
    chg = true;
    if(RUN.i < RUN.steps.length - 1){ RUN.i++; runEnter(); }
    else { $("msg").textContent = t("runDone"); if(runVoiceOn()) runSpeak(t("vDone")); runFinish(); break; }
  }
  if(n > 0 && n <= 2){ // pas de bips après un rattrapage (page restée en arrière-plan)
    const lead = runLead();
    if(lead > 0){ // son diffusé (Chromecast, enceinte Bluetooth) : il arrive en retard, donc les bips sont joués avec `lead` secondes d'avance. Les ticks durent 1 s : on déclenche au tick entier précédent et le reste est un délai audio
      if(!RUN.paused){
        const lc = Math.ceil(lead), dl = lc - lead; let T = RUN.left; // T = secondes avant la fin de l'étape k
        for(let k = RUN.i; k < RUN.steps.length; k++){
          if(k > RUN.i) T += RUN.steps[k].dur;
          const x = T - lc; if(x > 3) break; if(x < 0) continue;
          const bk = "L" + k + ":" + x;
          if(RUN.bk !== bk){ RUN.bk = bk; if(x === 0) runBeep(1320, .5, dl); else runBeep(880, .12, dl); }
          break;
        }
      }
    }else{
      const bk = RUN.i + ":" + RUN.left;
      if(chg){ RUN.bk = bk; runBeep(1320, .5); }
      else if(!RUN.paused && RUN.left >= 1 && RUN.left <= 3 && RUN.left < RUN.steps[RUN.i].dur && RUN.bk !== bk){ RUN.bk = bk; runBeep(880, .12); }
    }
  }
  if(n > 0 && n <= 2 && !RUN.paused && runVoiceOn()){ // annonce vocale de l'intervalle suivant, 10 s avant son début (étapes de plus de 15 s)
    const nx = RUN.steps[RUN.i + 1], vk = "v" + RUN.i;
    if(nx && RUN.left === 10 && RUN.steps[RUN.i].dur > 15 && RUN.vk !== vk){ RUN.vk = vk; runSpeak(runVoiceText(nx)); }
  }
  if(!RUN.steps[RUN.i]) return; // aucune séance chargée : rien à faire tourner (évitait une erreur à chaque seconde)
  const st = RUN.steps[RUN.i], tgt = runTgt(st, RUN.left);
  // télémétrie : valeurs réelles Bluetooth uniquement
  const L = RUN.live;
  RUN.ap = L.p != null ? L.p : 0;
  RUN.hr = L.h != null ? L.h : 0;
  RUN.cad = L.c != null ? L.c : 0;
  if(!RUN.paused && (L.p != null || L.h != null)) RUN.rec.push({t: Date.now(), p: L.p, h: L.h, c: L.c, e: RUN.el, i: RUN.i, x: Math.round(runProg()), d: Math.round(RUN.dist || 0)}); // seulement de vraies données
  if(!RUN.paused && L.p != null){ const sa = RUN.sa && RUN.sa.i === RUN.i ? RUN.sa : (RUN.sa = {i: RUN.i, s: 0, n: 0}); sa.s += L.p; sa.n++; } // moyenne de l'étape en cours (écran de diffusion)
  // pause automatique : le home trainer indique 0 W depuis N secondes (vraies données Bluetooth seulement)
  { const lim = runAutoPause();
    if(!RUN.paused && RUN.began && L.p != null){
      if(L.p > 0) RUN.zs = 0; else if(!RUN.zs) RUN.zs = now;
      if(lim > 0 && RUN.zs && now - RUN.zs >= lim * 1000 && tgt > 0){ RUN.zs = 0; RUN.apz = lim; $("runPlay").click(); }
    }else RUN.zs = 0; }
  runUI(); runSave();
}
// ---- maintien en vie : un son quasi inaudible en boucle + une notification média (comme un lecteur de musique) ; Android garde alors la page active et la décharge beaucoup moins
let RUN_AU = null, RUN_AC = null;
const runKaMode = () => store.get("si_runka") || "off"; // off | mix (Web Audio, se mélange à la musique) | strong (lecteur média, met la musique en pause)
function runKeepAlive(on){
  try{
    const m = runKaMode();
    if(!on || m !== "strong"){ if(RUN_AU && !RUN_AU.paused) RUN_AU.pause(); }
    if(!on || m !== "mix"){ if(RUN_AC && RUN_AC.state === "running") RUN_AC.suspend().catch(() => {}); }
    if(!on || m === "off") return;
    if(m === "strong"){
      if(!RUN_AU){
        const n = 16000, b = new DataView(new ArrayBuffer(44 + n * 2)), w = (o, str) => [...str].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
        w(0, "RIFF"); b.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt "); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true); b.setUint32(24, 8000, true); b.setUint32(28, 16000, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, "data"); b.setUint32(40, n * 2, true);
        for(let i = 0; i < n; i++) b.setInt16(44 + i * 2, Math.round(Math.random() * 6 - 3), true);
        RUN_AU = new Audio(URL.createObjectURL(new Blob([b], {type: "audio/wav"}))); RUN_AU.loop = true;
      }
      if(RUN_AU.paused) RUN_AU.play().catch(() => {});
    }else{
      if(!RUN_AC){
        const C = window.AudioContext || window.webkitAudioContext; if(!C) return;
        RUN_AC = new C(); const buf = RUN_AC.createBuffer(1, RUN_AC.sampleRate, RUN_AC.sampleRate), d = buf.getChannelData(0);
        for(let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.001;
        const src = RUN_AC.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(RUN_AC.destination); src.start();
      }
      if(RUN_AC.state !== "running") RUN_AC.resume().catch(() => {});
    }
  }catch(e){}
}
function runMedia(){ // notification média : nom de la séance, étape en cours, lecture/pause et étapes précédente/suivante depuis l'écran de verrouillage
  if(!("mediaSession" in navigator) || !RUN || !RUN.began) return;
  const st = RUN.steps[RUN.i], key = RUN.i + "|" + RUN.paused; if(RUN.mk === key) return; RUN.mk = key;
  try{
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({title: RUN.cur ? RUN.cur.name : "FlameCadence", artist: st ? st.name : "", album: "FlameCadence"}); ms.playbackState = RUN.paused ? "paused" : "playing";
    ms.setActionHandler("play", () => { if(RUN.paused) $("runPlay").click(); }); ms.setActionHandler("pause", () => { if(!RUN.paused) $("runPlay").click(); });
    ms.setActionHandler("nexttrack", () => runJump(RUN.i + 1)); ms.setActionHandler("previoustrack", () => runJump(RUN.i - 1));
  }catch(e){}
}
// ---- Musique Jamendo (bêta) : playlist aléatoire dont le tempo suit la zone d'intensité de l'étape en cours (Z1 calme · Z2-3 régulier · Z4 rapide · Z5+ très rapide)
const MUS = {on: false, a: null, tier: 0, q: {}, seen: new Set(), seq: 0, f: 1, ft: 0, since: 0, hold: false, err: 0, cur: null, msg: ""};
const MUS_SPEED = {1: "low", 2: "medium", 3: "high", 4: "veryhigh"};
const musKey = () => store.get("si_jamkey").trim();
const musMini = () => store.get("si_rm_musmin") === "1"; // section musique réduite au minimum (lecture / suivant)
const musShown = () => store.get("si_rm_mus") !== "0"; // réglage Lecteur : afficher (ou masquer) la section musique
const musTier = z => z <= 1 ? 1 : z <= 3 ? 2 : z === 4 ? 3 : 4;
const musVol = () => { const v = parseInt(store.get("si_musvol"), 10); return isFinite(v) ? Math.min(100, Math.max(0, v)) / 100 : .7; };
const musZone = () => RUN && RUN.steps && RUN.steps[RUN.i] ? RUN.steps[RUN.i].z : 2;
