// The composition being built, and the small collection of saved ones.
//
// This was the kit's cart. Flora-Synth has no prices and no checkout, so the
// shape survives but the commerce is gone: `pick` is still the single source of
// truth the 3D bouquet follows, and `lines` became a shelf of sealed
// compositions rather than an order. A sealed composition is a share link, so
// the shelf stores the link, not a basket line.

import { useSyncExternalStore } from "react";
import { sizeById, type PaletteId, type SizeId, type WrapId } from "./catalog";

export interface Pick {
  size: SizeId;
  palette: PaletteId;
  wrap: WrapId;
  vase: boolean;
  note: string;
}

export interface Line extends Pick {
  id: string;
  qty: number;
}

interface CartState {
  lines: Line[];
  open: boolean;
  pick: Pick;
}

const KEY = "flora-synth-compositions-v1";

function load(): Line[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((l) => l && typeof l.qty === "number" && sizeById(l.size)) : [];
  } catch {
    return [];
  }
}

let state: CartState = {
  lines: typeof window === "undefined" ? [] : load(),
  open: false,
  pick: { size: "classic", palette: "garnet", wrap: "kraft", vase: false, note: "" },
};
const listeners = new Set<() => void>();

function set(patch: Partial<CartState>) {
  state = { ...state, ...patch };
  if (patch.lines) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state.lines));
    } catch {
      /* private mode: the shelf still works for this visit */
    }
  }
  listeners.forEach((l) => l());
}

export const cart = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  pick(patch: Partial<Pick>) {
    set({ pick: { ...state.pick, ...patch } });
  },
  /** seal the current composition onto the shelf */
  add() {
    const p = state.pick;
    const id = `${p.size}-${p.palette}-${p.wrap}-${p.vase ? "v" : "n"}-${p.note.trim()}`;
    const lines = [...state.lines];
    const at = lines.findIndex((l) => l.id === id);
    if (at >= 0) lines[at] = { ...lines[at], qty: Math.min(10, lines[at].qty + 1) };
    else lines.push({ ...p, note: p.note.trim(), id, qty: 1 });
    set({ lines, open: true });
  },
  setQty(id: string, qty: number) {
    const lines = state.lines.map((l) => (l.id === id ? { ...l, qty: Math.max(0, Math.min(10, qty)) } : l)).filter((l) => l.qty > 0);
    set({ lines });
  },
  remove(id: string) {
    set({ lines: state.lines.filter((l) => l.id !== id) });
  },
  setOpen(open: boolean) {
    set({ open });
  },
};

export function useCart() {
  return useSyncExternalStore(cart.subscribe, cart.get, cart.get);
}

/** how many stems a composition holds, for the panel's readout */
export function stemCount(p: Pick) {
  return sizeById(p.size).stems;
}

export function totals(lines: Line[]) {
  return {
    count: lines.reduce((n, l) => n + l.qty, 0),
    stems: lines.reduce((n, l) => n + stemCount(l) * l.qty, 0),
  };
}
