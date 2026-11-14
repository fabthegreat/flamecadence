/* FlameCadence - Legendary climbs (slope mode) and rider/bike physics helpers (physV, riderKg, totalKg) */
// ---------- Cols mythiques : montées jouées en mode PENTE dans le lecteur (le home trainer reçoit la pente, plus de cible ERG) ----------
// Profils approximatifs : distance, pente moyenne et dénivelé sont ceux des fiches usuelles ; la pente de chaque kilomètre est une allure indicative recalée pour retomber sur la moyenne.
// Chaque tronçon est défini par sa distance exacte (le lecteur passe au suivant quand elle est parcourue) ; la durée affichée dans l'aperçu est une estimation (FTP, poids du coureur, modèle physique). L'échauffement et le retour au calme restent en ERG.
const COLS_WKG = 3.4;
// Modèle physique commun (aperçu, lecteur, route animée) : vitesse d'équilibre (m/s) pour une puissance P (W), une pente g (%) et une masse totale coureur + vélo (kg)
function physV(P, g, kg){
  const th = Math.atan(g / 100), F = kg * 9.81 * (Math.sin(th) + .005 * Math.cos(th)); let lo = .05, hi = 30;
  for(let i = 0; i < 45; i++){ const v = (lo + hi) / 2; if(F * v + .5 * 1.15 * .38 * v * v * v > P) hi = v; else lo = v; }
  return (lo + hi) / 2;
}
function colV(wkg, g){ return physV(wkg * 75, g, 83); } // coureur de référence 75 kg + vélo 8 kg
// Poids du coureur (Réglages > Lecteur) ; vide = poids du profil intervals.icu, sinon 75 kg ; vélo 8 kg ajouté
function riderKg(){ const v = parseFloat(String(store.get("si_rider_kg")).replace(",", ".")); if(v >= 30 && v <= 200) return v; return ICU.weight >= 30 && ICU.weight <= 200 ? ICU.weight : 75; }
function totalKg(){ return riderKg() + 8; }
// Vitesse (m/s) sur une étape en pente : à l'arrêt de pédalage la distance n'avance plus (sauf en descente, où l'on continue de rouler)
function runSpeed(P, g){ return (P > 5 || g < -1) ? physV(Math.max(0, P), g || 0, totalKg()) : 0; }
function distTxt(m){ m = Math.round(m); return m % 1000 === 0 ? (m / 1000) + "km" : m + "mtr"; } // syntaxe intervals.icu (« m » = minutes)
function fmtDistShort(m){ return m >= 1000 ? (m / 1000).toFixed(2) + " km" : Math.max(0, Math.ceil(m)) + " m"; }
function colMake(c){
  let segs = c.segs;
  if(!segs){ // profil kilomètre par kilomètre, recalé sur la pente moyenne officielle, regroupé par blocs de c.blk km
    const raw = c.raw, lens = raw.map((_, i) => Math.min(1, c.km - i)), f = c.avg * c.km / raw.reduce((a, g, i) => a + g * lens[i], 0), blk = c.blk || 1; segs = [];
    for(let i = 0; i < raw.length; i += blk){ let L = 0, G = 0; for(let j = i; j < Math.min(raw.length, i + blk); j++){ L += lens[j]; G += raw[j] * f * lens[j]; } segs.push([L, G / L]); }
  }
  const lines = [], g = [null], ne = ["Warm-up"], nf = ["Échauffement"]; let at = 0;
  segs.forEach(([L, gr]) => {
    const pct = gr < -1 ? 40 : gr < 1.5 ? 60 : Math.round(c.ifp * 100), a = at.toFixed(1), b = (at + L).toFixed(1); at += L;
    const g1 = Math.round(gr * 10) / 10; lines.push("- " + distTxt(L * 1000) + " " + pct + "% slope " + g1.toFixed(1) + " pct"); g.push(g1);
    ne.push("Km " + a + "–" + b + " · " + gr.toFixed(1) + "%"); nf.push("Km " + a.replace(".", ",") + "–" + b.replace(".", ",") + " · " + gr.toFixed(1).replace(".", ",") + " %");
  });
  g.push(null); ne.push("Cool-down"); nf.push("Retour au calme");
  const en = "Warmup\n- 10m 55%\n\nMain set\n" + lines.join("\n") + "\n\nCooldown\n- 5m 50%";
  const km1 = c.km.toFixed(1), kf = km1.replace(".", ","), av = c.avg.toFixed(1), avf = av.replace(".", ",");
  return {category: "cols", sport: "VirtualRide", name_en: c.en + " — " + c.from_en + " (" + km1 + " km · " + av + "%)", name_fr: c.en + " — " + c.from_fr + " (" + kf + " km · " + avf + " %)",
    desc_en: en, desc_fr: en.replace(/Warmup/g, "Échauffement").replace(/Main set/g, "Série principale").replace(/Cooldown/g, "Retour au calme").replace(/slope (-?)(\d+)\.(\d) pct/g, "pente $1$2,$3 pct"),
    expl_en: km1 + " km at " + av + " % average, about " + c.gain.toLocaleString("en") + " m of climbing. In the player the trainer is set to the slope of each section (no ERG) and each section ends when its distance is covered, computed from your power and weight; warm-up and cool-down stay in ERG.",
    expl_fr: kf + " km à " + avf + " % de moyenne, environ " + c.gain.toLocaleString("fr") + " m de dénivelé. Dans le lecteur, le home trainer reçoit la pente de chaque tronçon (pas d'ERG) et chaque tronçon se termine quand sa distance est parcourue, calculée d'après ta puissance et ton poids ; l'échauffement et le retour au calme restent en ERG.",
    climb: {g, ne, nf}};
}
[
  {en: "Alpe d'Huez", from_en: "from Le Bourg-d'Oisans", from_fr: "depuis Le Bourg-d'Oisans", km: 13.8, avg: 8.1, gain: 1120, ifp: .85, blk: 1, raw: [10.2, 10.3, 9.3, 9.5, 10.1, 9.5, 8.4, 8.0, 7.7, 7.2, 7.1, 6.3, 5.8, 5.0]},
  {en: "Mont Ventoux", from_en: "from Bédoin", from_fr: "depuis Bédoin", km: 21.6, avg: 7.5, gain: 1617, ifp: .78, blk: 2, raw: [2.2, 3.8, 4.8, 5.8, 5.4, 8.2, 9.5, 9.8, 9.4, 9.6, 9.5, 9.3, 9.6, 9.5, 9.2, 8.6, 7.0, 7.8, 7.5, 7.9, 7.6, 7.4]},
  {en: "Col du Tourmalet", from_en: "from Luz-Saint-Sauveur", from_fr: "depuis Luz-Saint-Sauveur", km: 18.8, avg: 7.4, gain: 1390, ifp: .8, blk: 2, raw: [4.5, 5.5, 6.0, 7.0, 7.5, 7.5, 7.8, 7.5, 7.8, 8.0, 8.0, 7.8, 7.5, 8.0, 8.5, 8.5, 9.0, 8.8, 8.0]},
  {en: "Col d'Aubisque", from_en: "from Laruns", from_fr: "depuis Laruns", km: 16.6, avg: 7.1, gain: 1180, ifp: .78, blk: 2, raw: [4.5, 6.0, 7.0, 7.5, 8.0, 8.5, 8.5, 8.0, 8.0, 7.5, 7.5, 8.0, 8.5, 8.0, 6.5, 4.0, 2.5]},
  {en: "Col de la Madeleine", from_en: "from La Chambre", from_fr: "depuis La Chambre", km: 19.2, avg: 7.9, gain: 1520, ifp: .8, blk: 2, raw: [7.5, 8.5, 9.0, 8.5, 8.0, 8.0, 8.0, 7.5, 7.5, 8.0, 8.0, 7.5, 7.5, 7.5, 8.0, 8.5, 8.5, 8.0, 7.5, 6.5]},
  {en: "Col de Joux Plane", from_en: "from Samoëns", from_fr: "depuis Samoëns", km: 11.6, avg: 8.5, gain: 985, ifp: .88, blk: 1, raw: [8.0, 8.5, 9.0, 8.5, 8.0, 8.5, 9.5, 9.0, 8.5, 8.0, 7.5, 8.5]},
  {en: "Col du Galibier", from_en: "from Saint-Michel-de-Maurienne", from_fr: "depuis Saint-Michel-de-Maurienne", km: 34.8, avg: 5.5, gain: 1930, ifp: .7,
   segs: [[12, 7.1], [2.5, -5.4], [2.6, .5], [2, 5.5], [3, 6.5], [3, 7.0], [3, 7.3], [2.5, 8.0], [2, 8.2], [2.2, 5.8]]}
].forEach(c => { const w = colMake(c); w.id = w.name_en; LIBRARY.push(w); });
// Cols supplémentaires (Alpes, Pyrénées, Italie) : distance, pente moyenne et dénivelé d'après les fiches usuelles (cols-cyclisme, climbfinder, ASO, Wikipédia) ; profil km par km indicatif, recalé sur la moyenne.
[
  {en: "Col de la Ramaz", from_en: "from Mieussy", from_fr: "depuis Mieussy", km: 13.9, avg: 7.1, gain: 986, ifp: 0.86, blk: 1, raw: [7.5, 7.8, 8.0, 7.0, 8.0, 8.0, 3.0, 6.0, 7.0, 7.5, 7.5, 8.0, 9.0, 11.5]},
  {en: "Col de la Colombière", from_en: "from Scionzier (Cluses)", from_fr: "depuis Scionzier (Cluses)", km: 16.3, avg: 6.8, gain: 1108, ifp: 0.82, blk: 2, raw: [3, 3.5, 5, 8, 8, 6.5, 4.5, 4.5, 5, 5.5, 8.5, 9, 9, 9.5, 9, 9.5, 10]},
  {en: "Col du Télégraphe", from_en: "from Saint-Michel-de-Maurienne", from_fr: "depuis Saint-Michel-de-Maurienne", km: 11.9, avg: 7.1, gain: 848, ifp: 0.86, blk: 1, raw: [9.0, 8.0, 7.5, 7.0, 7.2, 7.0, 7.5, 7.0, 6.8, 7.0, 6.5, 6.0]},
  {en: "Col du Galibier", from_en: "from Valloire", from_fr: "depuis Valloire", km: 18.1, avg: 6.9, gain: 1245, ifp: 0.78, blk: 2, raw: [6.0, 5.5, 5.8, 6.0, 5.5, 6.2, 6.5, 6.0, 6.8, 7.0, 7.5, 7.8, 8.0, 8.0, 8.2, 8.5, 9.0, 9.0, 9.0]},
  {en: "Col de la Croix de Fer", from_en: "from Saint-Étienne-de-Cuines", from_fr: "depuis Saint-Étienne-de-Cuines", km: 22.8, avg: 6.9, gain: 1582, ifp: 0.75, blk: 2, raw: [5.5, 6.0, 6.5, 5.5, 6.0, 6.5, 5.5, 6.0, 6.5, 6.0, 7.5, 8.0, 8.5, 9.0, 8.5, 8.0, 8.5, 9.5, 9.0, 8.0, 7.5, 7.5, 7.0]},
  {en: "Col de la Loze", from_en: "from Brides-les-Bains via Méribel", from_fr: "depuis Brides-les-Bains par Méribel", km: 21.6, avg: 7.7, gain: 1653, ifp: 0.78, blk: 2, raw: [6.0, 5.5, 5.8, 6.0, 5.2, 5.6, 5.8, 5.4, 7.0, 7.5, 6.5, 7.5, 7.0, 7.8, 7.0, 9.0, 9.5, 11.0, 8.5, 10.5, 12.0, 13.0]},
  {en: "Col d'Izoard", from_en: "from Briançon", from_fr: "depuis Briançon", km: 19.1, avg: 6.1, gain: 1174, ifp: 0.8, blk: 2, raw: [5.0, 4.5, 5.0, 5.5, 5.5, 6.0, 6.5, 5.5, 6.0, 6.5, 6.0, 6.0, 7.0, 6.5, 6.0, 6.5, 7.5, 8.0, 9.0, 8.5]},
  {en: "Col du Grand Colombier", from_en: "from Culoz", from_fr: "depuis Culoz", km: 17.7, avg: 7.2, gain: 1273, ifp: 0.82, blk: 2, raw: [8.5, 9.5, 10.0, 10.5, 10.0, 9.0, 9.5, 9.5, 9.0, 3.5, 2.5, 4.5, 3.0, 5.0, 6.5, 7.5, 8.0, 7.5]},
  {en: "Col du Tourmalet", from_en: "from Sainte-Marie-de-Campan", from_fr: "depuis Sainte-Marie-de-Campan", km: 17.2, avg: 7.4, gain: 1268, ifp: 0.8, blk: 2, raw: [2.0, 3.0, 4.0, 5.5, 7.0, 7.5, 7.8, 7.5, 7.8, 8.0, 8.5, 8.0, 7.5, 7.8, 8.5, 8.5, 9.5, 10.0]},
  {en: "Col d'Aspin", from_en: "from Arreau", from_fr: "depuis Arreau", km: 12.0, avg: 6.5, gain: 779, ifp: 0.86, blk: 1, raw: [6.0, 6.5, 6.5, 6.0, 6.5, 7.0, 6.5, 7.0, 6.5, 6.5, 6.5, 6.5]},
  {en: "Col de Peyresourde", from_en: "from Bagnères-de-Luchon", from_fr: "depuis Bagnères-de-Luchon", km: 15.3, avg: 6.1, gain: 939, ifp: 0.84, blk: 2, raw: [3.0, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 7.5, 7.5, 8.0, 8.0, 7.5, 7.0, 6.5]},
  {en: "Port de Balès", from_en: "from Mauléon-Barousse", from_fr: "depuis Mauléon-Barousse", km: 19.3, avg: 6.5, gain: 1250, ifp: 0.8, blk: 2, raw: [4.5, 5.5, 5.5, 6.0, 6.5, 6.5, 7.0, 6.5, 6.0, 7.0, 7.5, 6.5, 5.0, 6.5, 7.5, 8.0, 8.5, 8.5, 9.0, 9.5]},
  {en: "Plateau de Beille", from_en: "from Les Cabannes", from_fr: "depuis Les Cabannes", km: 15.8, avg: 7.9, gain: 1255, ifp: 0.82, blk: 2, raw: [10.5, 8.5, 8.5, 7.5, 8.0, 8.5, 8.0, 8.0, 7.5, 8.0, 8.0, 8.0, 7.5, 7.5, 6.5, 5.0]},
  {en: "Passo dello Stelvio", from_en: "from Prato allo Stelvio", from_fr: "depuis Prato allo Stelvio", km: 24.3, avg: 7.4, gain: 1808, ifp: 0.72, blk: 2, raw: [4.5, 5.0, 6.0, 6.5, 7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 7.0, 7.5, 7.5, 7.5, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 7.0]},
  {en: "Passo del Mortirolo", from_en: "from Mazzo di Valtellina", from_fr: "depuis Mazzo di Valtellina", km: 12.4, avg: 10.5, gain: 1300, ifp: 0.88, blk: 1, raw: [9.0, 10.0, 12.0, 13.5, 14.5, 12.5, 9.0, 8.5, 10.5, 10.5, 11.0, 11.0, 8.0]},
  {en: "Monte Zoncolan", from_en: "from Ovaro", from_fr: "depuis Ovaro", km: 10.1, avg: 11.9, gain: 1210, ifp: 0.88, blk: 1, raw: [9.5, 10.5, 12.5, 12.5, 13.5, 12.5, 11.5, 12.5, 11.5, 10.5, 9.0]}
].forEach(c => { const w = colMake(c); w.id = w.name_en; LIBRARY.push(w); });
// cache mémoire = source de vérité ; localStorage peut être indisponible (sandbox), store.set ignore silencieusement les échecs
let starList = (() => { try{ const a = JSON.parse(store.get("si_stars") || "[]"); return Array.isArray(a) ? a : []; }catch(e){ return []; } })();
const stars = () => starList;
function setStars(a){ starList = Array.isArray(a) ? a.slice() : []; store.set("si_stars", JSON.stringify(starList)); }
function toggleStar(id){ const a = stars().slice(); const i = a.indexOf(id); if(i >= 0) a.splice(i, 1); else a.push(id); setStars(a); }

