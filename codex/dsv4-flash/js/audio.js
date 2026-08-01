// WebAudio 程序化合成音效，无任何音频文件
window.AudioSys = (function () {
  var ctx = null, master = null, enabled = false, muted = false;
  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { ctx = new AC(); } catch (e) { return false; }
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.55;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }
  function env(g, t, a, peak, dur, curve) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function noiseBuf(dur) {
    var n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  var _noiseCache = {};
  function cachedNoise(dur) {
    var key = dur.toFixed(2);
    if (!_noiseCache[key]) _noiseCache[key] = noiseBuf(dur);
    return _noiseCache[key];
  }
  function playNoise(dur, f0, f1, peak, type) {
    if (!enabled) return;
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = cachedNoise(dur);
    var flt = ctx.createBiquadFilter();
    flt.type = type || 'lowpass';
    flt.frequency.setValueAtTime(f0, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    flt.Q.value = 0.8;
    var g = ctx.createGain();
    env(g, t, 0.004, peak, dur);
    src.connect(flt); flt.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.05);
  }
  function tone(freq, dur, type, peak, when, freqEnd) {
    if (!enabled) return;
    var t = ctx.currentTime + (when || 0);
    var osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    var g = ctx.createGain();
    env(g, t, 0.003, peak, dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  var api = {
    enable: function () { if (!ensure()) return false; enabled = true; return true; },
    get enabled() { return enabled; },
    isMuted: function () { return muted; },
    setMuted: function (m) { muted = m; if (master) master.gain.value = m ? 0 : 0.55; },
    toggle: function () { api.setMuted(!muted); return muted; },

    shot: function (kind) {
      if (!enabled) return;
      if (kind === 'sniper') {
        playNoise(0.32, 1500, 90, 0.95);
        tone(120, 0.3, 'sine', 0.55, 0, 45);
      } else if (kind === 'rifle') {
        playNoise(0.12, 2600, 350, 0.6);
        tone(160, 0.1, 'square', 0.18, 0, 90);
      } else {
        playNoise(0.09, 3200, 600, 0.42);
        tone(220, 0.07, 'square', 0.12, 0, 130);
      }
    },
    dry: function () { tone(1100, 0.03, 'square', 0.08); },
    reload: function () { tone(600, 0.04, 'square', 0.12); tone(800, 0.04, 'square', 0.12, 0.25); },
    knife: function () { playNoise(0.12, 1800, 300, 0.35, 'bandpass'); },
    footstep: function (alt) { playNoise(0.06, 520, 260, 0.16, 'lowpass'); tone(90 + alt * 18, 0.06, 'sine', 0.08, 0, 60); },
    hit: function () { tone(760, 0.05, 'square', 0.16); },
    headshot: function () { tone(1450, 0.09, 'sine', 0.24, 0, 2100); },
    kill: function () { tone(190, 0.28, 'triangle', 0.3, 0, 75); playNoise(0.2, 900, 120, 0.3); },
    buy: function () { tone(920, 0.08, 'sine', 0.2); tone(1380, 0.12, 'sine', 0.2, 0.1); },
    denied: function () { tone(220, 0.12, 'square', 0.16, 0, 160); },
    plant: function () { tone(520, 0.12, 'sine', 0.22); tone(700, 0.12, 'sine', 0.22, 0.18); tone(920, 0.2, 'sine', 0.24, 0.36); },
    beep: function (fast) { tone(fast ? 1350 : 1050, fast ? 0.05 : 0.09, 'square', 0.22); },
    defuseTick: function () { tone(1150, 0.05, 'sine', 0.16); },
    defused: function () { tone(660, 0.12, 'sine', 0.2); tone(990, 0.2, 'sine', 0.2, 0.14); },
    explosion: function () {
      playNoise(0.9, 1000, 55, 1.05);
      tone(60, 0.7, 'sine', 0.7, 0, 28);
    },
    roundStart: function () { tone(440, 0.1, 'sine', 0.14); tone(660, 0.14, 'sine', 0.14, 0.12); },
    death: function () { playNoise(0.4, 700, 100, 0.3); tone(160, 0.5, 'sawtooth', 0.16, 0, 55); },
    win: function () { tone(523, 0.14, 'sine', 0.18); tone(659, 0.14, 'sine', 0.18, 0.13); tone(784, 0.24, 'sine', 0.2, 0.26); },
    lose: function () { tone(330, 0.16, 'sine', 0.16); tone(247, 0.3, 'sine', 0.16, 0.15); },
    jump: function () { tone(300, 0.08, 'sine', 0.08, 0, 420); }
  };
  return api;
})();
