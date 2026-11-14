# FlameCadence — modular source

Same app as the former single `flamecadence.html`, split into files. Open `index.html` (double-click or any static web server).

## Layout
- `index.html` — page markup + the list of `<link>` / `<script>` tags (**the script order is the former execution order — keep it**).
- `css/` — styles in the original cascade order (`base` → `settings` → `components` → `player` → `calendar-compare` → `look-and-responsive`). Later files override earlier ones.
- `js/boot/` — small scripts run in `<head>` (PWA manifest, saved theme/font applied before first paint, visit counter).
- `js/core/` — version (`APP_VERSION` is in `core.js`), `$`/`store`, theme, translations (`i18n.js`: EN/FR strings), UI helpers, settings dialog.
- `js/api/` — intervals.icu access, backend mirror, FTP/profile helpers.
- `js/dashboard/` — weather, training load, last ride, AI analysis, widgets, next workout.
- `js/workout/` — workout text parser, preview chart, shrink/undo, generation.
- `js/library/` — workout library (built-in, blocks.zone, extended UI, zip, v2 data, favourites).
- `js/workout-io/` — send/export, import files, GPX, rebuild from an activity, comparator.
- `js/calendar/` — planning calendar, calendar page, fitness chart.
- `js/editor/` — manual editor, chart handles, edit a planned workout, training plan, AI plan.
- `js/player/` — climbs/physics, player session, HUD/map, trainer + finish, timer/voice, music, runtime UI, Bluetooth devices.
- `js/tools/` — modes + planning shift/periods/contact/coach chat/session analysis, bulk export.
- `js/ui/` — app shell (widgets, language, **start-up sequence**, guided tour), glossary.

## Rules to keep it working
1. All scripts are classic `<script>`s sharing ONE global scope (no modules, no `"use strict"`): do not add `import`/`export`.
2. The original code relied on functions being callable before the line where they are written. Across files that is no longer true for code that **runs at load time**. A file may therefore only *call at load time* functions defined in an earlier file. Wiring like `$("x").onclick = fn` is fine as long as `fn` is defined in the same or an earlier file.
3. Two groups are kept together on purpose because of rule 2: `js/tools/modes-and-tools.js` and `js/ui/app-shell.js`. Do not split them without moving the load-time calls (`applyBeta();` and the start-up line `loadWidgets(); loadOrder(); ...`).
4. New file = add its `<script>` tag in `index.html` at the right position.

## Single-file build (optional)
`node build-single-file.js` produces `flamecadence-single.html`, a self-contained copy identical in behaviour to this folder (handy for uploading the whole app as one file).
