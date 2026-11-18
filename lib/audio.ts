/**
 * Generative spatial audio.
 *
 * There are no audio files in this project. Every sound is synthesised live from the
 * bouquet's own numbers: the seed chooses a mode and a melody, each specimen contributes a
 * timbre derived from its finish, its position in the arrangement sets the stereo image,
 * density sets the tempo and bloom opens the filter. Change the seed and the piece changes;
 * the same link always plays the same piece.
 *
 * Nothing is created until the visitor asks for it — a Web Audio context that starts without
 * a gesture is suspended by every browser, and a luxury site should not make noise uninvited.
 */

type Finish = "glass" | "chrome" | "porcelain" | "iridescent";

export type AudioConfig = {
  seed: number;
  species: { slug: string; finish: Finish; weight: number }[];
  density: number;
  bloom: number;
  arrangement: string;
};

/** Pentatonic modes, in semitones — no interval here can sound wrong against another. */
const MODES: Record<string, number[]> = {
  hirajoshi: [0, 2, 3, 7, 8],
  in: [0, 1, 5, 7, 8],
  yo: [0, 2, 5, 7, 9],
  kumoi: [0, 2, 3, 7, 9],
};

const MODE_NAMES = Object.keys(MODES);

const TIMBRE: Record<Finish, { partials: [number, number][]; decay: number; lowpass: number }> = {
  // struck glass: inharmonic, bright, long
  glass: { partials: [[1, 1], [2.76, 0.32], [5.4, 0.11]], decay: 2.6, lowpass: 6200 },
  // metal: more upper partials, faster decay
  chrome: { partials: [[1, 1], [3.01, 0.4], [6.2, 0.18]], decay: 1.5, lowpass: 8000 },
  // porcelain: soft, few partials
  porcelain: { partials: [[1, 1], [2, 0.24]], decay: 1.9, lowpass: 3200 },
  // iridescent: two detuned partials that beat against each other
  iridescent: { partials: [[1, 1], [1.007, 0.7], [2.02, 0.22]], decay: 3.1, lowpass: 5200 },
};

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class FloraAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: StereoPannerNode | null = null;
  private timer: number | null = null;
  private nextNote = 0;
  private rand: () => number = mulberry(1);
  private config: AudioConfig | null = null;
  private voices = 0;

  get running(): boolean {
    return this.ctx?.state === "running";
  }

  async start(config: AudioConfig) {
    this.config = config;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = 0;
      // a gentle ceiling so a dense bouquet never clips
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -18;
      limiter.knee.value = 24;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.004;
      limiter.release.value = 0.3;
      master.connect(limiter).connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      this.bus = null;
    }

    await this.ctx.resume();
    this.rand = mulberry(config.seed ^ 0x9e3779b9);
    this.nextNote = this.ctx.currentTime + 0.15;
    this.master!.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master!.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.8);

    if (this.timer === null) {
      this.timer = window.setInterval(() => this.schedule(), 120);
    }
    this.schedule();
  }

  update(config: AudioConfig) {
    this.config = config;
    // a seed change re-rolls the melody without restarting the context
    this.rand = mulberry(config.seed ^ 0x9e3779b9);
  }

  stop() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0, now, 0.25);
      // let the tail ring out before suspending
      window.setTimeout(() => void this.ctx?.suspend(), 900);
    }
  }

  dispose() {
    this.stop();
    window.setTimeout(() => {
      void this.ctx?.close();
      this.ctx = null;
    }, 1000);
  }

  private tempo() {
    const density = this.config?.density ?? 7;
    // 3 stems is slow and ceremonial, 11 is busy but never fast
    return 30 + density * 2.6;
  }

  private schedule() {
    const ctx = this.ctx;
    const cfg = this.config;
    if (!ctx || !cfg || !this.master || ctx.state !== "running") return;

    const horizon = ctx.currentTime + 0.4;
    while (this.nextNote < horizon) {
      this.emit(this.nextNote);
      const beat = 60 / this.tempo();
      // a rest every so often: silence is what makes the notes read as music
      const rest = this.rand() < 0.22 ? beat * (1 + Math.floor(this.rand() * 2)) : beat;
      this.nextNote += rest;
    }
  }

  private emit(at: number) {
    const ctx = this.ctx!;
    const cfg = this.config!;
    if (!cfg.species.length) return;

    const voice = cfg.species[Math.floor(this.rand() * cfg.species.length)];
    const timbre = TIMBRE[voice.finish] ?? TIMBRE.glass;

    const mode = MODES[MODE_NAMES[Math.floor(this.rand() * MODE_NAMES.length)]] ?? MODES.yo;
    const root = 45 + Math.floor((cfg.seed % 7) * 2); // A2..G3 territory
    const step = mode[Math.floor(this.rand() * mode.length)];
    const octave = this.rand() < 0.3 ? 12 : 0;
    const freq = midi(root + step + octave + (voice.weight > 2 ? -12 : 0));

    // stereo image follows where the stem sits in the arrangement
    const spread = cfg.arrangement === "solitaire" ? 0 : cfg.arrangement === "arch" ? 0.85 : 0.6;
    const pan = (this.rand() * 2 - 1) * spread;

    const out = ctx.createStereoPanner();
    out.pan.value = pan;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    // bloom literally opens the instrument up
    filter.frequency.value = timbre.lowpass * (0.45 + cfg.bloom * 0.75);
    filter.Q.value = 0.6;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    const peak = 0.16 / Math.sqrt(Math.max(1, this.voices));
    env.gain.exponentialRampToValueAtTime(peak, at + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, at + timbre.decay);

    filter.connect(env).connect(out).connect(this.master!);

    // cap simultaneous voices so a rapid re-seed cannot pile up oscillators
    this.voices = Math.min(64, this.voices + 1);

    for (const [ratio, gain] of timbre.partials) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * ratio;
      const g = ctx.createGain();
      g.gain.value = gain * 0.5;
      osc.connect(g).connect(filter);
      osc.start(at);
      osc.stop(at + timbre.decay + 0.05);
      osc.onended = () => {
        this.voices = Math.max(0, this.voices - 1);
        osc.disconnect();
        g.disconnect();
      };
    }

    window.setTimeout(
      () => {
        filter.disconnect();
        env.disconnect();
        out.disconnect();
      },
      (timbre.decay + 0.2) * 1000
    );
  }
}
