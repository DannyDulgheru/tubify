/* ─────────────────────────────────────────────────
   queue.js – Play queue management
────────────────────────────────────────────────── */

let _queue = [];
let _index = -1;
let _shuffle = false;
let _repeat = 'none'; // 'none' | 'one' | 'all'

function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function save() {
  try {
    sessionStorage.setItem('tubify_queue', JSON.stringify({ queue: _queue, index: _index, shuffle: _shuffle, repeat: _repeat }));
  } catch (_) {}
}

function load() {
  try {
    const raw = sessionStorage.getItem('tubify_queue');
    if (!raw) return;
    const data = JSON.parse(raw);
    _queue = data.queue || [];
    _index = data.index ?? -1;
    _shuffle = data.shuffle ?? false;
    _repeat = data.repeat ?? 'none';
  } catch (_) {}
}

load();

export function getQueue() { return [..._queue]; }
export function getCurrentIndex() { return _index; }
export function getCurrentTrack() { return _queue[_index] ?? null; }
export function isShuffle() { return _shuffle; }
export function getRepeat() { return _repeat; }

export function setQueue(tracks, startIndex = 0) {
  _queue = [...tracks];
  _index = startIndex;
  save();
  emit('tubify:queue-changed');
}

export function addToQueue(track) {
  // Avoid exact duplicates
  if (!_queue.find(t => t.id === track.id)) {
    _queue.push(track);
    save();
    emit('tubify:queue-changed');
  }
}

export function addNext(track) {
  const insertAt = _index + 1;
  _queue.splice(insertAt, 0, track);
  save();
  emit('tubify:queue-changed');
}

export function removeFromQueue(index) {
  _queue.splice(index, 1);
  if (_index >= _queue.length) _index = _queue.length - 1;
  save();
  emit('tubify:queue-changed');
}

export function clearQueue() {
  _queue = [];
  _index = -1;
  save();
  emit('tubify:queue-changed');
}

export function playAt(index) {
  if (index < 0 || index >= _queue.length) return null;
  _index = index;
  save();
  emit('tubify:queue-changed');
  return _queue[_index];
}

export function next() {
  if (_queue.length === 0) return null;
  if (_repeat === 'one') return _queue[_index];

  if (_shuffle) {
    let next = Math.floor(Math.random() * _queue.length);
    if (_queue.length > 1) while (next === _index) next = Math.floor(Math.random() * _queue.length);
    _index = next;
  } else {
    _index++;
    if (_index >= _queue.length) {
      if (_repeat === 'all') _index = 0;
      else { _index = _queue.length - 1; save(); return null; }
    }
  }
  save();
  emit('tubify:queue-changed');
  return _queue[_index];
}

export function prev() {
  if (_queue.length === 0) return null;
  _index = Math.max(0, _index - 1);
  save();
  emit('tubify:queue-changed');
  return _queue[_index];
}

export function toggleShuffle() {
  _shuffle = !_shuffle;
  save();
  return _shuffle;
}

export function toggleRepeat() {
  const states = ['none', 'all', 'one'];
  _repeat = states[(states.indexOf(_repeat) + 1) % states.length];
  save();
  return _repeat;
}
