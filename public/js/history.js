/* ─────────────────────────────────────────────────
   history.js – Listening history (localStorage)
   Keeps the last 50 tracks with timestamp.
────────────────────────────────────────────────── */

const KEY = 'tubify_history';
const MAX = 50;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch (_) { return []; }
}

function saveHistory(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); }
  catch (_) {}
}

export function addToHistory(track) {
  let list = loadHistory();
  // Remove existing entry for same video
  list = list.filter(e => e.id !== track.id);
  list.unshift({ ...track, playedAt: Date.now() });
  if (list.length > MAX) list = list.slice(0, MAX);
  saveHistory(list);
}

export function getHistory() { return loadHistory(); }

export function clearHistory() { saveHistory([]); }

export function renderHistory(container, onPlay) {
  const list = loadHistory();
  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polyline points="12 8 12 12 14 14"/>
          <path d="M3.05 11a9 9 0 1 0 .5-4.5"/>
        </svg>
        <p>Your listening history will appear here</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map((track, i) => `
    <div class="track-list-item" data-index="${i}" data-id="${track.id}">
      <span class="track-list-num">${i + 1}</span>
      <img class="track-list-thumb" src="${track.thumbnail}" alt="" loading="lazy" onerror="this.style.display='none'" />
      <div class="track-list-info">
        <div class="track-list-title">${escHtml(track.title)}</div>
        <div class="track-list-artist">${escHtml(track.channel)} · ${formatAgo(track.playedAt)}</div>
      </div>
      <span class="track-list-duration">${track.duration || ''}</span>
    </div>
  `).join('');

  container.querySelectorAll('.track-list-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index, 10);
      onPlay(list[idx]);
    });
  });
}

function formatAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
