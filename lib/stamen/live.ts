// A tiny store the 3D director writes and the page reads (and the reverse):
// load progress and the chapter on screen.

export interface LiveState {
  ready: boolean;
  load: number;
  scene: string;
  hover: number;
  failed: boolean;
}

type Listener = (s: LiveState) => void;

const state: LiveState = {
  ready: false,
  load: 0,
  scene: "bloom",
  hover: -1,
  failed: false,
};
const listeners = new Set<Listener>();

export const live = {
  get: () => state,
  set(patch: Partial<LiveState>) {
    let changed = false;
    for (const k of Object.keys(patch) as (keyof LiveState)[]) {
      if (state[k] !== patch[k]) {
        (state as unknown as Record<string, unknown>)[k] = patch[k];
        changed = true;
      }
    }
    if (changed) listeners.forEach((l) => l(state));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
