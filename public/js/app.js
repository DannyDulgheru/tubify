/* ─────────────────────────────────────────────────
   app.js – Bootstrap & integration
   Entry point for Tubify SPA.
────────────────────────────────────────────────── */

import * as Player from './player.js';
import * as Queue from './queue.js';
import * as Search from './search.js';
import { addToHistory, getHistory, clearHistory, renderHistory } from './history.js';
import {
  getPlaylists, getPlaylist, createPlaylist, deletePlaylist, renamePlaylist,
  addTrackToPlaylist, removeTrackFromPlaylist, playlistEmoji,
  renderPlaylistGrid, renderSidebarPlaylists, renderPlaylistTracks,
} from './playlist.js';
import { initTheme, applyTheme, getTheme, getAccent } from './theme.js';

/* ═══════════════════════════════════════════════
   DOM refs
═══════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

const sections = {
  search:    $('section-search'),
  history:   $('section-history'),
  playlists: $('section-playlists'),
  queue:     $('section-queue'),
  settings:  $('section-settings'),
};

// Search
const searchInput   = $('search-input');
const searchClear   = $('btn-search-clear');
const trackGrid     = $('track-grid');
const searchTitle   = $('search-section-title');
const resultCount   = $('search-result-count');
const loadMoreWrap  = $('load-more-wrap');
const btnLoadMore   = $('btn-load-more');
const viewToggle    = $('view-toggle');

// History
const historyList      = $('history-list');
const btnClearHistory  = $('btn-clear-history');

// Playlists
const playlistGrid      = $('playlist-grid');
const playlistDetail    = $('playlist-detail');
const playlistsContainer = $('playlists-container');
const playlistDetailName = $('playlist-detail-name');
const playlistDetailCount = $('playlist-detail-count');
const playlistTracks    = $('playlist-tracks');
const playlistCoverBig  = $('playlist-cover-big');
const btnBackPlaylists  = $('btn-back-playlists');
const btnPlayPlaylist   = $('btn-play-playlist');
const btnDeletePlaylist = $('btn-delete-playlist');
const btnCreatePlaylistMain = $('btn-create-playlist-main');
const sidebarPlaylistList = $('playlist-sidebar-list');

// Queue
const queueList     = $('queue-list');
const btnClearQueue = $('btn-clear-queue');

// Player
const btnPlayPause  = $('btn-play-pause');
const btnPrev       = $('btn-prev');
const btnNext       = $('btn-next');
const btnShuffle    = $('btn-shuffle');
const btnRepeat     = $('btn-repeat');
const btnMute       = $('btn-mute');
const btnTheme      = $('btn-theme');
const btnAddToPlaylist = $('btn-add-to-playlist');

const playerThumb   = $('player-thumb');
const playerTitle   = $('player-title');
const playerArtist  = $('player-artist');

const iconPlay      = btnPlayPause.querySelector('.icon-play');
const iconPause     = btnPlayPause.querySelector('.icon-pause');
const iconVol       = btnMute.querySelector('.icon-vol');
const iconMute      = btnMute.querySelector('.icon-mute');

const progressRange = $('progress-range');
const progressFill  = $('progress-bar-fill');
const timeCurrent   = $('time-current');
const timeTotal     = $('time-total');

const volumeRange   = $('volume-range');
const volumeFill    = $('volume-bar-fill');

// Modals
const modalCreatePlaylist  = $('modal-create-playlist');
const newPlaylistNameInput = $('new-playlist-name');
const btnConfirmPlaylist   = $('btn-confirm-playlist');
const btnCancelPlaylist    = $('btn-cancel-playlist');
const btnCreatePlaylistSidebar = $('btn-create-playlist');

const modalAddToPlaylist   = $('modal-add-to-playlist');
const modalPlaylistList    = $('modal-playlist-list');
const btnCancelAddPlaylist = $('btn-cancel-add-playlist');

const toastContainer = $('toast-container');

/* ═══════════════════════════════════════════════
   State
═══════════════════════════════════════════════ */
let currentSection = 'search';
let activePlaylistId = null;
let _searchResults = [];
let _pendingAddTrack = null;
let _currentView = loadSetting('viewMode', 'grid'); // 'grid' | 'list' | 'compact'

/* ═══════════════════════════════════════════════
   Init
═══════════════════════════════════════════════ */
initTheme();

// Apply saved theme/accent from settings (overrides tubify_theme legacy key)
{
  const s = (() => { try { return JSON.parse(localStorage.getItem('tubify_settings')) || {}; } catch(_){ return {}; } })();
  if (s.theme || s.accent) applyTheme(s.theme || null, s.accent || null);
}

updateVolumeUI(Player.getVolume());
updateShuffleUI();
updateRepeatUI();
applyViewMode(_currentView);
syncSettingsUI();

/* ═══════════════════════════════════════════════
   Navigation
═══════════════════════════════════════════════ */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    navigateTo(btn.dataset.section);
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // sync mobile nav
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.section === btn.dataset.section));
  });
});

function navigateTo(section) {
  currentSection = section;
  Object.entries(sections).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== section);
  });
  if (section === 'history') refreshHistory();
  if (section === 'playlists') refreshPlaylists();
  if (section === 'queue') refreshQueue();
  if (section === 'settings') syncSettingsUI();
}

/* ═══════════════════════════════════════════════
   View Mode
═══════════════════════════════════════════════ */
function applyViewMode(mode) {
  _currentView = mode;
  trackGrid.classList.remove('view-list', 'view-compact');
  if (mode === 'list') trackGrid.classList.add('view-list');
  if (mode === 'compact') trackGrid.classList.add('view-compact');

  // Wrap card content in info div for list/compact if needed
  if (mode !== 'grid') restructureCardsForList();

  // Update toggle buttons
  viewToggle.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === mode);
  });
  // Update settings buttons
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === mode);
  });
}

function restructureCardsForList() {
  trackGrid.querySelectorAll('.track-card').forEach(card => {
    if (card.querySelector('.track-card-info')) return;
    const title    = card.querySelector('.track-card-title');
    const artist   = card.querySelector('.track-card-artist');
    const duration = card.querySelector('.track-card-duration');
    const info = document.createElement('div');
    info.className = 'track-card-info';
    title.before(info);
    info.append(title, artist);
    card.appendChild(duration);
  });
}

// View toggle buttons (in search header)
viewToggle.addEventListener('click', e => {
  const btn = e.target.closest('.view-toggle-btn');
  if (!btn) return;
  const mode = btn.dataset.view;
  saveSetting('viewMode', mode);
  applyViewMode(mode);
});

/* ═══════════════════════════════════════════════
   Search
═══════════════════════════════════════════════ */
let searchDebounce = null;

searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  const q = searchInput.value.trim();
  if (!q) { resetSearch(); return; }
  searchDebounce = setTimeout(() => doSearch(q, false), 500);
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    clearTimeout(searchDebounce);
    const q = searchInput.value.trim();
    if (q) doSearch(q, false);
  }
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  resetSearch();
  searchInput.focus();
});

btnLoadMore.addEventListener('click', () => {
  const token = Search.getNextPageToken();
  if (token) {
    trackGrid.dataset.append = 'true';
    doSearch(searchInput.value.trim(), true, token);
  }
});

function resetSearch() {
  searchTitle.textContent = 'Welcome to Tubify';
  resultCount.textContent = '';
  trackGrid.innerHTML = `
    <div class="empty-state" id="search-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <p>Search for music on YouTube</p>
    </div>`;
  loadMoreWrap.style.display = 'none';
  _searchResults = [];
}

async function doSearch(query, append = false, pageToken = null) {
  if (!append) {
    searchTitle.textContent = `Results for "${query}"`;
    resultCount.textContent = 'Loading…';
    trackGrid.innerHTML = '';
  }
  loadMoreWrap.style.display = 'none';

  try {
    const data = await Search.searchTracks(query, pageToken);
    if (!data) return;

    if (append) {
      _searchResults = [..._searchResults, ...data.tracks];
    } else {
      _searchResults = data.tracks;
    }

    resultCount.textContent = `${_searchResults.length} tracks`;

    const currentTrack = Queue.getCurrentTrack();
    Search.renderTrackGrid(trackGrid, data.tracks, currentTrack?.id, onTrackPlay);
    // Apply current view mode to newly rendered cards
    applyViewMode(_currentView);

    if (data.nextPageToken) loadMoreWrap.style.display = 'block';
  } catch (err) {
    resultCount.textContent = '';
    trackGrid.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
    console.error('Search failed:', err);
  }
}

function onTrackPlay(track) {
  // Set ALL search results as the queue so Next/Prev work in search context
  const idx = _searchResults.findIndex(t => t.id === track.id);
  Queue.setQueue(_searchResults, idx >= 0 ? idx : 0);
  playCurrentTrack();
}

/* ═══════════════════════════════════════════════
   Playback
═══════════════════════════════════════════════ */
function playCurrentTrack() {
  const track = Queue.getCurrentTrack();
  if (!track) return;
  Player.play(track.id);
  updatePlayerUI(track);
  addToHistory(track);
  Search.updatePlayingCard(trackGrid, track.id);
  if (currentSection === 'queue') refreshQueue();
  updateMediaSession(track);
  keepAudioSessionAlive();
}

function updatePlayerUI(track) {
  if (!track) return;
  playerTitle.textContent = track.title;
  playerArtist.textContent = track.channel;
  playerThumb.src = track.thumbnail || '';
  document.title = `${track.title} – Tubify`;
  // Sync mini player
  updateMiniPlayer(track);
  // Sync fullscreen player
  updateFullscreenPlayer(track);
}

// Player events
window.addEventListener('tubify:state', e => {
  const playing = e.detail.playing;
  // Desktop player bar
  iconPlay.classList.toggle('hidden', playing);
  iconPause.classList.toggle('hidden', !playing);
  // Mini player
  syncMiniPlayIcon(playing);
  // Fullscreen player
  syncFsPlayIcon(playing);
});

window.addEventListener('tubify:track-end', () => {
  const next = Queue.next();
  if (next) playCurrentTrack();
  else {
    iconPlay.classList.remove('hidden');
    iconPause.classList.add('hidden');
    syncMiniPlayIcon(false);
    syncFsPlayIcon(false);
  }
});

window.addEventListener('tubify:progress', e => {
  const { current, total } = e.detail;
  if (total > 0) {
    const pct = (current / total) * 100;
    progressFill.style.width = `${pct}%`;
    progressRange.value = pct;
    // Mini progress bar
    miniProgressBar.style.width = `${pct}%`;
    // Fullscreen progress
    fsProgressFill.style.width = `${pct}%`;
    fsProgressRange.value = pct;
  }
  timeCurrent.textContent = formatTime(current);
  timeTotal.textContent = formatTime(total);
  fsTimeCurrent.textContent = formatTime(current);
  fsTimeTotal.textContent = formatTime(total);
});

// Player controls
btnPlayPause.addEventListener('click', () => Player.togglePlayPause());
btnNext.addEventListener('click', () => { const t = Queue.next(); if (t) playCurrentTrack(); });
btnPrev.addEventListener('click', () => { const t = Queue.prev(); if (t) playCurrentTrack(); });

btnShuffle.addEventListener('click', () => {
  Queue.toggleShuffle();
  updateShuffleUI();
});

btnRepeat.addEventListener('click', () => {
  Queue.toggleRepeat();
  updateRepeatUI();
});

btnMute.addEventListener('click', () => {
  if (Player.isMuted()) {
    Player.unMute();
    iconVol.classList.remove('hidden');
    iconMute.classList.add('hidden');
  } else {
    Player.mute();
    iconVol.classList.add('hidden');
    iconMute.classList.remove('hidden');
  }
});

// Theme button → go to settings
btnTheme.addEventListener('click', () => {
  navigateTo('settings');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.section === 'settings'));
});

// Progress seek
progressRange.addEventListener('input', () => {
  const pct = parseFloat(progressRange.value);
  progressFill.style.width = `${pct}%`;
});
progressRange.addEventListener('change', () => {
  const pct = parseFloat(progressRange.value) / 100;
  // We need duration; emit from progress event gives us total
  // Read from last known total
  if (_lastTotal > 0) Player.seekTo(pct * _lastTotal);
});
let _lastTotal = 0;
window.addEventListener('tubify:progress', e => { _lastTotal = e.detail.total; });

// Volume
volumeRange.addEventListener('input', () => {
  const vol = parseInt(volumeRange.value, 10);
  Player.setVolume(vol);
  updateVolumeUI(vol);
  if (vol === 0) { iconVol.classList.add('hidden'); iconMute.classList.remove('hidden'); }
  else { iconVol.classList.remove('hidden'); iconMute.classList.add('hidden'); }
});

function updateVolumeUI(vol) {
  volumeRange.value = vol;
  volumeFill.style.width = `${vol}%`;
}

function updateShuffleUI() {
  btnShuffle.classList.toggle('active', Queue.isShuffle());
}

function updateRepeatUI() {
  const r = Queue.getRepeat();
  btnRepeat.classList.toggle('active', r !== 'none');
  btnRepeat.title = r === 'one' ? 'Repeat: One' : r === 'all' ? 'Repeat: All' : 'Repeat: Off';
}

/* ═══════════════════════════════════════════════
   History Section
═══════════════════════════════════════════════ */
function refreshHistory() {
  renderHistory(historyList, track => {
    Queue.setQueue([track], 0);
    playCurrentTrack();
    navigateTo('search');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.section === 'search'));
  });
}

btnClearHistory.addEventListener('click', () => {
  clearHistory();
  refreshHistory();
  showToast('History cleared');
});

/* ═══════════════════════════════════════════════
   Playlists Section
═══════════════════════════════════════════════ */
function refreshPlaylists() {
  renderSidebarPlaylists(sidebarPlaylistList, openPlaylist);
  if (activePlaylistId) {
    showPlaylistDetail(activePlaylistId);
  } else {
    playlistGrid.classList.remove('hidden');
    playlistDetail.classList.add('hidden');
    renderPlaylistGrid(playlistGrid, openPlaylist);
  }
}

function openPlaylist(id) {
  activePlaylistId = id;
  navigateTo('playlists');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.section === 'playlists'));
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.section === 'playlists'));
  showPlaylistDetail(id);
}

function showPlaylistDetail(id) {
  const pl = getPlaylist(id);
  if (!pl) { activePlaylistId = null; refreshPlaylists(); return; }
  playlistGrid.classList.add('hidden');
  playlistDetail.classList.remove('hidden');
  playlistCoverBig.textContent = playlistEmoji(pl);
  playlistDetailName.textContent = pl.name;
  playlistDetailCount.textContent = `${pl.tracks.length} track${pl.tracks.length !== 1 ? 's' : ''}`;
  renderPlaylistTracks(playlistTracks, id,
    (tracks, startIndex) => { Queue.setQueue(tracks, startIndex); playCurrentTrack(); },
    (plId, trackId) => { removeTrackFromPlaylist(plId, trackId); showPlaylistDetail(id); showToast('Removed from playlist'); }
  );
}

btnBackPlaylists.addEventListener('click', () => {
  activePlaylistId = null;
  playlistDetail.classList.add('hidden');
  playlistGrid.classList.remove('hidden');
  renderPlaylistGrid(playlistGrid, openPlaylist);
});

btnPlayPlaylist.addEventListener('click', () => {
  const pl = getPlaylist(activePlaylistId);
  if (!pl || pl.tracks.length === 0) return showToast('Playlist is empty');
  Queue.setQueue(pl.tracks, 0);
  playCurrentTrack();
});

btnDeletePlaylist.addEventListener('click', () => {
  if (!activePlaylistId) return;
  if (!confirm('Delete this playlist?')) return;
  deletePlaylist(activePlaylistId);
  activePlaylistId = null;
  refreshPlaylists();
  showToast('Playlist deleted');
});

playlistDetailName.addEventListener('blur', () => {
  if (!activePlaylistId) return;
  const name = playlistDetailName.textContent.trim();
  if (name) { renamePlaylist(activePlaylistId, name); renderSidebarPlaylists(sidebarPlaylistList, openPlaylist); }
});

/* ═══════════════════════════════════════════════
   Create Playlist Modal
═══════════════════════════════════════════════ */
function openCreatePlaylistModal() {
  newPlaylistNameInput.value = '';
  modalCreatePlaylist.classList.remove('hidden');
  setTimeout(() => newPlaylistNameInput.focus(), 50);
}

btnCreatePlaylistSidebar.addEventListener('click', openCreatePlaylistModal);
btnCreatePlaylistMain.addEventListener('click', openCreatePlaylistModal);
btnCancelPlaylist.addEventListener('click', () => modalCreatePlaylist.classList.add('hidden'));
modalCreatePlaylist.addEventListener('click', e => { if (e.target === modalCreatePlaylist) modalCreatePlaylist.classList.add('hidden'); });

btnConfirmPlaylist.addEventListener('click', () => {
  const name = newPlaylistNameInput.value.trim();
  if (!name) return newPlaylistNameInput.focus();
  createPlaylist(name);
  modalCreatePlaylist.classList.add('hidden');
  refreshPlaylists();
  showToast(`Playlist "${name}" created`);
});

newPlaylistNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnConfirmPlaylist.click(); });

/* ═══════════════════════════════════════════════
   Add to Playlist Modal
═══════════════════════════════════════════════ */
btnAddToPlaylist.addEventListener('click', () => {
  const track = Queue.getCurrentTrack();
  if (!track) return showToast('No track playing');
  openAddToPlaylistModal(track);
});

function openAddToPlaylistModal(track) {
  _pendingAddTrack = track;
  const playlists = getPlaylists();
  if (playlists.length === 0) {
    openCreatePlaylistModal();
    return;
  }
  modalPlaylistList.innerHTML = playlists.map(pl => `
    <li class="modal-playlist-item" data-id="${pl.id}">
      <span>${playlistEmoji(pl)}</span>
      <span>${escHtml(pl.name)}</span>
      <span style="color:var(--text-muted);font-size:12px;margin-left:auto">${pl.tracks.length} tracks</span>
    </li>
  `).join('');
  modalPlaylistList.querySelectorAll('.modal-playlist-item').forEach(item => {
    item.addEventListener('click', () => {
      const added = addTrackToPlaylist(item.dataset.id, _pendingAddTrack);
      modalAddToPlaylist.classList.add('hidden');
      showToast(added ? 'Added to playlist' : 'Already in playlist');
      if (currentSection === 'playlists') refreshPlaylists();
    });
  });
  modalAddToPlaylist.classList.remove('hidden');
}

btnCancelAddPlaylist.addEventListener('click', () => modalAddToPlaylist.classList.add('hidden'));
modalAddToPlaylist.addEventListener('click', e => { if (e.target === modalAddToPlaylist) modalAddToPlaylist.classList.add('hidden'); });

// Also allow adding from search results via right-click context or dedicated button
window.addEventListener('tubify:add-to-playlist', e => openAddToPlaylistModal(e.detail.track));

/* ═══════════════════════════════════════════════
   Queue Section
═══════════════════════════════════════════════ */
function refreshQueue() {
  const queue = Queue.getQueue();
  const currentIdx = Queue.getCurrentIndex();

  if (queue.length === 0) {
    queueList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
        </svg>
        <p>Your queue is empty</p>
      </div>`;
    return;
  }

  queueList.innerHTML = queue.map((track, i) => `
    <div class="track-list-item${i === currentIdx ? ' playing' : ''}" data-index="${i}">
      <span class="track-list-num">${i === currentIdx ? '▶' : i + 1}</span>
      <img class="track-list-thumb" src="${track.thumbnail}" alt="" loading="lazy" onerror="this.style.display='none'" />
      <div class="track-list-info">
        <div class="track-list-title">${escHtml(track.title)}</div>
        <div class="track-list-artist">${escHtml(track.channel)}</div>
      </div>
      <span class="track-list-duration">${track.duration || ''}</span>
      <div class="track-list-actions">
        <button class="btn-icon btn-remove-queue" data-index="${i}" title="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');

  queueList.querySelectorAll('.track-list-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('.btn-remove-queue')) return;
      const idx = parseInt(el.dataset.index, 10);
      Queue.playAt(idx);
      playCurrentTrack();
    });
  });
  queueList.querySelectorAll('.btn-remove-queue').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      Queue.removeFromQueue(parseInt(btn.dataset.index, 10));
      refreshQueue();
    });
  });
}

btnClearQueue.addEventListener('click', () => {
  Queue.clearQueue();
  refreshQueue();
  showToast('Queue cleared');
});

window.addEventListener('tubify:queue-changed', () => {
  if (currentSection === 'queue') refreshQueue();
});

/* ═══════════════════════════════════════════════
   Playlist sidebar reactivity
═══════════════════════════════════════════════ */
window.addEventListener('tubify:playlists-changed', () => {
  renderSidebarPlaylists(sidebarPlaylistList, openPlaylist);
});
renderSidebarPlaylists(sidebarPlaylistList, openPlaylist);

/* ═══════════════════════════════════════════════
   Settings Section
═══════════════════════════════════════════════ */
function syncSettingsUI() {
  const theme  = getTheme();
  const accent = getAccent();
  const view   = _currentView;
  const maxRes = loadSetting('maxResults', '24');
  const autoplay = loadSetting('autoplay', 'true') === 'true';
  const saveHist = loadSetting('saveHistory', 'true') === 'true';

  // Theme swatches
  document.querySelectorAll('.theme-swatch').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === theme);
  });
  // Accent swatches
  document.querySelectorAll('.accent-swatch').forEach(el => {
    el.classList.toggle('active', el.dataset.accent === accent);
  });
  // View mode buttons (settings)
  document.querySelectorAll('.view-mode-btn').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  // Max results
  const sel = $('settings-max-results');
  if (sel) sel.value = maxRes;
  // Toggles
  const ap = $('settings-autoplay');
  if (ap) ap.checked = autoplay;
  const sh = $('settings-history');
  if (sh) sh.checked = saveHist;
}

// Theme swatches
document.querySelectorAll('.theme-swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    applyTheme(btn.dataset.theme, null);
    saveSetting('theme', btn.dataset.theme);
    syncSettingsUI();
    showToast(`Theme: ${btn.dataset.theme}`);
  });
});

// Accent swatches
document.querySelectorAll('.accent-swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    applyTheme(null, btn.dataset.accent);
    saveSetting('accent', btn.dataset.accent);
    syncSettingsUI();
    showToast(`Accent: ${btn.dataset.accent}`);
  });
});

// View mode buttons (settings page)
document.querySelectorAll('.view-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    saveSetting('viewMode', btn.dataset.view);
    applyViewMode(btn.dataset.view);
    showToast(`View: ${btn.dataset.view}`);
  });
});

// Max results
$('settings-max-results')?.addEventListener('change', e => {
  saveSetting('maxResults', e.target.value);
  showToast(`Results per search: ${e.target.value}`);
});

// Toggles
$('settings-autoplay')?.addEventListener('change', e => {
  saveSetting('autoplay', e.target.checked ? 'true' : 'false');
});
$('settings-history')?.addEventListener('change', e => {
  saveSetting('saveHistory', e.target.checked ? 'true' : 'false');
});

// Clear all data
$('btn-clear-all-data')?.addEventListener('click', () => {
  if (!confirm('This will delete ALL your playlists, history, and preferences. Continue?')) return;
  localStorage.clear();
  sessionStorage.clear();
  showToast('All data cleared');
  setTimeout(() => location.reload(), 1000);
});

/* ═══════════════════════════════════════════════
   Toast
═══════════════════════════════════════════════ */
function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/* ═══════════════════════════════════════════════
   Utilities
═══════════════════════════════════════════════ */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ═══════════════════════════════════════════════
   Settings helpers (localStorage key-value)
═══════════════════════════════════════════════ */
const SETTINGS_KEY = 'tubify_settings';

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
  catch (_) { return {}; }
}

function saveSetting(key, value) {
  const s = loadSettings();
  s[key] = value;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }
  catch (_) {}
}

function loadSetting(key, defaultVal) {
  return loadSettings()[key] ?? defaultVal;
}

/* ═══════════════════════════════════════════════
   Mobile Bottom Nav
═══════════════════════════════════════════════ */
document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    navigateTo(btn.dataset.section);
    // sync both desktop and mobile nav active state
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.section === btn.dataset.section));
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.section === btn.dataset.section));
  });
});

/* ═══════════════════════════════════════════════
   Service Worker (PWA)
═══════════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW registration failed:', err));
  });
}

/* ═══════════════════════════════════════════════
   Keyboard shortcuts
═══════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); Player.togglePlayPause(); }
  if (e.code === 'ArrowRight') { e.preventDefault(); const t = Queue.next(); if (t) playCurrentTrack(); }
  if (e.code === 'ArrowLeft') { e.preventDefault(); const t = Queue.prev(); if (t) playCurrentTrack(); }
});

/* ═══════════════════════════════════════════════
   MINI PLAYER
═══════════════════════════════════════════════ */
const miniPlayer         = $('mini-player');
const miniPlayerTrigger  = $('mini-player-trigger');
const miniThumb          = $('mini-thumb');
const miniTitle          = $('mini-title');
const miniArtist         = $('mini-artist');
const miniBtnPlayPause   = $('mini-btn-play-pause');
const miniBtnNext        = $('mini-btn-next');
const miniProgressBar    = $('mini-progress-bar');

function updateMiniPlayer(track) {
  if (!track) return;
  miniTitle.textContent  = track.title;
  miniArtist.textContent = track.channel;
  if (track.thumbnail) {
    miniThumb.src = track.thumbnail;
    miniThumb.style.display = 'block';
    miniPlayer.querySelector('.mini-thumb-placeholder').style.display = 'none';
  } else {
    miniThumb.style.display = 'none';
    miniPlayer.querySelector('.mini-thumb-placeholder').style.display = '';
  }
}

function syncMiniPlayIcon(playing) {
  miniBtnPlayPause.querySelector('.icon-play').classList.toggle('hidden', playing);
  miniBtnPlayPause.querySelector('.icon-pause').classList.toggle('hidden', !playing);
}

miniPlayerTrigger.addEventListener('click', openFullscreenPlayer);
miniBtnPlayPause.addEventListener('click', e => { e.stopPropagation(); Player.togglePlayPause(); });
miniBtnNext.addEventListener('click', e => { e.stopPropagation(); const t = Queue.next(); if (t) playCurrentTrack(); });

/* ═══════════════════════════════════════════════
   FULLSCREEN PLAYER
═══════════════════════════════════════════════ */
const fullscreenPlayer  = $('fullscreen-player');
const fsArt             = $('fs-art');
const fsArtPlaceholder  = $('fs-art-placeholder');
const fsTitleEl         = $('fs-title');
const fsArtistEl        = $('fs-artist');
const fsProgressFill    = $('fs-progress-fill');
const fsProgressRange   = $('fs-progress-range');
const fsTimeCurrent     = $('fs-time-current');
const fsTimeTotal       = $('fs-time-total');
const fsBtnPlayPause    = $('fs-btn-play-pause');
const fsBtnPrev         = $('fs-btn-prev');
const fsBtnNext         = $('fs-btn-next');
const fsBtnShuffle      = $('fs-btn-shuffle');
const fsBtnRepeat       = $('fs-btn-repeat');
const fsBtnClose        = $('fs-close-btn');
const fsBtnAddPlaylist  = $('fs-btn-add-playlist');
const fsVolumeRange     = $('fs-volume-range');
const fsVolumeFill      = $('fs-volume-fill');

function updateFullscreenPlayer(track) {
  if (!track) return;
  fsTitleEl.textContent  = track.title;
  fsArtistEl.textContent = track.channel;
  if (track.thumbnail) {
    fsArt.src = track.thumbnail;
    fsArt.style.display = 'block';
    fsArtPlaceholder.style.display = 'none';
  } else {
    fsArt.style.display = 'none';
    fsArtPlaceholder.style.display = '';
  }
  updateFsShuffleRepeatUI();
}

function syncFsPlayIcon(playing) {
  fsBtnPlayPause.querySelector('.icon-play').classList.toggle('hidden', playing);
  fsBtnPlayPause.querySelector('.icon-pause').classList.toggle('hidden', !playing);
}

function updateFsShuffleRepeatUI() {
  fsBtnShuffle.classList.toggle('active', Queue.isShuffle());
  const r = Queue.getRepeat();
  fsBtnRepeat.classList.toggle('active', r !== 'none');
}

function openFullscreenPlayer() {
  const track = Queue.getCurrentTrack();
  if (!track) return;
  updateFullscreenPlayer(track);
  syncFsPlayIcon(Player.isPlaying());
  fsVolumeRange.value = Player.getVolume();
  fsVolumeFill.style.width = `${Player.getVolume()}%`;
  fullscreenPlayer.classList.add('open');
  fullscreenPlayer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeFullscreenPlayer() {
  fullscreenPlayer.classList.remove('open');
  fullscreenPlayer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

fsBtnClose.addEventListener('click', closeFullscreenPlayer);

fsBtnPlayPause.addEventListener('click', () => Player.togglePlayPause());
fsBtnNext.addEventListener('click', () => { const t = Queue.next(); if (t) playCurrentTrack(); });
fsBtnPrev.addEventListener('click', () => { const t = Queue.prev(); if (t) playCurrentTrack(); });

fsBtnShuffle.addEventListener('click', () => {
  Queue.toggleShuffle();
  updateShuffleUI();
  updateFsShuffleRepeatUI();
});

fsBtnRepeat.addEventListener('click', () => {
  Queue.toggleRepeat();
  updateRepeatUI();
  updateFsShuffleRepeatUI();
});

fsBtnAddPlaylist.addEventListener('click', () => {
  const track = Queue.getCurrentTrack();
  if (track) openAddToPlaylistModal(track);
});

fsProgressRange.addEventListener('input', () => {
  const pct = parseFloat(fsProgressRange.value);
  fsProgressFill.style.width = `${pct}%`;
  progressFill.style.width = `${pct}%`;
  progressRange.value = pct;
});
fsProgressRange.addEventListener('change', () => {
  const pct = parseFloat(fsProgressRange.value) / 100;
  if (_lastTotal > 0) Player.seekTo(pct * _lastTotal);
});

fsVolumeRange.addEventListener('input', () => {
  const vol = parseInt(fsVolumeRange.value, 10);
  Player.setVolume(vol);
  fsVolumeFill.style.width = `${vol}%`;
  updateVolumeUI(vol);
});

/* ─ Vertical swipe-down on fullscreen player → close ─ */
let _fsTouchStartX = 0;
let _fsTouchStartY = 0;
let _fsTouchCurrX  = 0;
let _fsTouchCurrY  = 0;
let _fsSwipeDir    = null; // null | 'v' (only vertical tracked here)

fullscreenPlayer.addEventListener('touchstart', e => {
  _fsTouchStartX = e.touches[0].clientX;
  _fsTouchStartY = e.touches[0].clientY;
  _fsTouchCurrX  = _fsTouchStartX;
  _fsTouchCurrY  = _fsTouchStartY;
  _fsSwipeDir    = null;
  fullscreenPlayer.style.transition = 'none';
}, { passive: true });

fullscreenPlayer.addEventListener('touchmove', e => {
  _fsTouchCurrX = e.touches[0].clientX;
  _fsTouchCurrY = e.touches[0].clientY;
  const dx = Math.abs(_fsTouchCurrX - _fsTouchStartX);
  const dy = _fsTouchCurrY - _fsTouchStartY;

  // Lock direction after 12px — only track vertical swipe here
  if (!_fsSwipeDir && (Math.abs(dy) > 12 || dx > 12)) {
    _fsSwipeDir = dx > Math.abs(dy) ? 'h' : 'v';
  }

  // Only drag the panel for downward vertical swipes
  if (_fsSwipeDir === 'v' && dy > 0) {
    const drag = dy < 100 ? dy : 100 + (dy - 100) * 0.4;
    fullscreenPlayer.style.transform = `translateY(${drag}px)`;
  }
}, { passive: true });

fullscreenPlayer.addEventListener('touchend', () => {
  const dy = _fsTouchCurrY - _fsTouchStartY;
  const dur = '0.35s cubic-bezier(0.32,0.72,0,1)';

  if (_fsSwipeDir === 'v') {
    if (dy > 80) {
      fullscreenPlayer.style.transition = `transform ${dur}`;
      fullscreenPlayer.style.transform = 'translateY(100%)';
      setTimeout(() => {
        fullscreenPlayer.classList.remove('open');
        fullscreenPlayer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        fullscreenPlayer.style.transition = '';
        fullscreenPlayer.style.transform = '';
      }, 360);
    } else {
      fullscreenPlayer.style.transition = `transform ${dur}`;
      fullscreenPlayer.style.transform = 'translateY(0)';
      setTimeout(() => {
        fullscreenPlayer.style.transition = '';
        fullscreenPlayer.style.transform = '';
      }, 360);
    }
  } else {
    fullscreenPlayer.style.transition = '';
    fullscreenPlayer.style.transform = '';
  }
  _fsSwipeDir = null;
}, { passive: true });

/* ─ Horizontal swipe on ART area only → next / prev track ─ */
const fsArtWrap = fullscreenPlayer.querySelector('.fs-art-wrap');
let _artTouchStartX = 0;
let _artTouchStartY = 0;
let _artSwipeLocked = false;

fsArtWrap.addEventListener('touchstart', e => {
  _artTouchStartX = e.touches[0].clientX;
  _artTouchStartY = e.touches[0].clientY;
  _artSwipeLocked = false;
}, { passive: true });

fsArtWrap.addEventListener('touchmove', e => {
  const dx = e.touches[0].clientX - _artTouchStartX;
  const dy = e.touches[0].clientY - _artTouchStartY;
  // If movement is more horizontal than vertical, it's a track-swap swipe
  if (!_artSwipeLocked && Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    _artSwipeLocked = true;
    // Prevent the parent from starting a vertical drag
    _fsSwipeDir = 'h'; // tell parent handler to skip vertical
    fullscreenPlayer.style.transition = 'none';
    fullscreenPlayer.style.transform = '';
  }
}, { passive: true });

fsArtWrap.addEventListener('touchend', e => {
  if (!_artSwipeLocked) return;
  const dx = e.changedTouches[0].clientX - _artTouchStartX;
  _artSwipeLocked = false;
  if (dx < -50) {
    // Swipe left → next track
    const t = Queue.next(); if (t) playCurrentTrack();
  } else if (dx > 50) {
    // Swipe right → prev track
    const t = Queue.prev(); if (t) playCurrentTrack();
  }
  fullscreenPlayer.style.transform = '';
}, { passive: true });

/* ─ Swipe-up on mini player to open fullscreen ─ */
let _miniTouchStartY = 0;
miniPlayer.addEventListener('touchstart', e => {
  _miniTouchStartY = e.touches[0].clientY;
}, { passive: true });
miniPlayer.addEventListener('touchend', e => {
  const deltaY = e.changedTouches[0].clientY - _miniTouchStartY;
  if (deltaY < -30) openFullscreenPlayer();
}, { passive: true });

/* ═══════════════════════════════════════════════
   MEDIA SESSION API (lock screen controls + background audio)
═══════════════════════════════════════════════ */
function updateMediaSession(track) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title:  track.title,
    artist: track.channel,
    album:  'Tubify',
    artwork: [{ src: track.thumbnail || '/icon-512.png', sizes: '480x360', type: 'image/jpeg' }],
  });
  navigator.mediaSession.setActionHandler('play',          () => Player.resume());
  navigator.mediaSession.setActionHandler('pause',         () => Player.pause());
  navigator.mediaSession.setActionHandler('nexttrack',     () => { const t = Queue.next(); if (t) playCurrentTrack(); });
  navigator.mediaSession.setActionHandler('previoustrack', () => { const t = Queue.prev(); if (t) playCurrentTrack(); });
}

/* ─ Silent AudioContext loop – keeps iOS audio session alive when screen locks ─
   iOS auto-suspends AudioContext on user interaction. We resume it on every
   touch event so the audio session stays active.
*/
let _audioCtx = null;
let _audioGain = null;

function keepAudioSessionAlive() {
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      _audioGain = _audioCtx.createGain();
      _audioGain.gain.value = 0.001;
      _audioGain.connect(_audioCtx.destination);

      function scheduleLoop() {
        if (!_audioCtx) return;
        const src = _audioCtx.createBufferSource();
        // 4-second silent buffer (reduce overhead vs 1-second)
        src.buffer = _audioCtx.createBuffer(1, _audioCtx.sampleRate * 4, _audioCtx.sampleRate);
        src.connect(_audioGain);
        src.onended = scheduleLoop;
        src.start();
      }
      scheduleLoop();
    } else if (_audioCtx.state === 'suspended') {
      _audioCtx.resume().catch(() => {});
    }
  } catch (_) { /* AudioContext not available */ }
}

// Resume audio context on ANY user touch — iOS suspends it aggressively
function _resumeAudioCtx() {
  if (_audioCtx && _audioCtx.state === 'suspended') {
    _audioCtx.resume().catch(() => {});
  }
}
document.addEventListener('touchstart', _resumeAudioCtx, { passive: true });
document.addEventListener('touchend',   _resumeAudioCtx, { passive: true });

// Resume when PWA comes back to foreground
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) _resumeAudioCtx();
});
