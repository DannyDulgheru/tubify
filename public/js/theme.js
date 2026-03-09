/* ─────────────────────────────────────────────────
   theme.js – Theme & accent color management
────────────────────────────────────────────────── */

const THEMES = ['dark', 'grey', 'light'];
const ACCENTS = ['green', 'purple', 'blue', 'red', 'orange'];
const PREFS_KEY = 'tubify_theme';

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; }
  catch (_) { return {}; }
}

function savePrefs(prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }
  catch (_) {}
}

export function applyTheme(theme, accent) {
  const root = document.documentElement;
  if (theme) root.setAttribute('data-theme', theme);
  if (accent) root.setAttribute('data-accent', accent);
}

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

export function getAccent() {
  return document.documentElement.getAttribute('data-accent') || 'green';
}

export function cycleTheme() {
  const current = getTheme();
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  applyTheme(next, null);
  const prefs = loadPrefs();
  prefs.theme = next;
  savePrefs(prefs);
  return next;
}

export function cycleAccent() {
  const current = getAccent();
  const next = ACCENTS[(ACCENTS.indexOf(current) + 1) % ACCENTS.length];
  applyTheme(null, next);
  const prefs = loadPrefs();
  prefs.accent = next;
  savePrefs(prefs);
  return next;
}

export function initTheme() {
  const prefs = loadPrefs();
  applyTheme(prefs.theme || 'dark', prefs.accent || 'green');
}
