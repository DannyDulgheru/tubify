/* ─────────────────────────────────────────────────
   playlist.js – Playlist CRUD (localStorage)
────────────────────────────────────────────────── */

const KEY = 'tubify_playlists';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch (_) { return []; }
}

function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); }
  catch (_) {}
  window.dispatchEvent(new CustomEvent('tubify:playlists-changed'));
}

export function getPlaylists() { return load(); }

export function getPlaylist(id) { return load().find(p => p.id === id) ?? null; }

export function createPlaylist(name) {
  const list = load();
  const pl = { id: `pl_${Date.now()}`, name, tracks: [], createdAt: Date.now() };
  list.push(pl);
  save(list);
  return pl;
}

export function deletePlaylist(id) {
  save(load().filter(p => p.id !== id));
}

export function renamePlaylist(id, name) {
  const list = load();
  const pl = list.find(p => p.id === id);
  if (pl) { pl.name = name; save(list); }
}

export function addTrackToPlaylist(playlistId, track) {
  const list = load();
  const pl = list.find(p => p.id === playlistId);
  if (!pl) return false;
  if (pl.tracks.find(t => t.id === track.id)) return false; // already in playlist
  pl.tracks.push(track);
  save(list);
  return true;
}

export function removeTrackFromPlaylist(playlistId, trackId) {
  const list = load();
  const pl = list.find(p => p.id === playlistId);
  if (!pl) return;
  pl.tracks = pl.tracks.filter(t => t.id !== trackId);
  save(list);
}

/* ── Rendering helpers ── */

const EMOJIS = ['🎵', '🎸', '🎹', '🎺', '🎻', '🥁', '🎷', '🎤', '🎧', '🎼'];
export function playlistEmoji(pl) {
  const hash = pl.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return EMOJIS[hash % EMOJIS.length];
}

export function renderPlaylistGrid(container, onOpen) {
  const list = load();
  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
        </svg>
        <p>No playlists yet. Create one!</p>
      </div>`;
    return;
  }
  container.innerHTML = list.map(pl => `
    <div class="playlist-card" data-id="${pl.id}">
      <div class="playlist-cover">${playlistEmoji(pl)}</div>
      <div class="playlist-card-name">${escHtml(pl.name)}</div>
      <div class="playlist-card-count">${pl.tracks.length} track${pl.tracks.length !== 1 ? 's' : ''}</div>
    </div>
  `).join('');
  container.querySelectorAll('.playlist-card').forEach(el => {
    el.addEventListener('click', () => onOpen(el.dataset.id));
  });
}

export function renderSidebarPlaylists(container, onOpen) {
  const list = load();
  container.innerHTML = list.map(pl => `
    <li class="playlist-sidebar-item" data-id="${pl.id}" title="${escHtml(pl.name)}">
      ${playlistEmoji(pl)} ${escHtml(pl.name)}
    </li>
  `).join('');
  container.querySelectorAll('.playlist-sidebar-item').forEach(el => {
    el.addEventListener('click', () => onOpen(el.dataset.id));
  });
}

export function renderPlaylistTracks(container, playlistId, onPlay, onRemove) {
  const pl = getPlaylist(playlistId);
  if (!pl || pl.tracks.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No tracks yet. Search and add some!</p></div>`;
    return;
  }
  container.innerHTML = pl.tracks.map((track, i) => `
    <div class="track-list-item" data-index="${i}" data-id="${track.id}">
      <span class="track-list-num">${i + 1}</span>
      <img class="track-list-thumb" src="${track.thumbnail}" alt="" loading="lazy" onerror="this.style.display='none'" />
      <div class="track-list-info">
        <div class="track-list-title">${escHtml(track.title)}</div>
        <div class="track-list-artist">${escHtml(track.channel)}</div>
      </div>
      <span class="track-list-duration">${track.duration || ''}</span>
      <div class="track-list-actions">
        <button class="btn-icon btn-remove-track" data-id="${track.id}" title="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6m4-6v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.track-list-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('.btn-remove-track')) return;
      onPlay(pl.tracks, parseInt(el.dataset.index, 10));
    });
  });
  container.querySelectorAll('.btn-remove-track').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      onRemove(playlistId, btn.dataset.id);
    });
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
