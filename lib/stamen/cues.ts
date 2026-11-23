// The scroll script. Each cue pins the camera and the set at a point in a
// chapter (chapter id + 0..1 through it, 0 being the chapter's top at the
// middle of the screen). Between cues everything blends. Fields a cue leaves
// out carry over from the cue before; `m` overrides them on phones.
//
// The time-lapse itself (the clock, the bloom, the scatter) isn't scripted
// here: the director reads it straight off the scroll, so time runs at an
// even rate.

export type V3 = [number, number, number];

export interface Shot {
  cam: V3;
  look: V3;
  fov: number;
  /** the studio: wall, ledge, window light. 1 there, 0 gone to the color field */
  room: number;
  /** the color field: 0 magenta, 1 blush paper */
  paper: number;
  /** the time-lapse bouquet: where it stands, and how much of it */
  bq: number;
  bqPos: V3;
  bqTurn: number;
  /** the anemone for the close-up */
  macro: number;
  macroTurn: number;
  /** the stem library, and which stem is in front (0..5) */
  lib: number;
  libAt: number;
  /** the bouquet being built */
  build: number;
  buildPos: V3;
  /** loose petals drifting through, and pollen in the close-up */
  drift: number;
  pollen: number;
  /** the heads turning toward the window */
  lean: number;
}

export interface Cue {
  at: [string, number];
  s: Partial<Shot>;
  m?: Partial<Shot>;
}

export const BASE: Shot = {
  cam: [0.12, 0.3, 2.95],
  look: [0.24, 0.16, 0],
  fov: 30,
  room: 1,
  paper: 0,
  bq: 1,
  bqPos: [0.36, 0, 0],
  bqTurn: 0,
  macro: 0,
  macroTurn: 0,
  lib: 0,
  libAt: 0,
  build: 0,
  buildPos: [-0.55, -0.02, 0],
  drift: 0,
  pollen: 0,
  lean: 0,
};

const PHONE_HERO: Partial<Shot> = { cam: [0, 0.5, 4.3], look: [0, 0.62, 0], bqPos: [0, 0, 0] };

export const CUES: Cue[] = [
  // 01 The time-lapse: dawn to the third afternoon, a slow push in as it opens
  { at: ["bloom", 0], s: { ...BASE }, m: PHONE_HERO },
  { at: ["bloom", 0.12], s: {} },
  { at: ["bloom", 0.5], s: { cam: [0.1, 0.28, 2.6], look: [0.26, 0.18, 0], lean: 0.6 }, m: { cam: [0, 0.48, 3.9], look: [0, 0.58, 0] } },
  { at: ["bloom", 0.96], s: { cam: [0.14, 0.27, 2.25], look: [0.3, 0.22, 0], lean: 1 }, m: { cam: [0, 0.44, 3.5], look: [0, 0.54, 0] } },
  // 02 The petals go: a push into the bouquet as they fly at the lens, the room
  // giving way to color, the bare bouquet dropping out of frame
  { at: ["scatter", 0.08], s: {} },
  { at: ["scatter", 0.42], s: { cam: [0.26, 0.34, 1.35], look: [0.36, 0.34, 0], room: 0.55 }, m: { cam: [0, 0.4, 2.0], look: [0, 0.34, 0] } },
  { at: ["scatter", 0.72], s: { cam: [0.3, 0.6, 1.1], look: [0.36, 0.72, 0], room: 0, drift: 1, bq: 1, bqPos: [0.36, -0.4, 0] }, m: { cam: [0, 0.6, 1.8], look: [0, 0.72, 0] } },
  { at: ["scatter", 0.88], s: { bq: 0, bqPos: [0.36, -1.6, 0] } },
  // 03 Closer: one anemone, then into its center, onto the stamens
  {
    at: ["closer", 0.02],
    s: { cam: [0, 0.2, 2.6], look: [0, 0.2, 0], macro: 1, macroTurn: 0, drift: 0.6, lean: 0 },
    m: { cam: [0, 0.2, 3.6] },
  },
  { at: ["closer", 0.34], s: { cam: [0.08, 0.26, 1.7], look: [0.02, 0.2, 0], pollen: 0.3 }, m: { cam: [0, 0.24, 2.3] } },
  { at: ["closer", 0.6], s: { cam: [0.42, 0.52, 1.02], look: [0.03, 0.2, 0.05], pollen: 1, macroTurn: 0.35 }, m: { cam: [0.16, 0.42, 1.5], look: [0, 0.2, 0.05] } },
  { at: ["closer", 0.86], s: { cam: [0.34, 0.46, 0.92], look: [0.03, 0.2, 0.05], macroTurn: 0.7 }, m: { cam: [0.12, 0.38, 1.4] } },
  // 04 The stems: the library on paper, one stem at a time
  {
    at: ["stems", 0.06],
    s: { cam: [-0.3, 0.32, 1.4], look: [-0.3, 0.3, 0], macro: 0, pollen: 0, drift: 0.25, paper: 1, lib: 1, libAt: 0 },
    /*
     * The library plants each head at y≈0.32 with its stem running down to
     * -0.6, so on a phone the frame has to sit low: a portrait frame is ~18°
     * off-axis from a `fov` of 34, which is only 0.62m of half-height at 1.95m.
     * Centring the head in the upper half leaves the plate's copy clear below.
     */
    m: { fov: 34, cam: [0, 0.3, 1.95], look: [0, 0.17, 0] },
  },
  /*
   * The stem library's rail is not scripted here. With ten plates a cue per
   * plate is a second writer racing the director's own computation, and the two
   * fought — the row froze on whichever cue won the blend. The director reads
   * the chapter's progress and holds each stem in turn (see STEMS_FIRST /
   * STEMS_STEP in director.ts).
   */
  { at: ["stems", 0.97], s: { lib: 1 } },
  // 05 Build a bouquet: it stands to the left of the order form, turning
  {
    at: ["build", 0.12],
    s: { cam: [0, 0.16, 2.75], look: [0, 0.14, 0], lib: 0, build: 1, drift: 0.15, paper: 1, buildPos: [-0.62, -0.12, 0] },
    m: { cam: [0, 0.3, 3.9], look: [0, -0.22, 0], buildPos: [0, 0.02, 0] },
  },
  { at: ["build", 0.72], s: { build: 1 } },
  // 06 Care: the field turns magenta again, petals falling
  { at: ["care", 0.1], s: { build: 0, drift: 0.7, paper: 0 } },
  { at: ["care", 1], s: {} },
];
