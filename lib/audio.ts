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
  /** which way the score is voiced; absent means the original glass register */
  register?: string;
};

/** Pentatonic modes, in semitones — no interval here can sound wrong against another. */
const MODES: Record<string, number[]> = {
  hirajoshi: [0, 2, 3, 7, 8],
  in: [0, 1, 5, 7, 8],
  yo: [0, 2, 5, 7, 9],
  kumoi: [0, 2, 3, 7, 9],
};

const MODE_NAMES = Object.keys(MODES);

/**
 * Registers.
 *
 * A register is not a track — it is a set of decisions about *how* the same bouquet is
 * voiced: which modes are allowed, how far apart the notes fall, how long they ring, how
 * many voices sound at once, and how much space sits around them. Because the seed still
 * drives every choice underneath, two bouquets in the same register are as different as
 * two bouquets in the same key.
 *
 * This is what a "music" option means on a site with no audio files in it.
 */
type Register = {
  /** modes, by name, that this register draws from */
  modes: string[];
  /** multiplier on the root note, in semitones */
  transpose: number;
  /** how wide the melody wanders, in semitones */
  range: number;
  /**
   * How often a note arrives as a chord rather than a single voice.
   * 0 = strictly one note at a time; 1 = every note may carry a third above it.
   */
  polyphony: number;
  /** how much silence between notes: 0 sparse → 1 busy */
  density: number;
  /** multiplier on every decay */
  ring: number;
  /** half-width of the stereo field, 0 = mono */
  width: number;
  /** low-pass multiplier: the "air" of the room */
  air: number;
};

export const REGISTERS: Record<string, Register> = {
  // the original voice: struck glass, wide intervals, long ringing
  glass: { modes: ["hirajoshi", "kumoi", "yo"], transpose: 0, range: 12, polyphony: 0, density: 1, ring: 1.5, width: 0.6, air: 1 },
  // bowed: narrower intervals, held notes, a warm low bed
  strings: { modes: ["yo", "in"], transpose: -5, range: 8, polyphony: 0.75, density: 0.7, ring: 2.4, width: 0.85, air: 0.62 },
  // low, sparse, widely spaced, most of it silence
  nocturne: { modes: ["in", "hirajoshi"], transpose: -12, range: 10, polyphony: 0.2, density: 0.42, ring: 2.9, width: 0.4, air: 0.5 },
  // two voices in counterpoint, closer together, more movement
  chamber: { modes: ["kumoi", "yo", "in"], transpose: -2, range: 14, polyphony: 1, density: 1.55, ring: 1.1, width: 0.95, air: 1.25 },
};

export function getRegister(key: string | undefined | null): Register | null {
  if (!key || key === "silence") return null;
  return REGISTERS[key] ?? REGISTERS.glass;
}

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

  private get register(): Register {
    return getRegister(this.config?.register) ?? REGISTERS.glass;
  }

  private tempo() {
    const density = this.config?.density ?? 7;
    // 3 stems is slow and ceremonial, 11 is busy but never fast
    return (30 + density * 2.6) * this.register.density;
  }

  private schedule() {
    const ctx = this.ctx;
    const cfg = this.config;
    if (!ctx || !cfg || !this.master || ctx.state !== "running") return;

    const horizon = ctx.currentTime + 0.4;
    while (this.nextNote < horizon) {
      // A register with polyphony above zero sometimes answers its own note with a
      // second voice a third or a fifth above — scheduled on the same beat, sharing the
      // register's pan and ring. This is what makes "chamber" read as two instruments
      // rather than one instrument that is louder.
      this.emit(this.nextNote);
      const reg = this.register;
      if (reg.polyphony > 0 && this.rand() < reg.polyphony * 0.55) {
        this.emit(this.nextNote + 0.004, true);
      }
      const beat = 60 / this.tempo();
      // a rest every so often: silence is what makes the notes read as music
      const restChance = 0.22 + (1 - this.register.density) * 0.25;
      const rest = this.rand() < restChance ? beat * (1 + Math.floor(this.rand() * 2)) : beat;
      this.nextNote += rest;
    }
  }

  private emit(at: number, harmony = false) {
    const ctx = this.ctx!;
    const cfg = this.config!;
    if (!cfg.species.length) return;

    const voice = cfg.species[Math.floor(this.rand() * cfg.species.length)];
    const timbre = TIMBRE[voice.finish] ?? TIMBRE.glass;

    const reg = this.register;
    const allowed = reg.modes.length ? reg.modes : MODE_NAMES;
    const mode = MODES[allowed[Math.floor(this.rand() * allowed.length)]] ?? MODES.yo;
    const root = 45 + Math.floor((cfg.seed % 7) * 2) + reg.transpose; // A2..G3 territory, transposed
    const step = mode[Math.floor(this.rand() * mode.length)];
    // the register decides how far a voice may climb from the root
    const octave = this.rand() < 0.3 && reg.range > 10 ? 12 : 0;
    // a harmony voice sits a third or a fifth above, inside the same mode
    const harmonic = harmony ? (this.rand() < 0.5 ? 3 : 7) : 0;
    const freq = midi(root + step + octave + harmonic + (voice.weight > 2 ? -12 : 0));

    // a little detune, so "strings" reads as a section rather than one sine
    const detune = reg === REGISTERS.strings ? 1 + (this.rand() - 0.5) * 0.004 : 1;

    // stereo image follows where the stem sits in the arrangement, narrowed by register
    const spread = (cfg.arrangement === "solitaire" ? 0 : cfg.arrangement === "arch" ? 0.85 : 0.6) * reg.width;
    const pan = (this.rand() * 2 - 1) * spread;

    const out = ctx.createStereoPanner();
    out.pan.value = pan;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    // bloom literally opens the instrument up; the register sets the size of the room
    filter.frequency.value = timbre.lowpass * (0.45 + cfg.bloom * 0.75) * reg.air;
    filter.Q.value = 0.6;

    const decay = timbre.decay * reg.ring;
    // bowed voices swell; struck voices snap. The attack is the clearest difference
    // between a string and a bell, so it is the one the register is allowed to change.
    const attack = reg === REGISTERS.strings ? 0.34 : reg === REGISTERS.nocturne ? 0.16 : 0.012;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    const peak = 0.16 / Math.sqrt(Math.max(1, this.voices));
    env.gain.exponentialRampToValueAtTime(peak, at + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, at + decay);

    filter.connect(env).connect(out).connect(this.master!);

    // cap simultaneous voices so a rapid re-seed cannot pile up oscillators
    this.voices = Math.min(64, this.voices + 1);

    for (const [ratio, gain] of timbre.partials) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * ratio * detune;
      const g = ctx.createGain();
      g.gain.value = gain * 0.5;
      osc.connect(g).connect(filter);
      osc.start(at);
      osc.stop(at + decay + 0.05);
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
      (decay + 0.2) * 1000
    );
  }
}
