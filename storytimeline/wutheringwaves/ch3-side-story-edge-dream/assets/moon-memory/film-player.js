// The video decoders never own the visible surface. Only a verified frame does.
export function createFilmPlayer(canvas, clips, {onFrame = () => {}, onError = () => {}, onEnded = () => {}} = {}) {
  const doc = canvas.ownerDocument;
  const context = canvas.getContext('2d', {alpha: false});
  if (!doc || !context) throw new TypeError('Film playback requires a 2D canvas');
  const definitions = new Map();
  for (const clip of clips) {
    if (!clip || typeof clip.id !== 'string' || !clip.id || definitions.has(clip.id)
      || typeof clip.url !== 'string' || !clip.url || !Number.isInteger(clip.frames) || clip.frames < 1
      || !Number.isFinite(clip.fps) || clip.fps <= 0) throw new TypeError('Invalid film clip');
    definitions.set(clip.id, {...clip});
  }
  const candidate = doc.createElement('canvas');
  const candidateContext = candidate.getContext('2d', {alpha: false});
  const verified = doc.createElement('canvas');
  const verifiedContext = verified.getContext('2d', {alpha: false});
  const records = new Map();
  let desired = null, painted = null, error = null;
  let status = 'idle', epoch = 0, direction = 0, disposed = false;
  let active = null, candidateOwner = null;
  let mode = 'scrub', native = null, playback = null, verifiedCurrent = true;

  function cancelCallback(record) {
    if (record?.callbackId != null) record.video.cancelVideoFrameCallback(record.callbackId);
    if (record) record.callbackId = null;
  }

  function invalidate() {
    ++epoch;
    cancelCallback(active);
    if (active) active.attempt = null;
    candidateOwner = null;
  }

  function fail(record, code, message) {
    record.failure = {code, message, clip: record.clip.id};
    cancelCallback(record);
    record.attempt = null;
    if (disposed || record !== active || desired?.clip !== record.clip.id || mode === 'paused') return;
    status = 'error';
    error = {...record.failure};
    if (native?.record === record) {
      record.video.pause();
      playback.playing = false;
      native = null;
      mode = 'paused';
    }
    if (!record.errorReported) {
      record.errorReported = true;
      onError({...error, desired: {...desired}});
    }
  }

  function drawVerified() {
    if (!painted || !canvas.width || !canvas.height) return;
    const scale = Math.min(canvas.width / verified.width, canvas.height / verified.height);
    const width = verified.width * scale, height = verified.height * scale;
    context.fillStyle = '#050a0f';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(verified, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  }

  function preserveVisible() {
    if (verifiedCurrent || !painted || !canvas.width || !canvas.height) return;
    verified.width = canvas.width;
    verified.height = canvas.height;
    verifiedContext.drawImage(canvas, 0, 0);
    verifiedCurrent = true;
  }

  function current(record, attempt) {
    return !disposed && active === record && record.attempt === attempt && attempt.epoch === epoch;
  }

  function present(record, attempt) {
    if (!current(record, attempt) || !attempt.settled || !attempt.decoded || candidateOwner !== attempt
      || desired.clip !== record.clip.id) return;
    if (verified.width !== candidate.width || verified.height !== candidate.height) {
      verified.width = candidate.width;
      verified.height = candidate.height;
    }
    verifiedContext.drawImage(candidate, 0, 0);
    verifiedCurrent = true;
    painted = {clip: record.clip.id, time: attempt.frame / record.clip.fps,
      frame: attempt.frame, mediaTime: attempt.decoded.mediaTime,
      width: candidate.width, height: candidate.height};
    status = 'ready';
    error = null;
    drawVerified();
    cancelCallback(record);
    record.attempt = null;
    onFrame({...painted});
    // Scroll requests coalesce behind this one verified seek. Same-direction
    // progress may be one seek behind; reversal and clip changes invalidate it.
    pump();
  }

  function currentNative(record, token) {
    return !disposed && mode === 'play' && native === token && active === record
      && token.epoch === epoch && !token.ended;
  }

  function presentNative(record, token, mediaTime, image = record.video, width = image.videoWidth, height = image.videoHeight) {
    if (!currentNative(record, token) || !token.settled || record.video.seeking) return;
    // A compositor callback queued before this initial seek can arrive after
    // seeked. Admit the first frame only when the native playhead has reached it.
    if (token.lastMediaTime === null && mediaTime > record.video.currentTime + 2 / record.clip.fps) return;
    const frame = Math.round(mediaTime * record.clip.fps);
    if (!Number.isFinite(mediaTime) || mediaTime < 0 || frame < token.frame || frame >= record.clip.frames
      || token.lastMediaTime !== null && mediaTime < token.lastMediaTime) return;
    if (!(width > 0 && height > 0)) {
      fail(record, 'VIDEO_FRAME_SIZE_UNAVAILABLE', 'The decoded frame has no readable size');
      return;
    }
    const scale = Math.min(canvas.width / width, canvas.height / height);
    const drawnWidth = width * scale, drawnHeight = height * scale;
    try {
      context.fillStyle = '#050a0f';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, (canvas.width - drawnWidth) / 2, (canvas.height - drawnHeight) / 2, drawnWidth, drawnHeight);
    } catch {
      fail(record, 'VIDEO_FRAME_COPY_FAILED', 'The decoded frame could not be copied');
      return;
    }
    // Native playback draws once. Snapshot that exact visible frame only when
    // pausing, resizing or switching back to the scrub decoder.
    verifiedCurrent = false;
    token.lastMediaTime = mediaTime;
    painted = {clip: record.clip.id, time: mediaTime, frame, mediaTime, width, height};
    playback.time = mediaTime;
    playback.playing = true;
    status = 'playing';
    error = null;
    onFrame({...painted});
  }

  function watchNative(record, token) {
    if (!currentNative(record, token) || record.callbackId != null) return;
    record.callbackId = record.video.requestVideoFrameCallback((_, metadata) => {
      if (!currentNative(record, token)) return;
      record.callbackId = null;
      const mediaTime = metadata.mediaTime;
      ++record.callbacks;
      record.lastMediaTime = Number.isFinite(mediaTime) ? mediaTime : null;
      if (token.settled) {
        presentNative(record, token, mediaTime);
      } else if (Number.isFinite(mediaTime) && mediaTime >= 0
        && Math.round(mediaTime * record.clip.fps) === token.frame) {
        // A matching first frame may arrive before seeked. Keep it without
        // admitting a stale future frame from a previous seek on this clip.
        const width = record.video.videoWidth, height = record.video.videoHeight;
        if (width > 0 && height > 0) {
          candidate.width = width; candidate.height = height;
          try { candidateContext.drawImage(record.video, 0, 0, width, height); }
          catch { fail(record, 'VIDEO_FRAME_COPY_FAILED', 'The decoded frame could not be copied'); return; }
          candidateOwner = token;
          token.pending = {mediaTime, width, height};
        }
      }
      watchNative(record, token);
    });
  }

  function pumpNative() {
    const token = native, record = active;
    if (!token || !currentNative(record, token)) return;
    if (record.failure) { fail(record, record.failure.code, record.failure.message); return; }
    if (!record.metadata) { status = 'loading'; return; }
    if (token.started || record.video.seeking) return;
    token.started = true;
    status = 'waiting';
    watchNative(record, token);
    try {
      record.video.playbackRate = token.rate;
      record.seekOffset = record.seekOffset === .25 ? .125 : .25;
      ++record.seekWrites;
      record.video.currentTime = (token.frame + record.seekOffset) / record.clip.fps;
      ++record.playCalls;
      const started = record.video.play();
      Promise.resolve(started).then(() => {
        if (!currentNative(record, token)) return;
        playback.playing = true;
        status = 'playing';
      }, () => {
        if (currentNative(record, token)) fail(record, 'VIDEO_PLAY_FAILED', 'The film could not start playing');
      });
    } catch {
      fail(record, 'VIDEO_PLAY_FAILED', 'The film could not start playing');
    }
  }

  function watch(record, attempt) {
    if (!current(record, attempt) || record.callbackId != null) return;
    record.callbackId = record.video.requestVideoFrameCallback((_, metadata) => {
      if (!current(record, attempt)) return;
      record.callbackId = null;
      const mediaTime = metadata.mediaTime;
      ++record.callbacks;
      record.lastMediaTime = Number.isFinite(mediaTime) ? mediaTime : null;
      const decodedFrame = Number.isFinite(mediaTime) ? Math.round(mediaTime * record.clip.fps) : -1;
      if (decodedFrame === attempt.frame && decodedFrame >= 0 && decodedFrame < record.clip.frames
        && mediaTime >= 0 && desired.clip === record.clip.id) {
        const width = record.video.videoWidth, height = record.video.videoHeight;
        if (!(width > 0 && height > 0)) {
          fail(record, 'VIDEO_FRAME_SIZE_UNAVAILABLE', 'The decoded frame has no readable size');
          return;
        }
        if (candidate.width !== width || candidate.height !== height) {
          candidate.width = width;
          candidate.height = height;
        }
        try { candidateContext.drawImage(record.video, 0, 0, width, height); }
        catch {
          fail(record, 'VIDEO_FRAME_COPY_FAILED', 'The decoded frame could not be copied');
          return;
        }
        candidateOwner = attempt;
        attempt.decoded = {mediaTime};
        present(record, attempt);
      }
      if (!current(record, attempt)) return;
      if (!attempt.decoded) watch(record, attempt);
    });
  }

  function pump() {
    if (mode === 'play') { pumpNative(); return; }
    if (mode !== 'scrub') return;
    if (disposed || !desired || !active) return;
    const record = active;
    if (record.failure) { fail(record, record.failure.code, record.failure.message); return; }
    if (painted?.clip === desired.clip && painted.frame === desired.frame) {
      cancelCallback(record);
      record.attempt = null;
      status = 'ready';
      return;
    }
    if (!record.metadata) { status = 'loading'; return; }
    // A settled seek can still be awaiting its decoded callback. Repeated
    // animation ticks must not replace that attempt before it can present.
    if (record.attempt?.epoch === epoch) {
      present(record, record.attempt);
      return;
    }
    if (record.video.seeking) return;
    cancelCallback(record);
    const attempt = {epoch, frame: desired.frame, settled: false, decoded: null};
    record.attempt = attempt;
    status = 'waiting';
    watch(record, attempt);
    // A small alternating offset within this same 60fps frame also decodes a
    // paused frame when revisiting a clip already sitting on that frame.
    record.seekOffset = record.seekOffset === .25 ? .125 : .25;
    const target = (attempt.frame + record.seekOffset) / record.clip.fps;
    try { ++record.seekWrites; record.video.currentTime = target; }
    catch { fail(record, 'VIDEO_SEEK_FAILED', 'The requested frame could not be decoded'); }
  }

  async function loadClip(record) {
    try {
      // The private asset route can return a full 200 response to byte ranges.
      // These short clips are fetched once so the decoder can seek a local Blob.
      const response = await fetch(record.clip.url, {signal: record.controller.signal, cache: 'no-store'});
      if (!response.ok) throw new Error('Film response unavailable');
      const bytes = await response.arrayBuffer();
      if (disposed || record.controller.signal.aborted) return;
      record.objectUrl = URL.createObjectURL(new Blob([bytes], {type: 'video/mp4'}));
      record.video.src = record.objectUrl;
      record.video.load();
    } catch {
      if (!disposed && !record.controller.signal.aborted) {
        fail(record, 'VIDEO_LOAD_FAILED', 'A film clip could not be loaded');
      }
    }
  }

  function recordFor(clip) {
    if (records.has(clip.id)) return records.get(clip.id);
    const video = doc.createElement('video');
    const record = {clip, video, metadata: false, callbackId: null, attempt: null, failure: null,
      errorReported: false, seekOffset: 0, callbacks: 0, lastMediaTime: null, playCalls: 0, seekWrites: 0, listeners: [],
      controller: new AbortController(), objectUrl: null};
    records.set(clip.id, record);
    const listen = (name, action) => { video.addEventListener(name, action); record.listeners.push([name, action]); };
    listen('loadedmetadata', () => {
      if (disposed) return;
      record.metadata = true;
      if (record === active) pump();
    });
    listen('seeked', () => {
      if (disposed || record !== active || record.video.seeking) return;
      if (mode === 'play') {
        const token = native;
        if (!token || !currentNative(record, token)) return;
        if (!token.started) { pumpNative(); return; }
        token.settled = true;
        if (token.pending && candidateOwner === token) {
          const {mediaTime, width, height} = token.pending;
          token.pending = null;
          presentNative(record, token, mediaTime, candidate, width, height);
        }
        watchNative(record, token);
        return;
      }
      // Reversing invalidates the old attempt while its native seek still
      // completes. Its seeked event releases the latest queued request.
      if (!record.attempt) { pump(); return; }
      const attempt = record.attempt;
      attempt.settled = true;
      present(record, attempt);
    });
    listen('error', () => {
      if (!disposed) fail(record, 'VIDEO_LOAD_FAILED', 'A film clip could not be loaded');
    });
    listen('ended', () => {
      const token = native;
      if (!token || !token.started || !currentNative(record, token) || record.video.ended !== true || record.video.seeking) return;
      preserveVisible();
      token.ended = true;
      cancelCallback(record);
      playback.playing = false;
      playback.ended = true;
      status = 'ended';
      onEnded({clip: record.clip.id, time: playback.time});
    });
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('playsinline', '');
    if (typeof video.requestVideoFrameCallback !== 'function' || typeof video.cancelVideoFrameCallback !== 'function') {
      record.failure = {code: 'VIDEO_FRAME_CALLBACK_UNAVAILABLE', message: 'Decoded video frame callbacks are unavailable'};
    } else {
      loadClip(record);
    }
    return record;
  }

  function request(value) {
    if (disposed) return false;
    const clip = definitions.get(value?.clip);
    if (!clip || !Number.isFinite(value.time)) throw new RangeError('Unknown clip or invalid film time');
    if (mode !== 'scrub') { pause(); mode = 'scrub'; playback = null; }
    const frame = Math.min(clip.frames - 1, Math.max(0, Math.round(value.time * clip.fps)));
    if (desired?.clip === clip.id && desired.frame === frame) { pump(); return true; }
    const changedClip = desired?.clip !== clip.id;
    const nextDirection = changedClip ? 0 : Math.sign(frame - desired.frame);
    if (changedClip || nextDirection && direction && nextDirection !== direction) invalidate();
    direction = changedClip ? 0 : nextDirection || direction;
    desired = {clip: clip.id, time: frame / clip.fps, frame};
    error = null;
    active = recordFor(clip);
    if (painted?.clip === clip.id && painted.frame === frame) {
      cancelCallback(active);
      active.attempt = null;
      status = 'ready';
      return true;
    }
    pump();
    return true;
  }

  function pause() {
    if (disposed) return false;
    preserveVisible();
    invalidate();
    native = null;
    mode = 'paused';
    if (playback) playback.playing = false;
    for (const record of records.values()) {
      cancelCallback(record);
      record.attempt = null;
      record.video.pause();
    }
    if (status !== 'error') status = painted ? 'ready' : 'idle';
    return true;
  }

  function play(value, {rate = 1.35} = {}) {
    if (disposed) return false;
    const clip = definitions.get(value?.clip);
    if (!clip || !Number.isFinite(value.time)) throw new RangeError('Unknown clip or invalid film time');
    if (!Number.isFinite(rate) || rate <= 0) throw new RangeError('Invalid film playback rate');
    const frame = Math.min(clip.frames - 1, Math.max(0, Math.round(value.time * clip.fps)));
    if (native && currentNative(active, native) && native.clip === clip.id && native.frame === frame && native.rate === rate) return true;
    pause();
    mode = 'play';
    desired = {clip: clip.id, time: frame / clip.fps, frame};
    error = null;
    active = recordFor(clip);
    if (active.failure?.code === 'VIDEO_PLAY_FAILED') {
      // A new explicit Play may retry a browser policy/interruption rejection;
      // load and decode failures remain pinned instead of being auto-retried.
      active.failure = null;
      active.errorReported = false;
    }
    playback = {clip: clip.id, time: painted?.clip === clip.id && painted.frame === frame ? painted.mediaTime : null,
      rate, playing: false, ended: false};
    native = {record: active, epoch, clip: clip.id, frame, rate, started: false, settled: false,
      lastMediaTime: null, pending: null, ended: false};
    pumpNative();
    return true;
  }

  function preload() {
    if (disposed) return false;
    for (const clip of definitions.values()) recordFor(clip);
    return true;
  }

  function resize(width, height) {
    if (disposed) return false;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new RangeError('Invalid film surface size');
    const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
    if (canvas.width === w && canvas.height === h) return false;
    preserveVisible();
    canvas.width = w;
    canvas.height = h;
    drawVerified();
    return true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    invalidate();
    status = 'disposed';
    native = null;
    playback = null;
    for (const record of records.values()) {
      record.controller.abort();
      cancelCallback(record);
      for (const [name, action] of record.listeners) record.video.removeEventListener(name, action);
      record.video.pause();
      record.video.removeAttribute('src');
      record.video.load();
      if (record.objectUrl) URL.revokeObjectURL(record.objectUrl);
    }
    candidate.width = candidate.height = verified.width = verified.height = 0;
    records.clear();
    active = null;
  }

  function decoderState() {
    if (!active) return null;
    let quality = null;
    if (typeof active.video.getVideoPlaybackQuality === 'function') {
      try {
        const measured = active.video.getVideoPlaybackQuality();
        quality = {totalVideoFrames: measured.totalVideoFrames, droppedVideoFrames: measured.droppedVideoFrames};
      } catch { /* Optional native diagnostics must not interrupt playback. */ }
    }
    return {readyState: active.video.readyState, seeking: active.video.seeking,
      currentTime: active.video.currentTime, isConnected: active.video.isConnected,
      callbacks: active.callbacks, lastMediaTime: active.lastMediaTime,
      playCalls: active.playCalls, seekWrites: active.seekWrites, quality};
  }

  return {request, play, pause, preload, resize, dispose, state: () => ({status, desired: desired && {...desired},
    playback: playback && {...playback},
    painted: painted && {...painted}, pending: active?.attempt ? {clip: active.clip.id,
      frame: active.attempt.frame, settled: active.attempt.settled, decoded: Boolean(active.attempt.decoded)} : null,
    decoder: decoderState(),
    error: error && {...error}})};
}
