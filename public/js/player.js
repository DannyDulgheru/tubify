/* ─────────────────────────────────────────────────
   player.js – YouTube IFrame API wrapper
   ─────────────────────────────────────────────────
   Exports a singleton Player that manages the hidden
   YouTube iframe and fires custom DOM events so other
   modules can react without tight coupling.
   Events emitted on window:
     tubify:track-end   – current track finished
     tubify:state       – { playing: bool }
     tubify:progress    – { current, total }  (every second)
────────────────────────────────────────────────── */

let ytPlayer = null;
let progressTimer = null;
let pendingVideoId = null;
let _volume = 80;

function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function startProgressTimer() {
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
    try {
      const current = ytPlayer.getCurrentTime() || 0;
      const total = ytPlayer.getDuration() || 0;
      emit('tubify:progress', { current, total });
    } catch (_) { /* player not ready */ }
  }, 1000);
}

function stopProgressTimer() {
  clearInterval(progressTimer);
  progressTimer = null;
}

// Called by YouTube IFrame API when ready
window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player('yt-player', {
    height: '1',
    width: '1',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3,
      playsinline: 1,
    },
    events: {
      onReady(e) {
        e.target.setVolume(_volume);
        if (pendingVideoId) {
          ytPlayer.loadVideoById(pendingVideoId);
          pendingVideoId = null;
        }
      },
      onStateChange(e) {
        const S = YT.PlayerState;
        if (e.data === S.PLAYING) {
          startProgressTimer();
          emit('tubify:state', { playing: true });
        } else if (e.data === S.PAUSED || e.data === S.BUFFERING) {
          stopProgressTimer();
          emit('tubify:state', { playing: false });
        } else if (e.data === S.ENDED) {
          stopProgressTimer();
          emit('tubify:state', { playing: false });
          emit('tubify:track-end');
        }
      },
      onError(e) {
        console.warn('YouTube player error code:', e.data);
        emit('tubify:track-end');
      },
    },
  });
};

// Inject the player div if not present, then ensure API is loaded
(function initYT() {
  const container = document.getElementById('yt-player-container');
  if (!document.getElementById('yt-player')) {
    const div = document.createElement('div');
    div.id = 'yt-player';
    container.appendChild(div);
  }
  // If API already loaded (script race), trigger manually
  if (window.YT && window.YT.Player) {
    window.onYouTubeIframeAPIReady();
  }
})();

// ── Public API ──────────────────────────────────

export function play(videoId) {
  if (!ytPlayer || typeof ytPlayer.loadVideoById !== 'function') {
    pendingVideoId = videoId;
    return;
  }
  ytPlayer.loadVideoById(videoId);
}

export function togglePlayPause() {
  if (!ytPlayer) return;
  const state = ytPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
  else ytPlayer.playVideo();
}

export function pause() {
  ytPlayer?.pauseVideo?.();
}

export function resume() {
  ytPlayer?.playVideo?.();
}

export function seekTo(seconds) {
  ytPlayer?.seekTo?.(seconds, true);
}

export function setVolume(vol) {
  _volume = Math.max(0, Math.min(100, vol));
  ytPlayer?.setVolume?.(_volume);
}

export function getVolume() { return _volume; }

export function mute() { ytPlayer?.mute?.(); }
export function unMute() { ytPlayer?.unMute?.(); }
export function isMuted() { return ytPlayer?.isMuted?.() ?? false; }

export function getState() {
  if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return -1;
  return ytPlayer.getPlayerState();
}

export function isPlaying() {
  return getState() === 1; // YT.PlayerState.PLAYING
}
