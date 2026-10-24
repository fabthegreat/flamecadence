<p align="center">
  <img src="logo.svg" width="80" height="80" alt="PaceForge Logo">
</p>

<h1 align="center">PaceForge</h1>

<p align="center">
  <b>Forge your next session: describe it, let AI build it, then send it straight to intervals.icu.</b>
</p>

---

## 🚀 Overview

**PaceForge** is a single-file web app that combines a structured-workout designer with a training dashboard for **intervals.icu**. Build a session with AI, by hand, from a library of 300+ templates, from a `.zwo` / `.fit` file, or from a ride you already did. Review it on an interactive chart, then send it to your calendar or export it for your head unit or trainer software. A set of sidebar widgets keeps your calendar, fitness, last workout, recent load and best efforts in view.

The interface is available in **English and French** and follows your system **light / dark** theme (or a manual choice).

---

## ✨ Key Features

### 🛠️ Ways to build a workout

* **🤖 AI generator:** Describe the session in plain English or French (e.g. *"1h15 endurance with 3 x 10 min threshold blocks, day before a long ride"*). Pick the sport (outdoor or virtual ride), duration, FTP source (indoor / outdoor) and units (% FTP or watts). The AI takes your recent activities and training load into account and explains why the session is built the way it is. Works with **Gemini** (model list loaded from your key, adjustable thinking level), **Hugging Face**, or any **OpenAI-compatible** API (Groq, OpenRouter, Mistral, …).
* **✍️ Manual editor:** Add warm-up, interval blocks with recovery, cool-down and free steps. Steps can be defined by time or distance, with intensity in % FTP, watts or % threshold pace, plus optional notes. Reorder with the ⠿ drag handles; the estimated duration updates live.
* **📚 Workout library:** 300+ ready-made sessions across recovery, endurance, tempo, threshold, VO2max, sprint, beginner and testing categories. Each card has a mini chart and stats, with search, duration filter and a ★ favourites list. Watts or % FTP follows your settings.
* **📅 Training plan builder:** Generate a multi-week plan (1–24 weeks) for a goal (base endurance, raise FTP, VO2max, sprint / punch, get started), with your choice of sessions per week, training days, preferred hard days (with a warning for back-to-back hard days), maximum session length and start date. Recovery weeks are inserted automatically, a weekly TSS chart shows the load progression, and any session can be swapped for a similar one or removed before you upload the whole plan to intervals.icu.
* **📥 Import:** Drop or pick a Zwift `.zwo` or Garmin `.fit` workout file and turn it into an editable preview.
* **🔁 From an activity:** Pick one of your recent rides and rebuild the intervals you actually rode, from its power data, as an editable workout. Output can be in % of the selected FTP or exact watts.

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

Each widget can be shown or hidden from the settings and has a shortcut to the matching intervals.icu page. Use the ▲ / ▼ buttons in a widget's header to **move it up or down**; the order is remembered in your browser and included in the exported settings JSON.

* **Calendar:** planned and completed sessions for the month. Hover a session for a preview chart (planned power profile, or the real power / speed / heart-rate curve of a completed activity). **Drag and drop** to move a planned workout to another day, **✕** to delete it, and **click an empty day** to open the manual editor with that date already set. Expand it to full screen for a chart on every session.
* **Fitness:** CTL, ATL and form (TSB) over a selectable period.
* **Last workout:** browse your latest activities with the previous / next buttons and get an **AI analysis** of the selected one.
* **Last two weeks:** daily training load, with CTL / ATL / form summary.
* **Best efforts:** power curve table for indoor or outdoor rides over 6 weeks, 12 weeks or one year.

### ⚙️ Settings and privacy

* **No backend, no account:** everything runs in your browser from `paceforge.html`. API calls go directly from your browser to intervals.icu and to the AI provider you chose.
* API keys and preferences are stored in your browser's local storage only. A button clears all saved keys, and settings (including the widget order) can be exported / imported as JSON.
* Built-in help dialog and keyboard-friendly tabs and controls.

---

## 🛠️ Getting Started

1. Open `paceforge.html` directly in any modern web browser.
2. Click the **⚙ Settings** button in the header.
3. In the **intervals.icu** tab, enter your **API key** and **Athlete ID** (found under *Developer Settings* on [intervals.icu/settings](https://intervals.icu/settings)).
4. In the **AI** tab, choose a provider and enter its key:
   * **Gemini** (free tier): get a key from [Google AI Studio](https://aistudio.google.com/apikey).
   * **Hugging Face:** create a token in your [HF settings](https://huggingface.co/settings/tokens).
   * **OpenAI-compatible:** use the base URL and key of your provider (e.g. [Groq](https://console.groq.com/keys), [OpenRouter](https://openrouter.ai/keys)).
5. Pick a mode (**Library**, **Manual editor**, **AI generator**, **Import**, **From activity** or **Plan builder**), build your session, check the preview and send it to your calendar.

The AI features need a provider key; everything else (library, manual editor, import, export) works without one. Features that read or write your calendar and training data need your intervals.icu key.

---

## 🙏 Credits

Many thanks to [intervals.icu](https://intervals.icu), the open training analytics and calendar platform PaceForge builds on.
