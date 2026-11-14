# FlameCadence

Fire up your next workout. FlameCadence is a free, open-source, browser-based indoor cycling app: build your own structured workouts, ride them with a smart trainer, and track your training over time. Everything runs client-side in the browser, with optional integration to [intervals.icu](https://intervals.icu) and an optional self-hosted backend.

## What the app does

### Build and manage workouts
- **Workout library**: a built-in catalogue of classic sessions (intervals, sweet spot, ramps, ...), plus your own saved workouts (v2 JSON format) with favourites and search.
- **Import**: pull workouts from blocks.zone, from files (ZWO, ERG, MRC, FIT, GPX, JSON), or a whole zip archive at once.
- **Manual editor**: add warmup / work / recovery / cooldown blocks, see a live preview chart, drag the chart handles to reshape intervals, then shrink, re-stair, adjust intensity (+/- 5%) or undo.
- **AI generation**: describe a session in plain text (sport, duration, units) and get a structured workout. You can also rebuild a workout from a past activity.
- **Export / send**: save as ZWO, FIT, ERG, MRC or JSON, push to intervals.icu or your own backend, or bulk-export a zip of your library.

### Plan your training
- **Planning calendar**: place workouts on a calendar month view, with a fitness chart over time.
- **Training plans**: generate a multi-week plan (algorithmic or AI) from a goal, weekly schedule and session constraints, then edit any planned workout.
- **Planning shift and periods**: move planned sessions in bulk, review training periods.
- **Session analysis**: completed activities open under the calendar with detailed analysis.

### Ride indoors
- **Player**: run a session with a live power / heart-rate / cadence HUD, workout profile, timer, map and climb physics.
- **Smart trainer control** over Bluetooth: ERG mode (FTMS) and Tacx FE-C, plus slope/simulation mode and manual resistance nudges.
- **Devices**: pair heart-rate monitors, power meters and trainers over Bluetooth (Web Bluetooth).
- **Extras**: voice announcements, beeps, music (Jamendo), auto-pause, fullscreen mode, FTP selection per session.

### Track and analyse
- **intervals.icu integration**: fetch your profile, FTP (indoor/outdoor), weight, LTHR and max HR.
- **Dashboard widgets**: weather, training load, last ride, next workout, fitness, power zones, heat adaptation, VO2max tracking, best efforts.
- **Comparator**: compare sessions over time (effectiveness, power, HR) with charts.
- **AI coach**: session analysis and a coach chat, using your own API key (Gemini, Hugging Face or any OpenAI-compatible endpoint such as Groq, OpenRouter, Mistral, Cerebras). The library and editor work without any key.

### Everywhere
- English and French interface, multiple themes and fonts.
- Installable as a PWA. Works from any static host, or even opened as a local file.
- Optional self-hosted backend (the separate `api_flamecadence` project) that mirrors the intervals.icu API, so your data can stay on your own server.

## How the program is structured

The app was originally one big `flamecadence.html` file; this repository is that same app split into files, with **no build step and no dependencies**: plain HTML, CSS and JavaScript. Open `index.html` directly (double-click) or serve the folder with any static web server.

### Runtime model

- All scripts are classic `<script>` tags sharing **one global scope**. There are no modules and no `"use strict"`; never add `import`/`export`.
- `index.html` lists the `<link>` and `<script>` tags. **The script order is the former execution order of the single file: keep it.** A file may only *call at load time* functions defined in an earlier (or the same) file; wiring like `$("x").onclick = fn` is fine as long as `fn` is defined in the same or an earlier file.
- Two groups are kept together on purpose because of that rule: `js/tools/modes-and-tools.js` and `js/ui/app-shell.js`. Do not split them without moving their load-time calls (`applyBeta();` and the start-up line `loadWidgets(); loadOrder(); ...`).
- Adding a file means adding its `<script>` tag in `index.html` at the right position.

### Repository layout

- `index.html` — page markup plus the ordered `<link>` / `<script>` lists.
- `css/` — styles in the original cascade order: `base` → `settings` → `components` → `player` → `calendar-compare` → `look-and-responsive`. Later files override earlier ones.
- `js/boot/` — scripts run in `<head>` before first paint: PWA manifest, saved theme/font, visit counter.
- `js/core/` — foundation: version (`APP_VERSION` in `core.js`), `$`/`store`, theme, translations (`i18n.js`, EN/FR strings), UI helpers, settings dialog.
- `js/api/` — intervals.icu access, self-hosted backend mirror, FTP/profile helpers.
- `js/dashboard/` — weather, training load, last ride, AI analysis, widgets, next workout.
- `js/workout/` — workout text parser, preview chart, shrink/undo, generation.
- `js/library/` — workout library: built-in catalogue, blocks.zone, library UI, zip export, v2 data format, favourites.
- `js/workout-io/` — send/export, file import, GPX, rebuild from an activity, session comparator.
- `js/calendar/` — planning calendar, full calendar page, fitness chart.
- `js/editor/` — manual editor, draggable chart handles, editing a planned workout, training plan, AI plan.
- `js/player/` — climbs/physics, player session, HUD/map, trainer control and finish flow, timer/voice, music, runtime UI, Bluetooth devices.
- `js/tools/` — mode switching plus planning shift, periods, contact, coach chat, session analysis, bulk export.
- `js/ui/` — app shell (widgets, language, **start-up sequence**, guided tour) and glossary.

### Single-file build (optional)

`node build-single-file.js` merges `index.html`, all CSS and all JS back into one self-contained `flamecadence-single.html`, identical in behaviour to the folder version. Handy for sharing or uploading the whole app as a single file.

## License

GPL — see [LICENSE](LICENSE).
