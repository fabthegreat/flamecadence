# FlameCadence

FlameCadence is a free, browser-based indoor cycling app: create your own workouts, run them with a smart trainer, and keep track of your training. Everything runs client-side, with optional integration to [intervals.icu](https://intervals.icu).

## Features

### Workout library and editor
- Browse a built-in library of classic workouts (intervals, sweet spot, ramps, etc.).
- Import workouts from blocks.zone, from files (ERG/ZWO/MRC...), or from a zip archive.
- Favourites and a v2 data format for your own saved workouts.
- Manual editor with a live preview chart and draggable chart handles, plus shrink/undo helpers.
- Generate a workout from a simple text description, or rebuild a workout from a past activity.

### AI assistance
- AI workout generation and AI training plans (weekly planning).
- AI analysis of your sessions and an AI coach chat.
- Requires your own API key; the library and editor work without any key.

### intervals.icu integration
- Fetch your profile, FTP (indoor/outdoor), weight, LTHR and max HR.
- Dashboard widgets: weather, training load, last ride, next workout, AI analysis.
- Send workouts back to intervals.icu, and export activities as FIT/GPX.

### Planning calendar
- Plan workouts on a calendar, view your fitness chart over time.
- Planning shift, training periods, bulk export.
- Session analysis opens under the calendar for completed activities.

### Player (indoor session)
- Run a workout with a live power/HR/cadence HUD and map.
- Smart trainer control over Bluetooth: ERG mode (FTMS) and Tacx FE-C, plus slope/simulation mode.
- Climb physics, timer with voice announcements, beeps, music, auto-pause.
- Bluetooth devices: heart rate, power meters, trainers.

### General
- English and French interface, multiple themes and fonts.
- Installable as a PWA; works from a static host or even a local file.
- Optional self-hosted backend (the `api_flamecadence` project) that mirrors the intervals.icu API, so your data can stay on your own server.

## How the program is structured

The app was originally a single `flamecadence.html` file; this repository is the same app split into files. Open `index.html` directly (double-click) or serve the folder with any static web server. There is no build step and no dependency: everything is plain HTML/CSS/JavaScript.

### Layout

- `index.html` — page markup plus the list of `<link>` / `<script>` tags (**the script order is the former execution order — keep it**).
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

### Rules to keep it working

1. All scripts are classic `<script>`s sharing ONE global scope (no modules, no `"use strict"`): do not add `import`/`export`.
2. The original code relied on functions being callable before the line where they are written. Across files that is no longer true for code that **runs at load time**. A file may therefore only *call at load time* functions defined in an earlier file. Wiring like `$("x").onclick = fn` is fine as long as `fn` is defined in the same or an earlier file.
3. Two groups are kept together on purpose because of rule 2: `js/tools/modes-and-tools.js` and `js/ui/app-shell.js`. Do not split them without moving the load-time calls (`applyBeta();` and the start-up line `loadWidgets(); loadOrder(); ...`).
4. New file = add its `<script>` tag in `index.html` at the right position.

### Single-file build (optional)

`node build-single-file.js` produces `flamecadence-single.html`, a self-contained copy identical in behaviour to this folder (handy for uploading the whole app as one file).

## License

GPL — see [LICENSE](LICENSE).
