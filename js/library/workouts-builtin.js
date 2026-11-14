/* FlameCadence - Built-in workout library (extraWorkout and its templates) */
// ---------- Bibliothèque de séances ----------
const LIBRARY = [
  {
    name_en: "Sweet Spot 3 x 10 min", name_fr: "Sweet Spot 3 x 10 min",
    desc_en: "Warmup\n- 10m 50%\n- 5m 65%\n\nMain set 3x\n- 10m 90%\n- 5m 55%\n\nCooldown\n- 10m 50%",
    desc_fr: "Échauffement\n- 10m 50%\n- 5m 65%\n\nSérie 3x\n- 10m 90%\n- 5m 55%\n\nRetour au calme\n- 10m 50%",
    sport: "Ride",
    expl_en: "Develops aerobic power and muscular endurance efficiently without excessive fatigue.",
    expl_fr: "Développe efficacement la puissance aérobie et l'endurance musculaire sans fatigue excessive."
  },
  {
    name_en: "Threshold Over-Unders 4 x 8 min", name_fr: "Over-Unders au seuil 4 x 8 min",
    desc_en: "Warmup\n- 10m 50%\n- 5m 70%\n\nMain set 4x\n- 2m 102%\n- 2m 90%\n- 2m 102%\n- 2m 90%\n- 4m 55%\n\nCooldown\n- 10m 50%",
    desc_fr: "Échauffement\n- 10m 50%\n- 5m 70%\n\nSérie 4x\n- 2m 102%\n- 2m 90%\n- 2m 102%\n- 2m 90%\n- 4m 55%\n\nRetour au calme\n- 10m 50%",
    sport: "Ride",
    expl_en: "Trains your body to clear lactate efficiently under high workloads around FTP.",
    expl_fr: "Entraîne l'organisme à éliminer efficacement le lactate sous forte charge autour du seuil."
  },
  {
    name_en: "VO2max Intervals 5 x 3 min", name_fr: "Intervalles VO2max 5 x 3 min",
    desc_en: "Warmup\n- 10m 50%\n- 5m 70%\n- 3x 30s 115%\n- 2m 50%\n\nMain set 5x\n- 3m 112%\n- 3m 55%\n\nCooldown\n- 10m 50%",
    desc_fr: "Échauffement\n- 10m 50%\n- 5m 70%\n- 3x 30s 115%\n- 2m 50%\n\nSérie 5x\n- 3m 112%\n- 3m 55%\n\nRetour au calme\n- 10m 50%",
    sport: "Ride",
    expl_en: "Increases maximal oxygen uptake (VO2max) and high-intensity tolerance.",
    expl_fr: "Augmente la consommation maximale d'oxygène (VO2max) et la tolérance aux efforts intenses."
  },
  {
    name_en: "Endurance Zone 2 (1h30)", name_fr: "Endurance Zone 2 (1h30)",
    desc_en: "Warmup\n- 15m 55%\n\nMain set\n- 1h00 68%\n\nCooldown\n- 15m 50%",
    desc_fr: "Échauffement\n- 15m 55%\n\nSérie\n- 1h00 68%\n\nRetour au calme\n- 15m 50%",
    sport: "Ride",
    expl_en: "Builds solid aerobic base and fat oxidation capacity with steady aerobic rhythm.",
    expl_fr: "Construit une solide base aérobie et stimule l'oxydation des graisses en régime stable."
  },
  {
    name_en: "Ramp to the Redline", name_fr: "Montée progressive au seuil",
    desc_en: "Warmup\n- 10m 50%\n- 5m 65%\n\nMain set\n- 8m 75%\n- 8m 85%\n- 8m 95%\n- 5m 55%\n\nRepeat 2x\n- 3m 105%\n- 3m 55%\n\nCooldown\n- 10m 50%",
    desc_fr: "Échauffement\n- 10m 50%\n- 5m 65%\n\nSérie principale\n- 8m 75%\n- 8m 85%\n- 8m 95%\n- 5m 55%\n\nRépéter 2x\n- 3m 105%\n- 3m 55%\n\nRetour au calme\n- 10m 50%",
    sport: "Ride", expl_en: "A progressive session that builds toward threshold, then adds a controlled high-intensity finish.", expl_fr: "Une séance progressive jusqu'au seuil, suivie d'une fin intense mais maîtrisée."
  },
  {
    name_en: "Punchy 30/30s", name_fr: "Explosivité 30/30",
    desc_en: "Warmup\n- 12m 50%\n- 4m 65%\n\nMain set 2x\n- 8x 30s 120%\n- 30s 50%\n- 5m 55%\n\nCooldown\n- 10m 50%",
    desc_fr: "Échauffement\n- 12m 50%\n- 4m 65%\n\nSérie 2x\n- 8x 30s 120%\n- 30s 50%\n- 5m 55%\n\nRetour au calme\n- 10m 50%",
    sport: "Ride", expl_en: "Repeated short surges train aerobic power and the ability to recover between hard efforts.", expl_fr: "Des accélérations courtes répétées développent la puissance aérobie et la récupération entre efforts."
  },
  {
    name_en: "Tempo Builder 3 x 12 min", name_fr: "Tempo 3 x 12 min",
    desc_en: "Warmup\n- 12m 50%\n- 5m 65%\n\nMain set 3x\n- 12m 82%\n- 4m 55%\n\nCooldown\n- 10m 50%",
    desc_fr: "Échauffement\n- 12m 50%\n- 5m 65%\n\nSérie 3x\n- 12m 82%\n- 4m 55%\n\nRetour au calme\n- 10m 50%",
    sport: "Ride", expl_en: "Improves sustainable tempo power with manageable recovery between blocks.", expl_fr: "Améliore la puissance soutenable au tempo avec une récupération maîtrisée entre les blocs."
  },
  {
    name_en: "Cadence Surge 6 x 2 min", name_fr: "Cadence élevée 6 x 2 min",
    desc_en: "Warmup\n- 10m 50%\n- 5m 65%\n\nMain set 6x\n- 2m 100%\n- 3m 55%\n\nCooldown\n- 10m 50%",
    desc_fr: "Échauffement\n- 10m 50%\n- 5m 65%\n\nSérie 6x\n- 2m 100%\n- 3m 55%\n\nRetour au calme\n- 10m 50%",
    sport: "Ride", expl_en: "Short controlled efforts pair well with a quick, smooth cadence focus.", expl_fr: "Des efforts courts et contrôlés à associer à une cadence rapide et fluide."
  },
  {
    name_en: "Recovery Spin (40 min)", name_fr: "Vélo récupération (40 min)",
    desc_en: "Warmup\n- 8m 45%\n\nMain set\n- 24m 55%\n\nCooldown\n- 8m 45%",
    desc_fr: "Échauffement\n- 8m 45%\n\nSérie\n- 24m 55%\n\nRetour au calme\n- 8m 45%",
    sport: "Ride", expl_en: "A gentle spin to keep the legs moving without adding much training stress.", expl_fr: "Un pédalage facile pour faire tourner les jambes sans ajouter beaucoup de fatigue."
  },
  {
    name_en: "Sprint Sparks 8 x 15 sec", name_fr: "Sprints explosifs 8 x 15 s",
    desc_en: "Warmup\n- 12m 50%\n- 5m 65%\n\nMain set 8x\n- 15s 150%\n- 2m45 50%\n\nCooldown\n- 10m 50%",
    desc_fr: "Échauffement\n- 12m 50%\n- 5m 65%\n\nSérie 8x\n- 15s 150%\n- 2m45 50%\n\nRetour au calme\n- 10m 50%",
    sport: "Ride", expl_en: "Develops explosive acceleration with generous recovery to keep each sprint sharp.", expl_fr: "Développe l'accélération explosive avec une récupération longue pour garder chaque sprint puissant."
  }
  ,{
    name_en:"Aerobic Foundation (75 min)",name_fr:"Fondations aérobie (75 min)",sport:"Ride",
    desc_en:"Warmup\n- 10m 50%\n\nMain set\n- 55m 68%\n\nCooldown\n- 10m 50%",desc_fr:"Échauffement\n- 10m 50%\n\nSérie principale\n- 55m 68%\n\nRetour au calme\n- 10m 50%",
    expl_en:"A steady aerobic ride to build endurance with low fatigue.",expl_fr:"Une sortie aérobie régulière pour développer l'endurance avec peu de fatigue."
  },{
    name_en:"Threshold Blocks 3 x 10 min",name_fr:"Blocs au seuil 3 x 10 min",sport:"Ride",
    desc_en:"Warmup\n- 12m 50%\n- 5m 70%\n\nMain set 3x\n- 10m 98%\n- 5m 55%\n\nCooldown\n- 10m 50%",desc_fr:"Échauffement\n- 12m 50%\n- 5m 70%\n\nSérie 3x\n- 10m 98%\n- 5m 55%\n\nRetour au calme\n- 10m 50%",
    expl_en:"Builds the ability to sustain strong, controlled threshold efforts.",expl_fr:"Développe la capacité à maintenir des efforts soutenus au seuil."
  },{
    name_en:"VO2max 6 x 2 min",name_fr:"VO2max 6 x 2 min",sport:"Ride",
    desc_en:"Warmup\n- 12m 50%\n- 5m 70%\n\nMain set 6x\n- 2m 115%\n- 3m 55%\n\nCooldown\n- 10m 50%",desc_fr:"Échauffement\n- 12m 50%\n- 5m 70%\n\nSérie 6x\n- 2m 115%\n- 3m 55%\n\nRetour au calme\n- 10m 50%",
    expl_en:"Short high-intensity intervals target aerobic power and repeatability.",expl_fr:"Des intervalles intenses et courts ciblent la puissance aérobie et la répétition des efforts."
  },{
    name_en:"Endurance + Fast Finish (90 min)",name_fr:"Endurance avec finish rapide (90 min)",sport:"Ride",
    desc_en:"Warmup\n- 10m 50%\n\nMain set\n- 60m 68%\n- 10m 82%\n\nCooldown\n- 10m 50%",desc_fr:"Échauffement\n- 10m 50%\n\nSérie principale\n- 60m 68%\n- 10m 82%\n\nRetour au calme\n- 10m 50%",
    expl_en:"Adds a controlled tempo finish after a long aerobic block.",expl_fr:"Ajoute une fin au tempo maîtrisée après un long bloc aérobie."
  },{
    name_en:"Recovery Reset (30 min)",name_fr:"Récupération douce (30 min)",sport:"Ride",
    desc_en:"Warmup\n- 5m 45%\n\nMain set\n- 20m 52%\n\nCooldown\n- 5m 45%",desc_fr:"Échauffement\n- 5m 45%\n\nSérie principale\n- 20m 52%\n\nRetour au calme\n- 5m 45%",
    expl_en:"Very easy movement for recovery days and tired legs.",expl_fr:"Un effort très facile pour les jours de récupération et les jambes fatiguées."
  },{
    name_en:"Cadence Ladder",name_fr:"Échelle de cadence",sport:"Ride",
    desc_en:"Warmup\n- 10m 50%\n\nMain set\n- 3m 65%\n- 3m 70%\n- 3m 75%\n- 3m 80%\n- 3m 75%\n- 3m 70%\n\nCooldown\n- 8m 50%",desc_fr:"Échauffement\n- 10m 50%\n\nSérie principale\n- 3m 65%\n- 3m 70%\n- 3m 75%\n- 3m 80%\n- 3m 75%\n- 3m 70%\n\nRetour au calme\n- 8m 50%",
    expl_en:"A smooth progression to practice cadence changes without maximal effort.",expl_fr:"Une progression fluide pour travailler les changements de cadence sans effort maximal."
  },{
    name_en:"Over-Under Progression 3 x 9 min",name_fr:"Progression over-under 3 x 9 min",sport:"Ride",
    desc_en:"Warmup\n- 12m 50%\n- 5m 70%\n\nMain set 3x\n- 3m 88%\n- 3m 103%\n- 3m 92%\n- 4m 55%\n\nCooldown\n- 10m 50%",desc_fr:"Échauffement\n- 12m 50%\n- 5m 70%\n\nSérie 3x\n- 3m 88%\n- 3m 103%\n- 3m 92%\n- 4m 55%\n\nRetour au calme\n- 10m 50%",
    expl_en:"Alternates just below and above threshold to improve control under fatigue.",expl_fr:"Alterner sous et au-dessus du seuil améliore le contrôle sous fatigue."
  },{
    name_en:"Sprint Technique 10 x 10 sec",name_fr:"Technique sprint 10 x 10 s",sport:"Ride",
    desc_en:"Warmup\n- 15m 50%\n- 5m 65%\n\nMain set 10x\n- 10s 150%\n- 2m 50%\n\nCooldown\n- 10m 50%",desc_fr:"Échauffement\n- 15m 50%\n- 5m 65%\n\nSérie 10x\n- 10s 150%\n- 2m 50%\n\nRetour au calme\n- 10m 50%",
    expl_en:"Brief accelerations with ample recovery to keep technique and power crisp.",expl_fr:"De brèves accélérations avec beaucoup de récupération pour préserver la technique et la puissance."
  }

];

// Original FlameCadence sessions organized around MyWhoosh's published workout themes.
function extraWorkout(category, name_en, name_fr, desc_en, expl_en, expl_fr){
 const desc_fr=desc_en.replace(/Warmup/g,"Échauffement").replace(/Main set/g,"Série principale").replace(/Cooldown/g,"Retour au calme");
 return {category,name_en,name_fr,sport:"Ride",desc_en,desc_fr,expl_en,expl_fr};
}
LIBRARY.push(
 extraWorkout("beginner", "Beginner — Stepped Intervals", "Débutant — Intervalles progressifs", "Warmup\n- 8m 50%\n\nMain set\n- 4m 60%\n- 4m 65%\n- 4m 70%\n- 4m 65%\n- 4m 60%\n\nCooldown\n- 6m 50%", "Gentle introduction to changing power targets.", "Introduction douce aux variations de puissance."),
 extraWorkout("beginner", "Beginner — First Tempo Blocks", "Débutant — Premiers blocs tempo", "Warmup\n- 8m 50%\n- 4m 60%\n\nMain set 3x\n- 4m 72%\n- 3m 55%\n\nCooldown\n- 6m 50%", "Manageable tempo intervals with simple recoveries.", "Intervalles tempo accessibles avec récupérations simples."),
 extraWorkout("beginner", "Beginner — Endurance Builder (45 min)", "Débutant — Endurance (45 min)", "Warmup\n- 7m 50%\n\nMain set\n- 31m 62%\n\nCooldown\n- 7m 50%", "Steady aerobic ride for newer structured-training riders.", "Sortie aérobie régulière pour débuter l’entraînement structuré."),
 extraWorkout("short", "Under 35 Min — Lunch Break Spin", "Moins de 35 min — Pause déjeuner", "Warmup\n- 5m 50%\n\nMain set\n- 20m 65%\n\nCooldown\n- 5m 50%", "Low-stress ride when time is limited.", "Sortie facile quand le temps est limité."),
 extraWorkout("short", "Under 35 Min — Quick Tempo", "Moins de 35 min — Tempo rapide", "Warmup\n- 5m 50%\n- 3m 65%\n\nMain set 3x\n- 4m 82%\n- 2m 55%\n\nCooldown\n- 4m 50%", "Compact tempo workout with controlled recoveries.", "Séance tempo compacte avec récupérations maîtrisées."),
 extraWorkout("short", "Under 35 Min — 40/20 Primer", "Moins de 35 min — Préparation 40/20", "Warmup\n- 7m 50%\n- 3m 65%\n\nMain set 2x\n- 5x 40s 115%\n- 20s 50%\n- 3m 55%\n\nCooldown\n- 5m 50%", "Short on/off efforts in a time-efficient session.", "Des efforts courts alternés dans une séance efficace."),
 extraWorkout("fast", "Fast Fitness — 30/15 Repeats", "Fitness rapide — Répétitions 30/15", "Warmup\n- 10m 50%\n- 4m 70%\n\nMain set 3x\n- 6x 30s 125%\n- 15s 50%\n- 3m 55%\n\nCooldown\n- 8m 50%", "Demanding HIIT based on repeated short surges.", "HIIT exigeant basé sur de courtes accélérations répétées."),
 extraWorkout("fast", "Fast Fitness — Power Pop", "Fitness rapide — Explosions de puissance", "Warmup\n- 10m 50%\n- 4m 65%\n\nMain set 2x\n- 1m 120%\n- 2m 55%\n- 2m 105%\n- 3m 55%\n- 3m 95%\n- 4m 55%\n\nCooldown\n- 8m 50%", "Hard efforts train repeatability under fatigue.", "Des efforts difficiles entraînent la répétition malgré la fatigue."),
 extraWorkout("testing", "Testing — FTP Ramp Prep", "Test — Préparation rampe FTP", "Warmup\n- 10m 50%\n- 5m 65%\n- 3m 75%\n- 2m 85%\n\nMain set\n- 3m 55%\n- 5m 70%\n\nCooldown\n- 8m 50%", "Preparation before a separate FTP test; not a test itself.", "Préparation avant un test FTP séparé ; ce n’est pas un test."),
 extraWorkout("testing", "Testing — 3-Minute Power Check", "Test — Vérification puissance 3 min", "Warmup\n- 12m 50%\n- 4m 65%\n- 3x 20s 110%\n- 1m40 50%\n\nMain set\n- 3m 120%\n- 8m 50%\n\nCooldown\n- 8m 50%", "Hard three-minute benchmark; do it rested and treat targets as guides.", "Repère intense de trois minutes ; à réaliser reposé, cibles indicatives."),
 extraWorkout("anaerobic", "Anaerobic — 1-Minute Repeats", "Anaérobie — Répétitions d’une minute", "Warmup\n- 12m 50%\n- 4m 70%\n\nMain set 5x\n- 1m 130%\n- 3m 50%\n\nCooldown\n- 10m 50%", "Repeatable high-power efforts with easy recoveries.", "Efforts puissants répétés avec récupérations faciles."),
 extraWorkout("anaerobic", "Anaerobic — Surge and Settle", "Anaérobie — Accélérer puis stabiliser", "Warmup\n- 12m 50%\n- 5m 70%\n\nMain set 3x\n- 45s 140%\n- 2m15 55%\n- 3m 95%\n- 4m 55%\n\nCooldown\n- 8m 50%", "Short surges followed by steady work.", "Courtes accélérations suivies d’un effort régulier."),
 extraWorkout("endurance", "Endurance — Long Base (2 h)", "Endurance — Base longue (2 h)", "Warmup\n- 15m 55%\n\nMain set\n- 90m 68%\n- 5m 75%\n\nCooldown\n- 10m 50%", "Long aerobic ride; fuel and hydrate appropriately.", "Longue sortie aérobie ; penser à s’alimenter et s’hydrater."),
 extraWorkout("endurance", "Endurance — Aerobic Waves", "Endurance — Vagues aérobies", "Warmup\n- 12m 50%\n\nMain set 4x\n- 10m 68%\n- 5m 75%\n\nCooldown\n- 10m 50%", "Small load changes add variety to a steady endurance ride.", "De petites variations de charge rythment la sortie d’endurance."),
 extraWorkout("sprint", "Sprint — 6 x 12 Seconds", "Sprint — 6 x 12 secondes", "Warmup\n- 15m 50%\n- 5m 65%\n- 3x 10s 120%\n- 2m 50%\n\nMain set 6x\n- 12s 160%\n- 2m48 50%\n\nCooldown\n- 10m 50%", "Very short accelerations with generous recovery; keep each crisp.", "Accélérations très courtes et récupération généreuse ; privilégier la qualité."),
 extraWorkout("sprint", "Sprint — Rolling Starts", "Sprint — Départs lancés", "Warmup\n- 15m 50%\n- 5m 65%\n\nMain set 5x\n- 20s 145%\n- 2m40 50%\n\nCooldown\n- 10m 50%", "Practise launching hard from a rolling pace.", "Travaille les départs puissants en roulant."),
 extraWorkout("sweetspot", "Sweet Spot — 4 x 8 min", "Sweet Spot — 4 x 8 min", "Warmup\n- 12m 50%\n- 5m 70%\n\nMain set 4x\n- 8m 90%\n- 3m 55%\n\nCooldown\n- 10m 50%", "Time-efficient sweet spot for aerobic power and muscular endurance.", "Sweet spot efficace pour la puissance aérobie et l’endurance musculaire."),
 extraWorkout("sweetspot", "Sweet Spot — Long Blocks 2 x 20", "Sweet Spot — Blocs longs 2 x 20", "Warmup\n- 15m 50%\n- 5m 70%\n\nMain set 2x\n- 20m 88%\n- 5m 55%\n\nCooldown\n- 10m 50%", "Long controlled blocks build sustained power below threshold.", "De longs blocs maîtrisés développent la puissance soutenue sous le seuil."),
 extraWorkout("taper", "Taper — Openers (40 min)", "Affûtage — Réveils musculaires (40 min)", "Warmup\n- 10m 50%\n\nMain set\n- 3m 75%\n- 3x 30s 115%\n- 2m30 50%\n- 3m 85%\n\nCooldown\n- 8m 50%", "Short pre-event opener to keep legs lively without much load.", "Courte activation avant événement sans forte charge."),
 extraWorkout("taper", "Taper — Race-Eve Spin", "Affûtage — Veille de course", "Warmup\n- 8m 50%\n\nMain set\n- 12m 60%\n- 3x 15s 130%\n- 2m45 50%\n- 5m 60%\n\nCooldown\n- 5m 50%", "Very light spin with a few brief openers.", "Sortie très légère avec quelques accélérations brèves."),
 extraWorkout("tempo", "Tempo — 2 x 20 min", "Tempo — 2 x 20 min", "Warmup\n- 12m 50%\n- 5m 65%\n\nMain set 2x\n- 20m 82%\n- 5m 55%\n\nCooldown\n- 10m 50%", "Builds durable tempo power and pacing discipline.", "Développe la puissance tempo durable et la régularité."),
 extraWorkout("tempo", "Tempo — Progressive Finish", "Tempo — Fin progressive", "Warmup\n- 12m 50%\n\nMain set\n- 20m 65%\n- 10m 75%\n- 10m 82%\n- 5m 88%\n\nCooldown\n- 8m 50%", "Practise finishing a longer ride with control.", "Apprend à finir une sortie longue avec maîtrise."),
 extraWorkout("threshold", "Threshold — 4 x 6 min", "Seuil — 4 x 6 min", "Warmup\n- 12m 50%\n- 5m 70%\n\nMain set 4x\n- 6m 100%\n- 3m 55%\n\nCooldown\n- 10m 50%", "Sustained power around threshold with manageable intervals.", "Puissance soutenue autour du seuil avec intervalles accessibles."),
 extraWorkout("threshold", "Threshold — Over-Under Waves", "Seuil — Vagues over-under", "Warmup\n- 12m 50%\n- 5m 70%\n\nMain set 3x\n- 2m 95%\n- 1m 105%\n- 2m 95%\n- 1m 105%\n- 4m 55%\n\nCooldown\n- 10m 50%", "Alternating below and above threshold trains changes of pace.", "Alterner sous et au-dessus du seuil entraîne les changements de rythme."),
 extraWorkout("uae", "UAE Team Emirates Style — Climb Simulation", "Style UAE Team Emirates — Simulation de montée", "Warmup\n- 15m 50%\n- 5m 70%\n\nMain set\n- 8m 85%\n- 8m 92%\n- 6m 98%\n- 5m 55%\n- 4m 105%\n\nCooldown\n- 10m 50%", "Original climbing session inspired by the team category, not an official team workout.", "Séance originale axée montée, inspirée de la catégorie, non officielle."),
 extraWorkout("uae", "UAE Team Emirates Style — Race Surges", "Style UAE Team Emirates — Accélérations de course", "Warmup\n- 12m 50%\n- 5m 70%\n\nMain set 4x\n- 3m 90%\n- 30s 125%\n- 3m30 55%\n\nCooldown\n- 10m 50%", "Original FlameCadence session with race-style surges.", "Séance FlameCadence originale avec accélérations de course."),
 extraWorkout("adq", "UAE Team ADQ Style — Cadence and Tempo", "Style UAE Team ADQ — Cadence et tempo", "Warmup\n- 10m 50%\n- 5m 65%\n\nMain set 3x\n- 6m 82%\n- 2m 95%\n- 4m 55%\n\nCooldown\n- 8m 50%", "Original tempo-and-cadence session, not an official team workout.", "Séance tempo-cadence originale, non officielle."),
 extraWorkout("adq", "UAE Team ADQ Style — Short Race Prep", "Style UAE Team ADQ — Prépa course courte", "Warmup\n- 12m 50%\n- 4m 70%\n\nMain set 5x\n- 1m 110%\n- 3m 55%\n\nCooldown\n- 8m 50%", "Original compact race-preparation workout with controlled hard efforts.", "Préparation course compacte originale avec efforts intenses maîtrisés."),
 extraWorkout("vo2max", "VO2 Max — 4 x 4 min", "VO2 Max — 4 x 4 min", "Warmup\n- 12m 50%\n- 5m 70%\n- 3x 30s 115%\n- 2m 50%\n\nMain set 4x\n- 4m 112%\n- 4m 55%\n\nCooldown\n- 10m 50%", "Longer VO2-oriented intervals build aerobic power.", "Des intervalles longs orientés VO2 développent la puissance aérobie."),
 extraWorkout("vo2max", "VO2 Max — 40/20s", "VO2 Max — 40/20", "Warmup\n- 12m 50%\n- 5m 70%\n\nMain set 3x\n- 6x 40s 120%\n- 20s 50%\n- 4m 55%\n\nCooldown\n- 10m 50%", "Repeated 40/20s accumulate time at high aerobic demand.", "Les répétitions 40/20 accumulent du temps à forte sollicitation aérobie."),
 extraWorkout("vo2max", "VO2 Max — Progressive 3-Minute Repeats", "VO2 Max — Répétitions progressives de 3 min", "Warmup\n- 12m 50%\n- 5m 70%\n\nMain set\n- 3m 108%\n- 3m 55%\n- 3m 110%\n- 3m 55%\n- 3m 112%\n- 3m 55%\n- 3m 114%\n- 3m 55%\n- 3m 115%\n\nCooldown\n- 10m 50%", "Progressively raises the target across five aerobic-power efforts.", "Augmente progressivement la cible sur cinq efforts de puissance aérobie."),
);

