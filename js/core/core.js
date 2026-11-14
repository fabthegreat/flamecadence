/* FlameCadence - Core: app version, $ helper, localStorage wrapper, theme (light/dark/auto) and site font */
const APP_VERSION = "1.7.1"; // à incrémenter à chaque mise à jour
document.getElementById("appVer").textContent = "FlameCadence v" + APP_VERSION;
"use strict";
const $ = id => document.getElementById(id);
const store = {get(k){ try{ return localStorage.getItem(k) || ""; }catch(e){ return ""; } }, set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }};
const LINKS = {coffee: "https://ko-fi.com/ftg99999", github: "https://github.com/fabthegreat/flamecadence"};
let lang = store.get("si_lang") === "fr" ? "fr" : "en";

// ---------- Thème clair / sombre / auto ----------
const THEME_ORDER = ["auto", "light", "dark"];
const THEME_ICON = {auto: "🌓", light: "☀️", dark: "🌙"};
const THEME_KEY = {auto: "thAuto", light: "thLight", dark: "thDark"};
let theme = store.get("si_theme"); if(!THEME_ORDER.includes(theme)) theme = "auto";
function applyTheme(){
  const root = document.documentElement;
  if(theme === "auto") delete root.dataset.theme; else root.dataset.theme = theme;
  const btn = document.getElementById("theme");
  if(btn){
    const lbl = t(THEME_KEY[theme]);
    btn.textContent = THEME_ICON[theme];
    btn.title = lbl;
    btn.setAttribute("aria-label", lbl);
    btn.setAttribute("data-ia", "title:" + THEME_KEY[theme] + ";aria-label:" + THEME_KEY[theme]);
  }
}

// ---------- Police du site ----------
// [clé, libellé, famille Google Fonts (vide = déjà chargée / police système), nom CSS pour le préchargement]
const FONTS = [["plex", "IBM Plex Sans", "", ""], ["system", "", "", ""], ["inter", "Inter", "Inter:wght@400;600", "Inter"], ["roboto", "Roboto", "Roboto:wght@400;700", "Roboto"],
  ["opensans", "Open Sans", "Open+Sans:wght@400;600", "Open Sans"], ["nunito", "Nunito", "Nunito:wght@400;600", "Nunito"], ["lexend", "Lexend", "Lexend:wght@400;600", "Lexend"],
  ["atkinson", "Atkinson Hyperlegible", "Atkinson+Hyperlegible:wght@400;700", "Atkinson Hyperlegible"], ["lora", "Lora (serif)", "Lora:wght@400;600", "Lora"], ["jbmono", "JetBrains Mono", "JetBrains+Mono:wght@400;600", "JetBrains Mono"]];
let font = store.get("si_font"); if(!FONTS.some(f => f[0] === font)) font = "plex";
function applyFont(){
  const root = document.documentElement, f = FONTS.find(x => x[0] === font);
  if(font === "plex") delete root.dataset.font; else root.dataset.font = font;
  if(f[2] && !document.getElementById("fl-" + font)){ // la police n'est téléchargée que si on la choisit
    const l = document.createElement("link"); l.id = "fl-" + font; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=" + f[2] + "&display=swap";
    l.onload = () => { if(document.fonts && document.fonts.load) document.fonts.load('16px "' + f[3] + '"').then(() => { if($("cfg").open) sizeCfg(); }).catch(() => {}); };
    document.head.appendChild(l);
  }
  if($("cfg") && $("cfg").open) sizeCfg();
}
function fontUI(){
  const s = $("fontsel"); if(!s) return;
  s.innerHTML = FONTS.map(f => `<option value="${f[0]}">${f[0] === "system" ? t("fontSys") : f[1]}</option>`).join("");
  s.value = font; applyFont();
}

