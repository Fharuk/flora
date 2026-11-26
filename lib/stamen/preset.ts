// Which light the film is under.
//
// The film's own light is the story's: it starts in a morning room, night falls
// through the middle chapters, and the essay at the end is printed on paper. A
// preset does not replace that arc — it grades it, so a viewer can read the whole
// film under a black studio or a lit sheet and still follow the argument.
//
// The choice lives in one store, like `live` and `cart`, because the director,
// the control and any other reader must agree without a prop chain.

export type LightingPreset = "daylight" | "night" | "paper";

export const PRESETS: { id: LightingPreset; name: string; note: string }[] = [
  { id: "daylight", name: "Daylight", note: "The film as it is: morning, night, then paper." },
  { id: "night", name: "Night studio", note: "One black room, key and rim light only." },
  { id: "paper", name: "Paper", note: "The lit wall throughout; the essay's own ground." },
];

const KEY = "flora-synth.preset";

function isPreset(v: unknown): v is LightingPreset {
  return v === "daylight" || v === "night" || v === "paper";
}

let current: LightingPreset = "daylight";
const listeners = new Set<() => void>();

/** reads the stored choice, or the URL's, once at start-up */
export function readPreset(): LightingPreset {
  if (typeof window === "undefined") return "daylight";
  const fromUrl = new URLSearchParams(window.location.search).get("light");
  if (isPreset(fromUrl)) return fromUrl;
  try {
    const stored = window.localStorage.getItem(KEY);
    if (isPreset(stored)) return stored;
  } catch {
    /* private mode, or storage disabled: the default is a fine answer */
  }
  return "daylight";
}

export function initPreset() {
  current = readPreset();
}

export const presetStore = {
  get: () => current,
  set(next: LightingPreset) {
    if (next === current) return;
    current = next;
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* the choice still applies to this view */
    }
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
