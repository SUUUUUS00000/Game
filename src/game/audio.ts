import type { WeaponDef } from "./weapons";

/**
 * Fully synthesized sound effects via WebAudio — no assets needed.
 * Everything is generated from oscillators + noise buffers.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private windGain: GainNode | null = null;
  private muted = false;
  private lastFoot = 0;

  /** Must be called from a user gesture (e.g. Deploy button). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 8;
      comp.connect(this.ctx.destination);
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.85;
      this.master.connect(comp);
      // noise buffer
      const len = this.ctx.sampleRate * 1.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.02);
    }
  }

  isMuted() {
    return this.muted;
  }

  private get ready() {
    return !!this.ctx && !!this.master && !this.muted;
  }

  private noise(dur: number, filterFreq: number, type: BiquadFilterType, gain: number, decay?: number) {
    if (!this.ready || !this.ctx || !this.master || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    const d = decay ?? dur;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + d + 0.05);
  }

  private tone(
    freq: number,
    endFreq: number,
    dur: number,
    gain: number,
    type: OscillatorType = "sine",
    delay = 0
  ) {
    if (!this.ready || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  shot(w: WeaponDef) {
    // crack
    this.noise(0.05, 2400 + Math.random() * 800, "bandpass", 0.5, 0.06);
    // body thump
    this.tone(w.firePitch, w.firePitch * 0.22, 0.09, 0.5, "square");
    // awp boom — long tail
    if (w.id === "awp") {
      this.noise(0.4, 900, "lowpass", 0.55, 0.38);
      this.tone(90, 38, 0.4, 0.6, "sine");
    }
    // metallic tick
    this.noise(0.03, 5200, "highpass", 0.18, 0.03);
  }

  dryFire() {
    this.noise(0.03, 2800, "bandpass", 0.16, 0.03);
    this.tone(900, 500, 0.03, 0.1, "square");
  }

  headshot() {
    this.tone(1318, 1318, 0.09, 0.22, "triangle");
    this.tone(1760, 1760, 0.12, 0.16, "triangle", 0.02);
    this.noise(0.05, 5000, "highpass", 0.12, 0.05);
  }

  bodyHit() {
    this.tone(220, 130, 0.08, 0.3, "sine");
    this.noise(0.05, 700, "lowpass", 0.25, 0.05);
  }

  topple() {
    this.noise(0.16, 500, "lowpass", 0.22, 0.15);
    this.tone(140, 70, 0.14, 0.14, "sine", 0.02);
  }

  combo(level: number) {
    const base = 440 * Math.pow(1.19, Math.min(level, 6));
    this.tone(base, base, 0.09, 0.16, "triangle");
    this.tone(base * 1.5, base * 1.5, 0.12, 0.14, "triangle", 0.06);
  }

  reloadStart() {
    this.noise(0.04, 1500, "bandpass", 0.2, 0.04);
  }
  reloadEnd() {
    this.noise(0.05, 2000, "bandpass", 0.28, 0.05);
    this.tone(700, 500, 0.05, 0.12, "square");
  }
  bolt() {
    this.noise(0.04, 1600, "bandpass", 0.18, 0.04);
    this.noise(0.03, 3000, "highpass", 0.1, 0.03);
  }

  shell() {
    if (!this.ready) return;
    this.noise(0.02, 6000, "highpass", 0.05, 0.02);
  }

  foot() {
    const now = performance.now();
    if (now - this.lastFoot < 220) return;
    this.lastFoot = now;
    this.noise(0.04, 320, "lowpass", 0.1, 0.04);
  }

  uiClick() {
    this.tone(1000, 700, 0.05, 0.12, "square");
  }

  switchWeapon() {
    this.tone(500, 700, 0.06, 0.14, "square");
    this.noise(0.03, 2500, "bandpass", 0.1, 0.03);
  }

  roundStart() {
    this.tone(392, 392, 0.12, 0.18, "triangle");
    this.tone(523, 523, 0.14, 0.18, "triangle", 0.1);
    this.tone(659, 659, 0.22, 0.2, "triangle", 0.2);
  }

  tickLow() {
    this.tone(880, 800, 0.07, 0.14, "square");
  }
  tickHigh() {
    this.tone(1200, 1100, 0.09, 0.16, "square");
  }

  gameOver() {
    this.tone(523, 523, 0.16, 0.2, "triangle");
    this.tone(392, 392, 0.16, 0.2, "triangle", 0.16);
    this.tone(262, 246, 0.5, 0.22, "triangle", 0.32);
    this.noise(0.5, 500, "lowpass", 0.12, 0.45);
  }

  windStart() {
    if (!this.ctx || !this.master || !this.noiseBuf || this.windGain) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 320;
    const g = this.ctx.createGain();
    g.gain.value = 0.035;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoG = this.ctx.createGain();
    lfoG.gain.value = 0.02;
    lfo.connect(lfoG).connect(g.gain);
    src.connect(f).connect(g).connect(this.master);
    src.start();
    lfo.start();
    this.windGain = g;
  }

  windStop() {
    if (this.windGain && this.ctx) {
      this.windGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
      this.windGain = null;
    }
  }
}
