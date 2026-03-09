/* ─────────────────────────────────────────────────
   search.js – YouTube search via backend proxy
────────────────────────────────────────────────── */

let _lastQuery = '';
let _nextPageToken = null;
let _loading = false;

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function searchTracks(query, pageToken = null) {
  if (_loading) return null;
  _loading = true;
  try {
    const params = new URLSearchParams({ q: query, maxResults: 24 });
    if (pageToken) params.set('pageToken', pageToken);
    const resp = await fetch(`/api/search?${params}`);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    _lastQuery = query;
    _nextPageToken = data.nextPageToken || null;
    return data;
  } finally {
    _loading = false;
  }
}

export function getNextPageToken() { return _nextPageToken; }
export function isLoading() { return _loading; }

export function renderTrackGrid(container, tracks, currentId, onPlay) {
  if (tracks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>No results found</p>
      </div>`;
    return;
  }

  const html = tracks.map(track => `
    <div class="track-card${track.id === currentId ? ' playing' : ''}" data-id="${track.id}">
      <div class="track-card-thumb-wrap">
        <img class="track-card-thumb" src="${track.thumbnail}" alt="" loading="lazy"
          onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\'><rect width=\\'100\\' height=\\'100\\' fill=\\'%23333\\'/><text y=\\'.9em\\' font-size=\\'60\\' x=\\'20\\'>♪</text></svg>'" />
        <button class="track-card-play-btn" aria-label="Play ${escHtml(track.title)}">
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </button>
      </div>
      <div class="track-card-title" title="${escHtml(track.title)}">${escHtml(track.title)}</div>
      <div class="track-card-artist" title="${escHtml(track.channel)}">${escHtml(track.channel)}</div>
      <div class="track-card-duration">${track.duration || ''}</div>
    </div>
  `).join('');

  if (container.dataset.append === 'true') {
    // Remove empty state if present
    container.querySelector('.empty-state')?.remove();
    container.insertAdjacentHTML('beforeend', html);
    delete container.dataset.append;
  } else {
    container.innerHTML = html;
  }

  container.querySelectorAll('.track-card').forEach(card => {
    const trackId = card.dataset.id;
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    card.addEventListener('click', () => onPlay(track));
    card.querySelector('.track-card-play-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      onPlay(track);
    });
  });
}

export function updatePlayingCard(container, currentId) {
  container.querySelectorAll('.track-card').forEach(card => {
    card.classList.toggle('playing', card.dataset.id === currentId);
  });
}
