// DECEMBER WAHALA — background music, made live with Web Audio (no files):
// a mellow Afrobeats groove with kick, shaker, rim, log-drum bass and chords.
// It plays softer at night and when the game is paused.
(function () {
  const BPM = 104, STEP = 60 / BPM / 4; // sixteenth notes
  // A minor-ish progression, one chord per bar: Am – F – C – G.
  const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const BASS = [45, 41, 36, 43];
  const KICK = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0];
  const RIM = [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0];
  const LOG = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0];
  const LOG_NOTE = [0, 0, 0, 7, 0, 0, 12, 0, 0, 0, 7, 0, 5, 0, 0, 0];
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const M = {
    on: false, ctx: null, master: null, step: 0, next: 0, timer: 0, level: 1,
    start() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        const comp = this.ctx.createDynamicsCompressor();
        this.master.connect(comp).connect(this.ctx.destination);
        this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      this.ctx.resume();
      this.on = true;
      this.next = this.ctx.currentTime + 0.1;
      this.master.gain.setTargetAtTime(0.22 * this.level, this.ctx.currentTime, 0.4);
      clearInterval(this.timer);
      this.timer = setInterval(() => this.schedule(), 25);
      return true;
    },
    stop() {
      this.on = false;
      clearInterval(this.timer);
      if (this.ctx) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    },
    toggle() { if (this.on) this.stop(); else this.start(); return this.on; },
    // 0..1: quieter at night or when paused.
    setLevel(l) { this.level = l; if (this.on && this.ctx) this.master.gain.setTargetAtTime(0.22 * l, this.ctx.currentTime, 0.6); },
    schedule() {
      const c = this.ctx;
      while (this.next < c.currentTime + 0.12) {
        this.play(this.step, this.next);
        this.next += STEP * (this.step % 2 ? 0.92 : 1.08); // a little swing
        this.step = (this.step + 1) % 64;
      }
    },
    play(i, t) {
      const s = i % 16, bar = Math.floor(i / 16);
      if (KICK[s]) this.kick(t);
      if (RIM[s]) this.rim(t);
      this.shaker(t, s % 4 === 2 ? 0.09 : 0.04);
      if (LOG[s]) this.log(t, BASS[bar] + LOG_NOTE[s]);
      if (s === 0 || s === 10) CHORDS[bar].forEach((m) => this.pad(t, m + 12, s === 0 ? 0.9 : 0.5));
    },
    env(g, t, peak, len) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + len); },
    kick(t) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
      this.env(g, t, 0.9, 0.3); o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.32);
    },
    rim(t) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "square"; o.frequency.value = 1700;
      this.env(g, t, 0.12, 0.04); o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.05);
    },
    shaker(t, v) {
      const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      src.buffer = this.noise; f.type = "highpass"; f.frequency.value = 7000;
      this.env(g, t, v, 0.05); src.connect(f).connect(g).connect(this.master); src.start(t); src.stop(t + 0.06);
    },
    log(t, m) {
      // The amapiano-style log drum: a sine that dips in pitch.
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
      o.type = "sine"; o.frequency.setValueAtTime(hz(m) * 1.5, t); o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.06);
      f.type = "lowpass"; f.frequency.value = 900;
      this.env(g, t, 0.55, 0.35); o.connect(f).connect(g).connect(this.master); o.start(t); o.stop(t + 0.4);
    },
    pad(t, m, v) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
      o.type = "triangle"; o.frequency.value = hz(m); o.detune.value = (Math.random() - 0.5) * 8;
      f.type = "lowpass"; f.frequency.value = 1400;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06 * v, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 9);
      o.connect(f).connect(g).connect(this.master); o.start(t); o.stop(t + STEP * 10);
    },
  };
  window.Music = M;
})();
