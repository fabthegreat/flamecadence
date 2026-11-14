/* FlameCadence - Extended indoor workout library: rendering, search, stats, previews */
// ---------- Bibliothèque étendue (séances vélo indoor) ----------
LIBRARY.push(...[
 ["beginner", "Easy Spin 30", "Sortie facile 30", "Warmup\n- 1m15 50%\n- 1m15 60%\n- 1m15 70%\n- 1m15 80%\n\nMain set\n- 20m 60%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Relaxed spin to build the habit with almost no stress.", "Pédalage détendu pour prendre l’habitude, presque sans stress."],
 ["beginner", "Cadence Ladder 35", "Échelle de cadence 35", "Warmup\n- 1m15 50%\n- 1m15 60%\n- 1m15 70%\n- 1m15 80%\n\nMain set 2x\n- 3m 65% cadence 80rpm\n- 3m 65% cadence 90rpm\n- 3m 65% cadence 100rpm\n- 3m 60% cadence 110rpm\n\nCooldown\n- 3m36 58%\n- 2m24 50%", "Gentle cadence changes at easy power to smooth out your pedalling.", "De légères variations de cadence à faible puissance pour fluidifier le pédalage."],
 ["beginner", "First Tempo 40", "Premier tempo 40", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 2x\n- 8m 78%\n- 4m 55%\n\nCooldown\n- 3m36 58%\n- 2m24 50%", "A first taste of tempo with generous recoveries.", "Une première approche du tempo avec de généreuses récupérations."],
 ["beginner", "Intro Intervals 3x3", "Intervalles d’initiation 3x3", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 3x\n- 3m 90%\n- 3m 55%\n\nCooldown\n- 4m12 58%\n- 2m48 50%", "Short, moderate efforts to learn pacing and recovery.", "Des efforts courts et modérés pour apprendre à gérer l’allure et la récupération."],
 ["beginner", "Steady Endurance 45", "Endurance régulière 45", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 30m 68%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Simple steady aerobic ride at comfortable power.", "Sortie aérobie régulière à puissance confortable."],
 ["beginner", "Sweet Spot Taster 45", "Découverte du sweet spot 45", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 2x\n- 10m 85%\n- 5m 55%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Two short sweet spot blocks as a gentle introduction.", "Deux courts blocs sweet spot pour une introduction en douceur."],
 ["recovery", "Active Recovery 30", "Récupération active 30", "Main set\n- 25m 52%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Very easy pedalling to flush the legs without adding training stress.", "Pédalage très facile pour décrasser les jambes sans ajouter de stress d’entraînement."],
 ["recovery", "Recovery Spin 45", "Pédalage de récupération 45", "Main set\n- 40m 55% cadence 95rpm\n\nCooldown\n- 3m 58%\n- 2m 50%", "Very easy pedalling to flush the legs without adding training stress.", "Pédalage très facile pour décrasser les jambes sans ajouter de stress d’entraînement."],
 ["recovery", "Easy Flush 60", "Décrassage facile 60", "Main set\n- 55m 55%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Very easy pedalling to flush the legs without adding training stress.", "Pédalage très facile pour décrasser les jambes sans ajouter de stress d’entraînement."],
 ["recovery", "Recovery with Leg Openers 40", "Récupération avec réveil musculaire 40", "Warmup\n- 1m15 50%\n- 1m15 60%\n- 1m15 70%\n- 1m15 80%\n\nMain set\n- 10m 55%\n\nMain set 3x\n- 30s 100%\n- 2m30 50%\n\n- 10m 55%\n\nCooldown\n- 3m36 58%\n- 2m24 50%", "Easy spin with three brief openers to keep the legs lively.", "Sortie facile avec trois brèves accélérations pour garder des jambes vives."],
 ["recovery", "Taper Openers 45", "Affûtage — Réveils musculaires 45", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 10m 65%\n\nMain set 3x\n- 1m 110%\n- 3m 55%\n\nCooldown\n- 4m48 58%\n- 3m12 50%", "Short sharp efforts to keep the legs fresh before an event.", "De courts efforts toniques pour garder des jambes fraîches avant un événement."],
 ["recovery", "Pre-Race Primer 40", "Préparation pré-course 40", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 2x\n- 2m 95%\n- 3m 55%\n\nMain set 3x\n- 15s 150%\n- 1m45 55%\n\nCooldown\n- 5m24 58%\n- 3m36 50%", "Short openers at race intensity, then easy spinning.", "De courtes ouvertures à intensité course, puis pédalage facile."],
 ["endurance", "Endurance 60", "Endurance 60", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 45m 66%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Steady zone 2 ride; stay smooth and conversational.", "Sortie régulière en zone 2 ; rester fluide, à une allure qui permet de parler."],
 ["endurance", "Endurance 90", "Endurance 90", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 75m 70%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Steady zone 2 ride; stay smooth and conversational.", "Sortie régulière en zone 2 ; rester fluide, à une allure qui permet de parler."],
 ["endurance", "Endurance 105", "Endurance 105", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 90m 67%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Steady zone 2 ride; stay smooth and conversational.", "Sortie régulière en zone 2 ; rester fluide, à une allure qui permet de parler."],
 ["endurance", "Endurance 120", "Endurance 120", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 105m 65%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Steady zone 2 ride; stay smooth and conversational.", "Sortie régulière en zone 2 ; rester fluide, à une allure qui permet de parler."],
 ["endurance", "Long Endurance 150", "Longue endurance 150", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 135m 65%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Long aerobic ride; fuel and hydrate appropriately.", "Longue sortie aérobie ; penser à s’alimenter et s’hydrater."],
 ["endurance", "Progressive Endurance 90", "Endurance progressive 90", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 15m 62%\n- 15m 66%\n- 15m 70%\n- 15m 74%\n- 15m 74%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Endurance ride that gently raises power every 15 minutes.", "Sortie d’endurance qui monte doucement en puissance toutes les 15 minutes."],
 ["endurance", "Endurance Cadence Pyramid 90", "Endurance pyramide de cadence 90", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 3x\n- 5m 68% cadence 80rpm\n- 5m 68% cadence 90rpm\n- 5m 68% cadence 100rpm\n- 5m 68% cadence 90rpm\n\n- 15m 66%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Steady endurance with cadence moving from 80 to 100 rpm and back.", "Endurance régulière avec une cadence qui passe de 80 à 100 tr/min puis redescend."],
 ["endurance", "Endurance with Surges 105", "Endurance avec accélérations 105", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 15x\n- 5m30 67%\n- 20s 115%\n\nCooldown\n- 4m30 58%\n- 3m 50%", "Zone 2 base with brief surges to keep the legs awake.", "Base en zone 2 avec de brèves accélérations pour garder les jambes éveillées."],
 ["tempo", "SST 3x15", "SST 3x15", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 3x\n- 15m 89%\n- 5m 55%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Sweet spot blocks build sustained aerobic power and muscular endurance.", "Les blocs sweet spot développent la puissance aérobie soutenue et l’endurance musculaire."],
 ["tempo", "SST 3x20", "SST 3x20", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 3x\n- 20m 90%\n- 5m 55%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Sweet spot blocks build sustained aerobic power and muscular endurance.", "Les blocs sweet spot développent la puissance aérobie soutenue et l’endurance musculaire."],
 ["tempo", "SST 4x12", "SST 4x12", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 4x\n- 12m 90%\n- 4m 55%\n\nCooldown\n- 3m36 58%\n- 2m24 50%", "Sweet spot blocks build sustained aerobic power and muscular endurance.", "Les blocs sweet spot développent la puissance aérobie soutenue et l’endurance musculaire."],
 ["tempo", "SST 2x30", "SST 2x30", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 2x\n- 30m 88%\n- 6m 55%\n\nCooldown\n- 4m48 58%\n- 3m12 50%", "Sweet spot blocks build sustained aerobic power and muscular endurance.", "Les blocs sweet spot développent la puissance aérobie soutenue et l’endurance musculaire."],
 ["tempo", "SST 1x45", "SST 1x45", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 45m 90%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Sweet spot blocks build sustained aerobic power and muscular endurance.", "Les blocs sweet spot développent la puissance aérobie soutenue et l’endurance musculaire."],
 ["tempo", "SST 4x15", "SST 4x15", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 4x\n- 15m 88%\n- 5m 55%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Sweet spot blocks build sustained aerobic power and muscular endurance.", "Les blocs sweet spot développent la puissance aérobie soutenue et l’endurance musculaire."],
 ["tempo", "SST 5x10", "SST 5x10", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 5x\n- 10m 92%\n- 3m 55%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Sweet spot blocks build sustained aerobic power and muscular endurance.", "Les blocs sweet spot développent la puissance aérobie soutenue et l’endurance musculaire."],
 ["tempo", "SST 6x8", "SST 6x8", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 6x\n- 8m 91%\n- 3m 55%\n\nCooldown\n- 5m24 58%\n- 3m36 50%", "Sweet spot blocks build sustained aerobic power and muscular endurance.", "Les blocs sweet spot développent la puissance aérobie soutenue et l’endurance musculaire."],
 ["tempo", "Tempo 3x15", "Tempo 3x15", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 3x\n- 15m 80%\n- 5m 55%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Controlled tempo blocks to build durable power and pacing discipline.", "Des blocs tempo maîtrisés pour développer une puissance durable et la régularité."],
 ["tempo", "Tempo 2x30", "Tempo 2x30", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 2x\n- 30m 78%\n- 5m 55%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Controlled tempo blocks to build durable power and pacing discipline.", "Des blocs tempo maîtrisés pour développer une puissance durable et la régularité."],
 ["tempo", "Tempo 1x60", "Tempo 1x60", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 60m 77%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Controlled tempo blocks to build durable power and pacing discipline.", "Des blocs tempo maîtrisés pour développer une puissance durable et la régularité."],
 ["tempo", "Tempo 4x15", "Tempo 4x15", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 4x\n- 15m 82%\n- 4m 55%\n\nCooldown\n- 5m24 58%\n- 3m36 50%", "Controlled tempo blocks to build durable power and pacing discipline.", "Des blocs tempo maîtrisés pour développer une puissance durable et la régularité."],
 ["tempo", "Tempo 3x25", "Tempo 3x25", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 3x\n- 25m 80%\n- 5m 55%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Controlled tempo blocks to build durable power and pacing discipline.", "Des blocs tempo maîtrisés pour développer une puissance durable et la régularité."],
 ["tempo", "SST Pyramid 10-15-20-15-10", "Pyramide SST 10-15-20-15-10", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 10m 88%\n- 3m 55%\n- 15m 88%\n- 3m 55%\n- 20m 88%\n- 3m 55%\n- 15m 88%\n- 3m 55%\n- 10m 88%\n\nCooldown\n- 7m48 58%\n- 5m12 50%", "Sweet spot blocks that grow then shrink, with short breaks.", "Des blocs sweet spot qui s’allongent puis raccourcissent, avec de courtes pauses."],
 ["tempo", "Progressive SST 3x15", "SST progressif 3x15", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 15m 86%\n- 5m 55%\n- 15m 89%\n- 5m 55%\n- 15m 92%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Three sweet spot blocks, each a little harder than the last.", "Trois blocs sweet spot, chacun un peu plus dur que le précédent."],
 ["tempo", "Tempo with 30s Surges", "Tempo avec accélérations de 30 s", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 9x\n- 4m30 80%\n- 30s 110%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Tempo riding with short surges to practise changing pace.", "Du tempo ponctué de courtes accélérations pour travailler les changements de rythme."],
 ["threshold", "Threshold 2x20", "Seuil 2x20", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 2x\n- 20m 100%\n- 10m 55%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Repeatable blocks at FTP-level power; hold it evenly.", "Des blocs répétables à puissance proche de la FTP ; la tenir de façon régulière."],
 ["threshold", "Threshold 4x10", "Seuil 4x10", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 4x\n- 10m 102%\n- 4m 55%\n\nCooldown\n- 5m24 58%\n- 3m36 50%", "Repeatable blocks at FTP-level power; hold it evenly.", "Des blocs répétables à puissance proche de la FTP ; la tenir de façon régulière."],
 ["threshold", "Threshold 5x8", "Seuil 5x8", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 5x\n- 8m 103%\n- 3m 55%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Repeatable blocks at FTP-level power; hold it evenly.", "Des blocs répétables à puissance proche de la FTP ; la tenir de façon régulière."],
 ["threshold", "Threshold 2x25", "Seuil 2x25", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 2x\n- 25m 97%\n- 8m 55%\n\nCooldown\n- 5m24 58%\n- 3m36 50%", "Repeatable blocks at FTP-level power; hold it evenly.", "Des blocs répétables à puissance proche de la FTP ; la tenir de façon régulière."],
 ["threshold", "Threshold 3x12", "Seuil 3x12", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 3x\n- 12m 105%\n- 5m 55%\n\nCooldown\n- 5m24 58%\n- 3m36 50%", "Repeatable blocks at FTP-level power; hold it evenly.", "Des blocs répétables à puissance proche de la FTP ; la tenir de façon régulière."],
 ["threshold", "Threshold 4x12", "Seuil 4x12", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 4x\n- 12m 98%\n- 4m 55%\n\nCooldown\n- 3m36 58%\n- 2m24 50%", "Repeatable blocks at FTP-level power; hold it evenly.", "Des blocs répétables à puissance proche de la FTP ; la tenir de façon régulière."],
 ["threshold", "Threshold 6x6", "Seuil 6x6", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 6x\n- 6m 105%\n- 3m 55%\n\nCooldown\n- 3m36 58%\n- 2m24 50%", "Repeatable blocks at FTP-level power; hold it evenly.", "Des blocs répétables à puissance proche de la FTP ; la tenir de façon régulière."],
 ["threshold", "Threshold 3x10", "Seuil 3x10", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 3x\n- 10m 105%\n- 4m 55%\n\nCooldown\n- 4m48 58%\n- 3m12 50%", "Repeatable blocks at FTP-level power; hold it evenly.", "Des blocs répétables à puissance proche de la FTP ; la tenir de façon régulière."],
 ["threshold", "Threshold 2x15", "Seuil 2x15", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 2x\n- 15m 105%\n- 6m 55%\n\nCooldown\n- 4m48 58%\n- 3m12 50%", "Repeatable blocks at FTP-level power; hold it evenly.", "Des blocs répétables à puissance proche de la FTP ; la tenir de façon régulière."],
 ["threshold", "Threshold 3x20", "Seuil 3x20", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 3x\n- 20m 98%\n- 6m 55%\n\nCooldown\n- 4m12 58%\n- 2m48 50%", "Repeatable blocks at FTP-level power; hold it evenly.", "Des blocs répétables à puissance proche de la FTP ; la tenir de façon régulière."],
 ["threshold", "Threshold 2x30", "Seuil 2x30", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 2x\n- 30m 95%\n- 10m 55%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Repeatable blocks at FTP-level power; hold it evenly.", "Des blocs répétables à puissance proche de la FTP ; la tenir de façon régulière."],
 ["threshold", "Over-Unders 3x12", "Over-Unders 3x12", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 3x\n- 2m 95%\n- 2m 105%\n\n- 5m 55%\n\nMain set 3x\n- 2m 95%\n- 2m 105%\n\n- 5m 55%\n\nMain set 3x\n- 2m 95%\n- 2m 105%\n\n- 5m 55%\n\nCooldown\n- 5m24 58%\n- 3m36 50%", "Alternate just below and above threshold to practise clearing lactate.", "Alterner juste sous et au-dessus du seuil pour travailler l’élimination du lactate."],
 ["threshold", "Over-Unders 2x20", "Over-Unders 2x20", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 5x\n- 2m 92%\n- 2m 104%\n\n- 10m 55%\n\nMain set 5x\n- 2m 92%\n- 2m 104%\n\n- 10m 55%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Alternate just below and above threshold to practise clearing lactate.", "Alterner juste sous et au-dessus du seuil pour travailler l’élimination du lactate."],
 ["threshold", "Short Over-Unders 4x10", "Over-unders courts 4x10", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 5x\n- 1m 105%\n- 1m 90%\n\n- 4m 55%\n\nMain set 5x\n- 1m 105%\n- 1m 90%\n\n- 4m 55%\n\nMain set 5x\n- 1m 105%\n- 1m 90%\n\n- 4m 55%\n\nMain set 5x\n- 1m 105%\n- 1m 90%\n\n- 4m 55%\n\nCooldown\n- 5m24 58%\n- 3m36 50%", "Rapid minute-by-minute swaps across threshold.", "Des alternances rapides d’une minute de part et d’autre du seuil."],
 ["threshold", "Threshold Pyramid 5-10-15-10-5", "Pyramide seuil 5-10-15-10-5", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 5m 100%\n- 3m 55%\n- 10m 100%\n- 3m 55%\n- 15m 100%\n- 3m 55%\n- 10m 100%\n- 3m 55%\n- 5m 100%\n\nCooldown\n- 4m48 58%\n- 3m12 50%", "Threshold blocks that grow then shrink, with short breaks.", "Des blocs au seuil qui s’allongent puis raccourcissent, avec de courtes pauses."],
 ["threshold", "Threshold Descending 20-15-10", "Seuil dégressif 20-15-10", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 20m 98%\n- 5m 55%\n- 15m 101%\n- 5m 55%\n- 10m 104%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Threshold blocks getting shorter and slightly harder.", "Des blocs au seuil de plus en plus courts et un peu plus durs."],
 ["threshold", "Threshold + Sprint Finish 2x15", "Seuil + sprint final 2x15", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 2x\n- 14m45 100%\n- 15s 250%\n- 6m 55%\n\nCooldown\n- 4m48 58%\n- 3m12 50%", "Two threshold blocks, each finishing with a 15-second sprint.", "Deux blocs au seuil, chacun terminé par un sprint de 15 secondes."],
 ["threshold", "Threshold Ladder 8-10-12", "Seuil en escalier 8-10-12", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 8m 102%\n- 4m 55%\n- 10m 102%\n- 4m 55%\n- 12m 102%\n\nCooldown\n- 4m12 58%\n- 2m48 50%", "Three threshold blocks getting longer to build staying power.", "Trois blocs au seuil de plus en plus longs pour développer l’endurance de puissance."],
 ["vo2max", "VO2 5x3", "VO2 5x3", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 5x\n- 3m 115%\n- 3m 50%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Hard intervals near VO2 max; start controlled and hold power across all reps.", "Des intervalles intenses proches de la VO2 max ; partir en contrôle et tenir la puissance sur toutes les répétitions."],
 ["vo2max", "VO2 6x3", "VO2 6x3", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 6x\n- 3m 118%\n- 3m 50%\n\nCooldown\n- 5m24 58%\n- 3m36 50%", "Hard intervals near VO2 max; start controlled and hold power across all reps.", "Des intervalles intenses proches de la VO2 max ; partir en contrôle et tenir la puissance sur toutes les répétitions."],
 ["vo2max", "VO2 4x4", "VO2 4x4", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 4x\n- 4m 112%\n- 4m 50%\n\nCooldown\n- 4m48 58%\n- 3m12 50%", "Hard intervals near VO2 max; start controlled and hold power across all reps.", "Des intervalles intenses proches de la VO2 max ; partir en contrôle et tenir la puissance sur toutes les répétitions."],
 ["vo2max", "VO2 5x4", "VO2 5x4", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 5x\n- 4m 110%\n- 4m 50%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Hard intervals near VO2 max; start controlled and hold power across all reps.", "Des intervalles intenses proches de la VO2 max ; partir en contrôle et tenir la puissance sur toutes les répétitions."],
 ["vo2max", "VO2 4x5", "VO2 4x5", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 4x\n- 5m 108%\n- 5m 50%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Hard intervals near VO2 max; start controlled and hold power across all reps.", "Des intervalles intenses proches de la VO2 max ; partir en contrôle et tenir la puissance sur toutes les répétitions."],
 ["vo2max", "VO2 5x5", "VO2 5x5", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 5x\n- 5m 106%\n- 5m 50%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Hard intervals near VO2 max; start controlled and hold power across all reps.", "Des intervalles intenses proches de la VO2 max ; partir en contrôle et tenir la puissance sur toutes les répétitions."],
 ["vo2max", "VO2 3x6", "VO2 3x6", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 3x\n- 6m 108%\n- 6m 50%\n\nCooldown\n- 5m24 58%\n- 3m36 50%", "Hard intervals near VO2 max; start controlled and hold power across all reps.", "Des intervalles intenses proches de la VO2 max ; partir en contrôle et tenir la puissance sur toutes les répétitions."],
 ["vo2max", "VO2 8x2", "VO2 8x2", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 8x\n- 2m 120%\n- 2m 50%\n\nCooldown\n- 4m48 58%\n- 3m12 50%", "Hard intervals near VO2 max; start controlled and hold power across all reps.", "Des intervalles intenses proches de la VO2 max ; partir en contrôle et tenir la puissance sur toutes les répétitions."],
 ["vo2max", "VO2 10x2", "VO2 10x2", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 10x\n- 2m 118%\n- 2m 50%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Hard intervals near VO2 max; start controlled and hold power across all reps.", "Des intervalles intenses proches de la VO2 max ; partir en contrôle et tenir la puissance sur toutes les répétitions."],
 ["vo2max", "VO2 30/30 3x10", "VO2 30/30 3x10", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 10x\n- 30s 130%\n- 30s 50%\n\n- 5m 55%\n\nMain set 10x\n- 30s 130%\n- 30s 50%\n\n- 5m 55%\n\nMain set 10x\n- 30s 130%\n- 30s 50%\n\n- 5m 55%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Short on/off repeats stack up lots of time at high aerobic demand.", "De courtes alternances effort/récupération cumulent beaucoup de temps à forte sollicitation aérobie."],
 ["vo2max", "VO2 40/20 3x8", "VO2 40/20 3x8", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 8x\n- 40s 125%\n- 20s 50%\n\n- 5m 55%\n\nMain set 8x\n- 40s 125%\n- 20s 50%\n\n- 5m 55%\n\nMain set 8x\n- 40s 125%\n- 20s 50%\n\n- 5m 55%\n\nCooldown\n- 3m36 58%\n- 2m24 50%", "Short on/off repeats stack up lots of time at high aerobic demand.", "De courtes alternances effort/récupération cumulent beaucoup de temps à forte sollicitation aérobie."],
 ["vo2max", "VO2 15/15 3x16", "VO2 15/15 3x16", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 16x\n- 15s 135%\n- 15s 50%\n\n- 5m 55%\n\nMain set 16x\n- 15s 135%\n- 15s 50%\n\n- 5m 55%\n\nMain set 16x\n- 15s 135%\n- 15s 50%\n\n- 5m 55%\n\nCooldown\n- 3m36 58%\n- 2m24 50%", "Short on/off repeats stack up lots of time at high aerobic demand.", "De courtes alternances effort/récupération cumulent beaucoup de temps à forte sollicitation aérobie."],
 ["vo2max", "VO2 30/15 3x13", "VO2 30/15 3x13", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 13x\n- 30s 125%\n- 15s 50%\n\n- 3m 55%\n\nMain set 13x\n- 30s 125%\n- 15s 50%\n\n- 3m 55%\n\nMain set 13x\n- 30s 125%\n- 15s 50%\n\n- 3m 55%\n\nCooldown\n- 4m03 58%\n- 2m42 50%", "Short on/off repeats stack up lots of time at high aerobic demand.", "De courtes alternances effort/récupération cumulent beaucoup de temps à forte sollicitation aérobie."],
 ["vo2max", "VO2 20/10 4x8", "VO2 20/10 4x8", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 8x\n- 20s 140%\n- 10s 50%\n\n- 4m 55%\n\nMain set 8x\n- 20s 140%\n- 10s 50%\n\n- 4m 55%\n\nMain set 8x\n- 20s 140%\n- 10s 50%\n\n- 4m 55%\n\nMain set 8x\n- 20s 140%\n- 10s 50%\n\n- 4m 55%\n\nCooldown\n- 4m48 58%\n- 3m12 50%", "Very short on/off repeats stack up lots of time at high aerobic demand.", "De très courtes alternances cumulent beaucoup de temps à forte sollicitation aérobie."],
 ["vo2max", "VO2 Pyramid 1-2-3-4-3-2-1", "VO2 Pyramide 1-2-3-4-3-2-1", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 1m 125%\n- 1m 50%\n- 2m 120%\n- 2m 50%\n- 3m 115%\n- 3m 50%\n- 4m 110%\n- 4m 50%\n- 3m 115%\n- 3m 50%\n- 2m 120%\n- 2m 50%\n- 1m 125%\n\nCooldown\n- 5m24 58%\n- 3m36 50%", "Efforts climb from 1 to 4 minutes then back down.", "Des efforts qui montent de 1 à 4 minutes puis redescendent."],
 ["vo2max", "VO2 Descending 5-4-3-2-1", "VO2 Dégressif 5-4-3-2-1", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 5m 108%\n- 5m 50%\n- 4m 112%\n- 4m 50%\n- 3m 116%\n- 3m 50%\n- 2m 120%\n- 2m 50%\n- 1m 125%\n\nCooldown\n- 3m36 58%\n- 2m24 50%", "Efforts shrink from 5 to 1 minute while intensity rises.", "Des efforts qui raccourcissent de 5 à 1 minute tandis que l’intensité monte."],
 ["vo2max", "VO2 Ascending 2-3-4-5", "VO2 Progressif 2-3-4-5", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 2m 120%\n- 3m 50%\n- 3m 116%\n- 4m 50%\n- 4m 112%\n- 5m 50%\n- 5m 108%\n\nCooldown\n- 5m24 58%\n- 3m36 50%", "Efforts grow from 2 to 5 minutes while intensity eases.", "Des efforts qui s’allongent de 2 à 5 minutes tandis que l’intensité baisse."],
 ["vo2max", "VO2 Over-Under 4x6", "VO2 Over-Under 4x6", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 3x\n- 1m 125%\n- 1m 95%\n\n- 5m 55%\n\nMain set 3x\n- 1m 125%\n- 1m 95%\n\n- 5m 55%\n\nMain set 3x\n- 1m 125%\n- 1m 95%\n\n- 5m 55%\n\nMain set 3x\n- 1m 125%\n- 1m 95%\n\n- 5m 55%\n\nCooldown\n- 3m36 58%\n- 2m24 50%", "Hard minute, easier minute: keeps you near VO2 max for longer.", "Une minute dure, une minute plus facile : on reste plus longtemps près de la VO2 max."],
 ["vo2max", "VO2 Triples 4x(3+2+1)", "VO2 Triplés 4x(3+2+1)", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 4x\n- 3m 112%\n- 2m 122%\n- 1m 130%\n- 5m 50%\n\nCooldown\n- 3m36 58%\n- 2m24 50%", "Each set stacks 3, 2 and 1 minutes at rising intensity.", "Chaque série enchaîne 3, 2 et 1 minute à intensité croissante."],
 ["vo2max", "VO2 Long 3x8", "VO2 Long 3x8", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 3x\n- 8m 105%\n- 6m 50%\n\nCooldown\n- 4m48 58%\n- 3m12 50%", "Longer blocks just above threshold, bridging threshold and VO2.", "Des blocs plus longs juste au-dessus du seuil, entre seuil et VO2."],
 ["vo2max", "VO2 with Tempo Recoveries 4x4", "VO2 avec récupérations tempo 4x4", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 4x\n- 4m 112%\n- 4m 75%\n\nCooldown\n- 4m48 58%\n- 3m12 50%", "VO2 efforts with active tempo recoveries instead of rest.", "Des efforts VO2 avec récupération active au tempo plutôt qu’au repos."],
 ["vo2max", "5-Min Power Progressive", "Puissance 5 min progressive", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 5m 106%\n- 5m 50%\n- 5m 108%\n- 5m 50%\n- 5m 110%\n- 5m 50%\n- 5m 112%\n- 5m 50%\n- 5m 114%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Five 5-minute efforts, each slightly harder than the last.", "Cinq efforts de 5 minutes, chacun un peu plus dur que le précédent."],
 ["vo2max", "VO2 Stepped 4x4", "VO2 par paliers 4x4", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 4x\n- 2m 110%\n- 2m 120%\n- 4m 50%\n\nCooldown\n- 4m48 58%\n- 3m12 50%", "Each rep steps up from 110% to 120% FTP.", "Chaque répétition monte de 110 % à 120 % de la FTP."],
 ["vo2max", "VO2 Race Pace 3x(3x2)", "VO2 rythme de course 3x(3x2)", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 3x\n- 2m 118%\n- 2m 50%\n\n- 5m 60%\n\nMain set 3x\n- 2m 118%\n- 2m 50%\n\n- 5m 60%\n\nMain set 3x\n- 2m 118%\n- 2m 50%\n\n- 5m 60%\n\nCooldown\n- 5m24 58%\n- 3m36 50%", "Three sets of short hard efforts at race-like intensity.", "Trois séries de courts efforts intenses à intensité de course."],
 ["sprint", "Sprint Intro 6x10s", "Initiation sprint 6x10 s", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 6x\n- 10s 250%\n- 2m50 50%\n\nCooldown\n- 4m12 58%\n- 2m48 50%", "Very short sprints with long recoveries; keep each one crisp.", "Sprints très courts avec longues récupérations ; chacun doit rester net."],
 ["sprint", "Neuromuscular 8x15s", "Neuromusculaire 8x15 s", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 8x\n- 15s 250%\n- 2m45 50%\n\nCooldown\n- 3m36 58%\n- 2m24 50%", "Explosive 15-second sprints; recover fully between efforts.", "Sprints explosifs de 15 secondes ; récupérer complètement entre les efforts."],
 ["sprint", "Standing Starts 6x20s", "Départs arrêtés 6x20 s", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 6x\n- 20s 220%\n- 4m40 50%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Practise launching hard from a low speed.", "Travaille les départs puissants à faible vitesse."],
 ["sprint", "Sprint 10x10s", "Sprint 10x10 s", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 10x\n- 10s 260%\n- 2m50 50%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Ten maximal 10-second sprints with full recovery.", "Dix sprints maximaux de 10 secondes avec récupération complète."],
 ["sprint", "30s Max Efforts 6x", "Efforts max de 30 s 6x", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 6x\n- 30s 200%\n- 4m30 50%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Six 30-second near-maximal efforts to build anaerobic power.", "Six efforts quasi maximaux de 30 secondes pour développer la puissance anaérobie."],
 ["sprint", "Sprint Sets 3x(4x15s)", "Séries de sprints 3x(4x15 s)", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 4x\n- 15s 250%\n- 1m45 50%\n\n- 5m 55%\n\nMain set 4x\n- 15s 250%\n- 1m45 50%\n\n- 5m 55%\n\nMain set 4x\n- 15s 250%\n- 1m45 50%\n\n- 5m 55%\n\nCooldown\n- 3m36 58%\n- 2m24 50%", "Three sets of four short sprints with a long break between sets.", "Trois séries de quatre sprints courts avec une longue pause entre les séries."],
 ["sprint", "Race Start Simulation 2x", "Simulation de départ de course 2x", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 2x\n- 30s 180%\n- 2m 125%\n- 8m 100%\n- 7m 55%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Hard opening then settle into race pace, twice.", "Un départ rapide puis installation à rythme de course, deux fois."],
 ["sprint", "Attack & Recover 8x", "Attaque & récupération 8x", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 10m 70%\n\nMain set 8x\n- 30s 150%\n- 1m30 70%\n\nCooldown\n- 5m24 58%\n- 3m36 50%", "Repeated 30-second attacks with only short recoveries.", "Des attaques répétées de 30 secondes avec de courtes récupérations."],
 ["sprint", "Criterium Simulation", "Simulation de critérium", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 6x\n- 15s 220%\n- 45s 120%\n- 2m 90%\n- 2m 60%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Repeated sprint, surge and settle cycles like a criterium.", "Des cycles sprint, accélération et stabilisation comme en critérium."],
 ["sprint", "Hill Attack Repeats 5x2", "Attaques en côte 5x2", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 5x\n- 2m 130%\n- 3m 60%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Five hard 2-minute climbs-style efforts with full recovery.", "Cinq efforts intenses de 2 minutes façon côte avec récupération complète."],
 ["sprint", "Surge Endurance", "Endurance avec accélérations", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 10m 68%\n\nMain set 20x\n- 3m 70%\n- 20s 140%\n\nCooldown\n- 5m 58%\n- 3m20 50%", "Endurance base with a short surge every few minutes.", "Base d’endurance avec une courte accélération toutes les quelques minutes."],
 ["sprint", "Breakaway Effort 3x8", "Effort d’échappée 3x8", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 3x\n- 7m45 108%\n- 15s 220%\n- 7m 55%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Sustained effort above threshold ending in a short sprint.", "Effort soutenu au-dessus du seuil terminé par un court sprint."],
 ["sprint", "Final Kilometer 4x1", "Dernier kilomètre 4x1", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 4x\n- 1m 150%\n- 5m 55%\n\nCooldown\n- 3m36 58%\n- 2m24 50%", "One-minute hard efforts simulating a race finish.", "Des efforts intenses d’une minute simulant un final de course."],
 ["sprint", "Sprint From Speed 5x", "Sprint lancé 5x", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 5x\n- 3m 90%\n- 12s 260%\n- 3m48 50%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Build speed at tempo then launch a short sprint.", "Prendre de la vitesse à allure tempo puis lancer un court sprint."],
 ["sprint", "Punchy Climbs 3x(6x40/20)", "Côtes explosives 3x(6x40/20)", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 6x\n- 40s 160%\n- 20s 60%\n\n- 5m 55%\n\nMain set 6x\n- 40s 160%\n- 20s 60%\n\n- 5m 55%\n\nMain set 6x\n- 40s 160%\n- 20s 60%\n\n- 5m 55%\n\nCooldown\n- 4m12 58%\n- 2m48 50%", "Short, steep-climb style efforts repeated in three sets.", "De courts efforts façon raidillons répétés en trois séries."],
 ["sprint", "Race Finale Simulation", "Simulation de final de course", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 20m 88%\n\nMain set 3x\n- 30s 150%\n- 1m30 90%\n\n- 12s 260%\n\nCooldown\n- 5m16 58%\n- 3m31 50%", "Long steady build, then attacks and a final sprint.", "Une longue montée en régime régulière, puis des attaques et un sprint final."],
 ["sprint", "Group Ride Surges", "Accélérations en groupe", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 10x\n- 4m30 75%\n- 30s 130%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Steady riding with regular surges, like a fast group ride.", "Roulage régulier avec des accélérations fréquentes, comme en sortie de groupe."],
 ["sprint", "Points Race Simulation", "Simulation de course aux points", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set 10x\n- 10s 250%\n- 2m 110%\n- 1m50 60%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Ten sprint-and-recover cycles like a points race.", "Dix cycles sprint puis récupération comme une course aux points."],
 ["testing", "FTP Test 20min", "Test FTP 20 min", "Warmup\n- 3m45 50%\n- 3m45 60%\n- 3m45 70%\n- 3m45 80%\n\nMain set\n- 5m 105%\n- 10m 50%\n- 20m 100%\n\nCooldown\n- 6m 58%\n- 4m 50%", "Classic 20-minute test; FTP is about 95% of the average power. Pacing guide only.", "Test classique de 20 minutes ; la FTP vaut environ 95 % de la puissance moyenne. Repère d’allure seulement."],
 ["testing", "Ramp Test", "Test en rampe", "Warmup\n- 1m15 50%\n- 1m15 60%\n- 1m15 70%\n- 1m15 80%\n\nMain set\n- 1m 45%\n- 1m 51%\n- 1m 57%\n- 1m 63%\n- 1m 69%\n- 1m 75%\n- 1m 81%\n- 1m 87%\n- 1m 93%\n- 1m 99%\n- 1m 105%\n- 1m 111%\n- 1m 117%\n- 1m 123%\n- 1m 129%\n- 1m 135%\n- 1m 141%\n- 1m 147%\n- 1m 153%\n- 1m 159%\n- 1m 165%\n\nCooldown\n- 5m24 58%\n- 3m36 50%", "Steps of 1 minute rising every step until failure; treat targets as guides.", "Paliers d’1 minute croissants jusqu’à l’échec ; cibles données à titre indicatif."],
 ["testing", "8-Min FTP Test (2x8)", "Test FTP 8 min (2x8)", "Warmup\n- 3m45 50%\n- 3m45 60%\n- 3m45 70%\n- 3m45 80%\n\nMain set\n- 8m 105%\n- 10m 50%\n- 8m 105%\n\nCooldown\n- 8m24 58%\n- 5m36 50%", "Two 8-minute maximal efforts; treat targets as guides.", "Deux efforts maximaux de 8 minutes ; cibles données à titre indicatif."],
 ["testing", "5-Min MAP Test", "Test PMA 5 min", "Warmup\n- 3m45 50%\n- 3m45 60%\n- 3m45 70%\n- 3m45 80%\n\nMain set\n- 1m 120%\n- 5m 50%\n- 5m 115%\n\nCooldown\n- 8m24 58%\n- 5m36 50%", "Five-minute maximal benchmark; treat targets as guides.", "Repère maximal de cinq minutes ; cibles données à titre indicatif."],
 ["testing", "1-Min Power Test", "Test de puissance 1 min", "Warmup\n- 3m45 50%\n- 3m45 60%\n- 3m45 70%\n- 3m45 80%\n\nMain set\n- 1m 200%\n- 10m 50%\n- 1m 200%\n\nCooldown\n- 7m48 58%\n- 5m12 50%", "Two one-minute all-out efforts; treat targets as guides.", "Deux efforts d’une minute à fond ; cibles données à titre indicatif."],
 ["testing", "Sprint + 5s Peak Test", "Test sprint + pic 5 s", "Warmup\n- 3m45 50%\n- 3m45 60%\n- 3m45 70%\n- 3m45 80%\n\nMain set 3x\n- 5s 300%\n- 5m 50%\n\nCooldown\n- 8m51 58%\n- 5m54 50%", "Three 5-second peak sprints; treat targets as guides.", "Trois sprints de pic de 5 secondes ; cibles données à titre indicatif."],
 ["testing", "CP Test 3min + 12min", "Test CP 3 min + 12 min", "Warmup\n- 3m45 50%\n- 3m45 60%\n- 3m45 70%\n- 3m45 80%\n\nMain set\n- 3m 120%\n- 30m 55%\n- 12m 103%\n\nCooldown\n- 6m 58%\n- 4m 50%", "3-minute and 12-minute maximal efforts for critical power; treat targets as guides.", "Efforts maximaux de 3 et 12 minutes pour la puissance critique ; cibles indicatives."],
 ["testing", "30-Min Threshold Test", "Test de seuil 30 min", "Warmup\n- 3m45 50%\n- 3m45 60%\n- 3m45 70%\n- 3m45 80%\n\nMain set\n- 30m 98%\n\nCooldown\n- 6m 58%\n- 4m 50%", "Thirty steady minutes at threshold; treat targets as guides.", "Trente minutes régulières au seuil ; cibles données à titre indicatif."],
 ["testing", "Power Profile Test 5s-1m-5m", "Test de profil de puissance 5 s-1 min-5 min", "Warmup\n- 3m45 50%\n- 3m45 60%\n- 3m45 70%\n- 3m45 80%\n\nMain set\n- 5s 300%\n- 10m 50%\n- 1m 200%\n- 15m 50%\n- 5m 115%\n\nCooldown\n- 8m21 58%\n- 5m34 50%", "Maximal 5 s, 1 min and 5 min efforts with long rests; targets are guides.", "Efforts maximaux de 5 s, 1 min et 5 min avec longues pauses ; cibles indicatives."],
 ["testing", "Aerobic Decoupling 60", "Découplage aérobie 60", "Warmup\n- 2m30 50%\n- 2m30 60%\n- 2m30 70%\n- 2m30 80%\n\nMain set\n- 10m 65%\n- 50m 70%\n\nCooldown\n- 3m 58%\n- 2m 50%", "Steady 50 minutes to check how heart rate drifts at constant power.", "Cinquante minutes régulières pour observer la dérive de la fréquence cardiaque à puissance constante."]
].map(w => extraWorkout(...w)));

function workoutPreviewSvg(desc, sport, ftp){ return stepsSvg(parseWorkout(desc, sport, ftp)); }
function stepsSvg(steps){
  if(!steps || !steps.length) return "";
  const total = steps.reduce((sum, step) => sum + step.d, 0);
  const peak = Math.max(120, ...steps.map(step => Math.max(step.a, step.b)));
  const W = 300, H = 100;
  let x = 0, path = "";
  for(const step of steps){
    const w = step.d / total * W;
    const ya = H - step.a / peak * (H - 4), yb = H - step.b / peak * (H - 4);
    path += `<path class="z${zoneOf((step.a + step.b) / 2)}" d="M${x.toFixed(2)} ${H}L${x.toFixed(2)} ${ya.toFixed(1)}L${(x+w).toFixed(2)} ${yb.toFixed(1)}L${(x+w).toFixed(2)} ${H}Z"/>`;
    x += w;
  }
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${path}</svg>`;
}

// Durée / puissance moyenne / NP d'une séance de la bibliothèque
function libDuration(item){
  if(item._dur == null){
    const steps = parseWorkout(item.desc_en, item.sport, 0);
    item._dur = steps.reduce((s, x) => s + x.d, 0);
  }
  return item._dur;
}
function stepsStats(steps){
  if(!steps.length) return null;
  const total = steps.reduce((s, x) => s + x.d, 0);
  const avgPct = steps.reduce((s, x) => s + x.d * (x.a + x.b) / 2, 0) / total;
  // NP : moyenne glissante 30 s, puissance^4, moyenne, racine 4e (échantillonnage à la seconde)
  const win = 30, ser = [];
  for(const st of steps){
    const d = Math.round(st.d);
    for(let i = 0; i < d; i++) ser.push(st.a + (st.b - st.a) * (d > 1 ? i / (d - 1) : 0));
  }
  let npPct = avgPct;
  if(ser.length >= win){
    let sum = 0; const pre = [];
    for(let i = 0; i < ser.length; i++){ sum += ser[i]; if(i >= win) sum -= ser[i - win]; if(i >= win - 1) pre.push(sum / win); }
    const m4 = pre.reduce((s, v) => s + Math.pow(Math.max(v, 0), 4), 0) / pre.length;
    npPct = Math.pow(m4, 0.25);
  }
  // TSS = heures × IF² × 100 (IF = NP / FTP)
  const iff = npPct / 100, tss = total / 3600 * iff * iff * 100;
  return {total, avgPct, npPct, iff, tss};
}
function libStats(item, ftp){ return stepsStats(parseWorkout(item.desc_en, item.sport, ftp)); }
function libStatsText(item, ftp){
  const st = libStats(item, ftp);
  if(!st) return "";
  const w = ftp > 0;
  const np = w ? " · NP " + Math.round(st.npPct * ftp / 100) + " W" : " · NP " + Math.round(st.npPct) + " %";
  const load = " · IF " + st.iff.toFixed(2) + " · TSS " + Math.round(st.tss);
  return hm(st.total) + " · " + t("libAvg") + " " + (w ? Math.round(st.avgPct * ftp / 100) + " W" : Math.round(st.avgPct) + " %") + np + load;
}

let LIBF = -1, LIBFK = "";
// Mode « Auto » : niveau de forme déduit d'intervals.icu. Forme = CTL − ATL (TSB) : ≥ +5 en pleine forme, ≥ −10 bien, ≥ −20 bof, ≥ −30 fatigué, sinon épuisé ;
// puis un niveau de moins (jusqu'à deux) si les signaux du jour sont au rouge : VFC ≤ 90 % de la moyenne des 7 jours, FC de repos ≥ +5 %, sommeil < 6 h.
const FEEL_ORDER = ["great", "good", "soso", "tired", "exhausted"];
function autoFeel(){
  const W = ((NEXT.well && NEXT.well.length ? NEXT.well : LAST.well) || []).filter(w => w && w.id);
  const fw = W.filter(w => w.ctl != null).sort((a, b) => a.id < b.id ? -1 : 1).pop();
  if(!fw) return null;
  const f = Math.round(fw.ctl - (fw.atl || 0)), today = iso(new Date()), td = W.find(w => w.id === today), why = [];
  let lvl = f >= 5 ? 0 : f >= -10 ? 1 : f >= -20 ? 2 : f >= -30 ? 3 : 4;
  if(td){
    const base = key => { const v = W.filter(w => w.id < today && w[key] > 0).map(w => w[key]); return v.length >= 3 ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
    const hb = base("hrv"), rb = base("restingHR");
    if(td.hrv > 0 && hb && td.hrv <= hb * 0.9) why.push(t("autoHrv"));
    if(td.restingHR > 0 && rb && td.restingHR >= rb * 1.05) why.push(t("autoRhr"));
    if(td.sleepSecs > 0 && td.sleepSecs < 6 * 3600) why.push(t("autoSleep"));
    lvl = Math.min(4, lvl + Math.min(2, why.length));
  }
  return {level: FEEL_ORDER[lvl], f, why};
}
// quand les données de forme d'intervals.icu arrivent (ou changent), le mode Auto met à jour l'affichage et la liste
function libAutoRefresh(){ try{ if($("libform").checked && $("libfeel").value === "auto"){ feelUI(); if(!document.querySelector('[data-block="lib"]').hidden) renderLibrary(); } }catch(e){} }
const feelEff = () => { const v = $("libfeel").value; if(v !== "auto") return v; const a = autoFeel(); return a ? a.level : "good"; };
const LIB_THEMES = [
  {id:"beginner",icon:"🌱",en:"Beginner & Short Sessions",fr:"Débutant & séances courtes"},
  {id:"recovery",icon:"🌿",en:"Recovery & Taper",fr:"Récupération & affûtage"},
  {id:"endurance",icon:"🚴",en:"Endurance",fr:"Endurance"},
  {id:"tempo",icon:"📈",en:"Tempo & Sweet Spot",fr:"Tempo & sweet spot"},
  {id:"threshold",icon:"🔥",en:"Threshold",fr:"Seuil"},
  {id:"vo2max",icon:"⚡",en:"VO₂ Max & Anaerobic",fr:"VO₂ Max & anaérobie"},
  {id:"sprint",icon:"💥",en:"Sprint & Race",fr:"Sprint & course"},
  {id:"force",icon:"🦵",en:"Force & Low Cadence",fr:"Force & basse cadence"},
  {id:"cols",icon:"⛰️",en:"Famous Cols (slope mode)",fr:"Cols mythiques (mode pente)"},
  {id:"testing",icon:"🎯",en:"Testing",fr:"Tests"}
];
// Regroupement des anciennes catégories (toutes les séances sont conservées)
const LIB_CATMAP = {cols:"cols",force:"force",beginner:"beginner",short:"beginner",recovery:"recovery",bz_recovery:"recovery",taper:"recovery",endurance:"endurance",bz_endurance:"endurance",tempo:"tempo",sweetspot:"tempo",bz_tempo:"tempo",threshold:"threshold",bz_threshold:"threshold",vo2max:"vo2max",bz_vo2max:"vo2max",anaerobic:"vo2max",fast:"vo2max",sprint:"sprint",bz_sprint:"sprint",uae:"sprint",adq:"sprint",testing:"testing",bz_test:"testing"};
function libCat(item){
  if(item.category) return LIB_CATMAP[item.category] || "endurance";
  const n=(item.name_en+" "+item.name_fr).toLowerCase();
  let base="endurance";
  if(/recovery|récupération/.test(n)) base="recovery";
  else if(/vo2|max|punchy|explosif|anaerobic|anaérobie/.test(n)) base="vo2max";
  else if(/sprint/.test(n)) base="sprint";
  else if(/threshold|seuil|over-under|redline/.test(n)) base="threshold";
  else if(/sweet spot/.test(n)) base="tempo";
  else if(/tempo|cadence|fast finish/.test(n)) base="tempo";
  else if(/endurance|aerobic|aérobie/.test(n)) base="endurance";
  else if(/uae team em|uae team adq/.test(n)) base="sprint";
  else if(/beginner|débutant/.test(n)) base="beginner";
  return LIB_CATMAP[base] || "endurance";
}

function renderLibrary(){
  const c = $("libContainer");
  $("libsport").value = $("sport").value; LIBF = curFtp(); // le type de sortie choisi (indoor / extérieur) fixe la FTP utilisée pour les watts
  const q = ($("libsearch").value || "").trim().toLowerCase();
  const durF = $("libdur").value || "all";
  const starOnly = $("libstar").checked;
  const matches = item => {
    if(starOnly && !stars().includes(item.id)) return false;
    if(q){
      const hay = [item.name_en, item.name_fr, item.expl_en, item.expl_fr, item.desc_en].join(" ").toLowerCase();
      if(!q.split(/\s+/).every(w => hay.includes(w))) return false;
    }
    if(durF !== "all"){
      // bornes explicites « lo-hi » en minutes (hi = « inf » → sans limite haute)
      const m = durF.match(/^(\d+|inf)?-(\d+|inf)?$/);
      const d = libDuration(item);
      const lo = m && m[1] && m[1] !== "inf" ? +m[1] * 60 : 0;
      const hi = m && m[2] && m[2] !== "inf" ? +m[2] * 60 : Infinity;
      if(!(d > lo && d <= hi)) return false;
    }
    return true;
  };
  const themes = LIB_THEMES, categorize = libCat;
  const groups=themes.map(theme=>({...theme,items:[]}));
  // Forme du jour : thèmes autorisés selon le ressenti, et durée plafonnée quand on est fatigué
  const FEEL = {great: null, good: ["beginner", "recovery", "endurance", "tempo", "threshold", "vo2max", "force", "cols"], soso: ["beginner", "recovery", "endurance", "tempo", "force"], tired: ["beginner", "recovery", "endurance"], exhausted: ["beginner", "recovery"]};
  const feelOn = $("libform").checked, feel = feelEff(), feelCap = {tired: 3600, exhausted: 2700}[feel];
  LIBFK = feelOn ? feel : "";
  const feelOK = (gid, item) => !feelOn || ((!FEEL[feel] || FEEL[feel].includes(gid)) && (!feelCap || libDuration(item) <= feelCap));
  LIBRARY.forEach((item,idx)=>{ if(!matches(item)) return; const gid=categorize(item); if(!feelOK(gid,item)) return; const group=groups.find(g=>g.id===gid)||groups[5]; group.items.push({item,idx}); });
  const filled = groups.filter(g => g.items.length);
  if(!filled.length){ c.innerHTML = `<div class="hint">${esc(t("libNo"))}</div>`; return; }
  const shown = filled.reduce((s, g) => s + g.items.length, 0);
  c.innerHTML = `<p class="hint" style="margin:0 0 10px">${esc(t("libCount", LIBRARY.length))}${shown !== LIBRARY.length ? esc(t("libShown", shown)) : ""}</p>` + filled.map(group=>`<details class="lib-theme"${q ? " open" : ""}>
    <summary><span class="theme-icon">${group.icon}</span><span>${esc(lang==="fr"?group.fr:group.en)}</span><span class="theme-count">${group.items.length} ${lang==="fr"?"séances":"workouts"}</span></summary>
    <div class="lib-theme-body"><div class="lib-grid">${group.items.map(({item,idx})=>{
      const title=lang==="fr"?item.name_fr:item.name_en;
      const desc=lang==="fr"?item.expl_fr:item.expl_en;
      const st = stars().includes(item.id);
      return `<div class="lib-card" data-lc="${idx}"><h3>${esc(title)}</h3><div class="lib-preview" role="img" aria-label="${esc(title)} session preview"></div><p class="lib-stats"></p><p>${esc(desc)}</p><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="alt small" data-star="${esc(item.id)}" type="button" aria-pressed="${st}" title="${esc(t("starT"))}">${st ? "★" : "☆"}</button><button class="alt small" data-lib="${idx}" type="button">${esc(t("edGo"))}</button>${betaRunOn() && isBike(item.sport) ? `<button class="alt small" data-lplay="${idx}" type="button" title="${esc(t("libToPlT"))}">▶ ${esc(t("runItT"))}</button>` : ""}</div></div>`;
    }).join("")}</div></div>
  </details>`).join("");
  c.querySelectorAll("details.lib-theme[open]").forEach(libHydrate); // recherche : catégories ouvertes d'office
}
// Chargement différé : le graphique et les stats (parse + NP) d'une séance ne sont calculés que lorsque sa catégorie est ouverte
// et que la carte approche de la zone visible du panneau défilant (marge d'avance de 400 px).
function libFillCard(card){
  if(card.dataset.ld) return; card.dataset.ld = "1";
  const item = LIBRARY[+card.dataset.lc]; if(!item) return;
  const ftp = curFtp();
  card.querySelector(".lib-preview").innerHTML = workoutPreviewSvg(item.desc_en, item.sport, ftp);
  card.querySelector(".lib-stats").textContent = libStatsText(item, ftp);
}
function libHydrate(d){
  if(d._io) return;
  const body = d.querySelector(".lib-theme-body"); if(!body) return;
  const cards = Array.from(d.querySelectorAll(".lib-card[data-lc]"));
  if(!("IntersectionObserver" in window)){ d._io = true; cards.forEach(libFillCard); return; }
  const io = d._io = new IntersectionObserver(es => es.forEach(en => { if(en.isIntersecting){ io.unobserve(en.target); libFillCard(en.target); } }), {root: body, rootMargin: "400px 0px"});
  cards.forEach(c => io.observe(c));
}
$("libContainer").addEventListener("toggle", e => { const d = e.target; if(d && d.matches && d.matches("details.lib-theme") && d.open) libHydrate(d); }, true);
$("libsearch").addEventListener("input", renderLibrary);
$("libdur").addEventListener("change", renderLibrary);
$("libstar").addEventListener("change", renderLibrary);
const feelUI = () => {
  const on = $("libform").checked, v = $("libfeel").value, auto = v === "auto", a = auto ? autoFeel() : null, eff = auto ? (a ? a.level : "good") : v;
  $("libfeelb").hidden = !on;
  document.querySelectorAll("#libfeelb button").forEach(b => { b.setAttribute("aria-checked", String(b.dataset.v === v)); b.classList.toggle("eff", auto && b.dataset.v === eff); });
  const i = $("libautoi"), lab = {great: "feelGreat", good: "feelGood", soso: "feelSoso", tired: "feelTired", exhausted: "feelExh"};
  i.hidden = !(on && auto);
  if(!i.hidden) i.textContent = a ? t("autoInfo", (a.f > 0 ? "+" : "") + a.f, t(lab[eff])) + (a.why.length ? " · " + a.why.join(" · ") : "") : t("autoNone");
};
$("libform").addEventListener("change", () => { feelUI(); renderLibrary(); }); feelUI();
document.querySelectorAll("#libfeelb button").forEach(b => b.onclick = () => { $("libfeel").value = b.dataset.v; feelUI(); renderLibrary(); });
function renderLibraryKeepOpen(){ const c = $("libContainer"); const open = [...c.querySelectorAll("details.lib-theme")].map(d => d.open); renderLibrary(); c.querySelectorAll("details.lib-theme").forEach((d, i) => { d.open = !!open[i]; }); }
