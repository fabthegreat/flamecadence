<p align="center">
  <img src="logo.svg" width="80" height="80" alt="FlameCadence Logo">
</p>

<h1 align="center">FlameCadence</h1>

<p align="center">
  <b>Fire up your next session: describe it, let AI build it, then send it straight to intervals.icu.</b>
</p>

---

## 🚀 Overview

**FlameCadence** is a single-file web app that combines a structured-workout designer, a session analysis tool and a training dashboard for **intervals.icu**. Build a session with AI, by hand, from a library of 300+ templates, from a `.zwo` / `.fit` file, or from a ride you already did. Review it on an interactive chart, then send it to your calendar or export it for your head unit or trainer software. Then **ride it** with the built-in activity player (beta) connected to your Bluetooth trainer and heart-rate strap. Afterwards, analyze what you actually rode, and keep your calendar, fitness, recent load and best efforts in view with the sidebar widgets.

The interface is available in **English and French**, follows your system **light / dark** theme (or a manual choice), and can be **installed as an app** on your phone.

---

## ✨ Key Features

The main navigation has two groups: **Generate** (everything that builds a workout) and **Analyze** (everything that studies past sessions). A third group, **Run activity**, appears when you enable the beta option in the settings.

### 🛠️ Generate: ways to build a workout

* **🤖 AI generator:** Describe the session in plain English or French (e.g. *"1h15 endurance with 3 x 10 min threshold blocks, day before a long ride"*). Pick the sport (outdoor or virtual ride), duration, FTP source (indoor / outdoor) and units (% FTP or watts). The AI takes your recent activities and training load into account and explains why the session is built the way it is. Works with **Gemini** (model list loaded from your key, adjustable thinking level), **Hugging Face**, or any **OpenAI-compatible** API (Groq, OpenRouter, Mistral, …).
* **✍️ Manual editor:** Add warm-up, interval blocks with recovery, cool-down and free steps. Steps can be defined by time or distance, with intensity in % FTP, watts or % threshold pace, plus optional notes. Reorder with the ⠿ drag handles; the estimated duration updates live.
* **📚 Workout library:** 300+ ready-made sessions across recovery, endurance, tempo, threshold, VO2max, sprint, beginner and testing categories. Each card has a mini chart and stats, with search, duration filter and a ★ favourites list. Watts or % FTP follows your settings. Tick **"Match how I feel today"** and pick how you feel (great, good, so-so, tired, exhausted) to show only the sessions that suit your form: the harder types disappear as you get more tired, and sessions are capped in length when you are tired or exhausted.
* **📅 Training plan builder:** Generate a multi-week plan (1–24 weeks) for a goal (base endurance, raise FTP, VO2max, sprint / punch, get started), with your choice of sessions per week, training days, preferred hard days (with a warning for back-to-back hard days), maximum session length and start date. Recovery weeks are inserted automatically, a weekly TSS chart shows the load progression, and any session can be swapped for a similar one or removed before you upload the whole plan to intervals.icu.
* **📥 Import:** Drop or pick a Zwift `.zwo` or Garmin `.fit` workout file and turn it into an editable preview.
* **🔁 From an activity:** Pick one of your recent rides (or click a completed session in the calendar or the last-workout chart) and load it as an editable workout. If a **planned workout is paired with that ride** in intervals.icu, the original plan is restored exactly as scheduled. Otherwise the intervals you actually rode are rebuilt from the power data. Output can be in % of the selected FTP or exact watts.

### 🔬 Analyze: study what you rode

* **📈 Single session:** Pick a session from a small month calendar (each day shows a mini power profile of its rides, with ‹ › to change month) and get an intervals.icu-style view: key figures (time, distance, average power, normalized power, intensity, load, average heart rate, climb), a chart of power and heart rate with the FTP line and the work intervals shaded, and an **interval table** at the bottom with time, average and max power, normalized power, % FTP, average and max heart rate and cadence for each interval. Click a row to highlight the interval on the chart. It uses the intervals defined in intervals.icu, or detects them when there are none, and links back to the activity on intervals.icu.
* **🧬 Compare:** Describe a session shape such as `10x1'/1'`; FlameCadence scans your intervals.icu activities, finds the ones that roughly match, and superimposes watts, heart rate and cadence so you can see how the same workout evolved. Filter by workout type, period and name.

### 🚴 Run activity (beta): ride the session in the app

An experimental activity player, **off by default**. Tick **Beta: "Run activity" menu** in the settings (**Beta** tab) to add the **Run activity** group next to Generate and Analyze. It needs a browser with **Web Bluetooth** (Chrome, Edge or Brave on Android and desktop; not available on iPhone). In Brave, enable `brave://flags/#enable-web-bluetooth`.

* **Pick a workout:** Choose from your planned sessions in the intervals.icu calendar (today, missed or upcoming) or from a plan you built but have not yet sent. Search and filter by source.
* **Launch activity:** Opens the full-screen player **paused**, so you have time to get on the trainer and set up your phone. Nothing starts until you press **Start**.
* **Bluetooth devices:** Pair a **smart trainer** (FTMS, plus Tacx FE-C over Bluetooth) and/or a **heart-rate strap**. With no device paired, the player runs a simulation so you can try it; simulated rides are never saved.
* **ERG mode:** The trainer follows the target power of each step (ramps included). Nudge the whole session with **±5 W / ±10 W**, and skip with the **Previous / Next** step buttons.
* **Live display:** Current step and time left, target power with its % FTP, actual power with an on / high / low target indicator and zone, heart rate and cadence. The workout profile chart shows your position, with your **heart-rate curve traced in the background** once real data is coming in.
* **Countdown beeps:** Three short beeps in the last three seconds of each step and a longer one at the step change (can be turned off in the **Player** settings tab).
* **Optional metrics:** In the **Player** settings tab, tick the extra cards you want to see while riding: **step average power**, **session average power**, **energy (kJ)** and **decoupling** (power-to-heart-rate drift between the first and second half of the session, shown after 10 minutes of data). They use real Bluetooth data only.
* **Built for long sessions on a phone:** The screen stays awake, the session is saved and resumed if the page is reloaded, and the layout adapts when you switch to another app and Android shows its navigation bar (a tap brings back native full screen). An optional **keep-alive** mode (inaudible sound or media notification) stops Android from freezing the page in the background, and the media notification gives lock-screen play / pause and step controls.
* **Music (optional):** With a free Jamendo client ID, a music button plays a playlist whose tempo follows the intensity zone of the current step. Pick a genre in the settings.
* **When you finish:** A ride summary (duration, average power and heart rate, kJ, time in each zone). **Upload to intervals.icu** or **download a `.tcx`** file. At least 30 seconds of real power or heart-rate data is needed to save a ride.

### 📈 Interactive preview

* **Zone-coloured chart** with per-block tooltips (zone, power, duration).
* **Drag blocks to reorder** and **drag handles to resize** the duration or intensity of a block; the text description stays in sync.
* **Shorten** a long session (trims warm-up and cool-down, keeps the core) with one-click **Undo**.
* **Stats:** total duration, average power, normalized power, IF and estimated TSS, plus a time-in-zone bar.
* **Session explanation** describing the purpose and the intensity mix.
* **Fueling guide:** estimated energy burned, carbohydrates and fluid for the session.
* Editable name, date (with a calendar picker) and description before saving.

### 📤 Sending and exporting

* **Send to intervals.icu** with one click, as a single workout or as a whole plan.
* **Export** to Zwift (`.zwo`), Garmin (`.fit`), smart-trainer files (`.erg` in watts, `.mrc` in % FTP) or `.json` for backup and sharing.

### 📊 Dashboard widgets (intervals.icu)

The sidebar groups its widgets into three tabs so it stays short: **Agenda**, **Fitness** and **Analysis**. A tab disappears when all its widgets are hidden. Each widget can be shown or hidden from the settings and has a shortcut to the matching intervals.icu page. Use the ▲ / ▼ buttons in a widget's header to **move it up or down** within its tab; the order and the selected tab are remembered in your browser and the order is included in the exported settings JSON.

* **Agenda tab**
  * **Calendar:** planned and completed sessions for the month. Hover a session for a preview chart (planned power profile, or the real power / speed / heart-rate curve of a completed activity). **Drag and drop** to move a planned workout to another day, **✕** to delete it, and **click an empty day** to open the manual editor with that date already set. Expand it to full screen for a chart on every session.
  * **Next planned workout:** the next session on your calendar that you have not done yet.
  * **Week ahead weather:** the forecast for the coming days, to plan your rides.
* **Fitness tab**
  * **Fitness:** CTL, ATL and form (TSB) over a selectable period.
  * **Last two weeks:** daily training load, with CTL / ATL / form summary.
  * **VO₂max estimate:** estimated from your **best 5 minutes of power** over the last 7 days, 14 days or 6 weeks (your choice). If you have not done a maximal effort in that window, it falls back to your best of the last 6 weeks, or shows a lower bound (≥). A **second estimate from your heart rate** (steady 10-minute segments of the last 14 days, using your max and resting heart rate) leads when there is no recent maximal effort, never dropping below what your power has already shown. The value from your device is shown too when intervals.icu has one, along with the best 5 minutes over 6 weeks, 12 weeks and a year. These are estimates, accurate to roughly ±10% at best.
* **Analysis tab**
  * **Last workout:** browse your latest activities with the previous / next buttons and get an **AI analysis** of the selected one.
  * **Best efforts:** power curve table for indoor or outdoor rides over 6 weeks, 12 weeks or one year.
  * **Time in zones** and **Year heatmap:** where your training time goes, and a year-long view of your activity.

### ⚙️ Settings, privacy and install

* **No backend, no account:** everything runs in your browser from `flamecadence.html`. API calls go directly from your browser to intervals.icu and to the AI provider you chose.
* **Settings tabs:** AI, intervals.icu, profile, widgets, appearance (choice of site font), **Beta** and, once the beta option is ticked, **Player**. The music and keep-alive options only show when the beta option is on.
* API keys and preferences are stored in your browser's local storage only. A button clears all saved keys, and settings (including the widget order) can be exported / imported as JSON.
* **Install on your phone:** the **…** menu has an **Install app** entry. On Android it opens the browser's install prompt (or tells you where to find "Install app" / "Add to Home screen" in your browser's menu). The **guided tour** is in the same menu.
* Built-in help dialog and keyboard-friendly tabs and controls.

---

## 🛠️ Getting Started

1. Open `flamecadence.html` directly in any modern web browser.
2. Click the **⚙ Settings** button in the header.
3. In the **intervals.icu** tab, enter your **API key** and **Athlete ID** (found under *Developer Settings* on [intervals.icu/settings](https://intervals.icu/settings)).
4. In the **AI** tab, choose a provider and enter its key:
   * **Gemini** (free tier): get a key from [Google AI Studio](https://aistudio.google.com/apikey).
   * **Hugging Face:** create a token in your [HF settings](https://huggingface.co/settings/tokens).
   * **OpenAI-compatible:** use the base URL and key of your provider (e.g. [Groq](https://console.groq.com/keys), [OpenRouter](https://openrouter.ai/keys)).
5. Under **Generate**, pick a mode (**Library**, **Manual editor**, **AI generator**, **Import**, **From activity** or **Plan builder**), build your session, check the preview and send it to your calendar. Under **Analyze**, look at a single session or compare several.

The AI features need a provider key; everything else (library, manual editor, import, export) works without one. Features that read or write your calendar and training data need your intervals.icu key. If you open the **…** menu, you can take a guided tour of the main areas at any time.

### 📲 Hosting it as an installable app

To let browsers offer the install button, serve the app over **HTTPS** (for example with GitHub Pages). `flamecadence.html` is enough on its own: the web app manifest and the 192 / 512 px icons are generated by the page itself. Installation is not possible from a file opened directly (`file://`). The installed app opens in full screen.

---

## 🙏 Credits

Many thanks to [intervals.icu](https://intervals.icu), the open training analytics and calendar platform FlameCadence builds on.
