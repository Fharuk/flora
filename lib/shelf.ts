/**
 * Your own shelf.
 *
 * The instrument has always had a cart, and the cart has always forgotten
 * everything the moment the tab closed. A composition is a URL — there is nothing
 * to store but a string — so keeping them costs a few hundred bytes and turns
 * "you can share it" into "you can keep it".
 *
 * This is deliberately not the garden. The garden is public and moderated and
 * lives in a database; the shelf is yours, on this device, and never leaves it.
 * The two share nothing but the encoding.
 */

import { bouquetTitle, decodeBouquet } from "./bouquet";

const KEY = "flora-synth.shelf";
const MAX = 24;

export type ShelfItem = {
  /** the recipe, without a leading "?" */
  config: string;
  title: string;
  /** ms since epoch */
  at: number;
};

function read(): ShelfItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is ShelfItem =>
        typeof x === "object" && x !== null && typeof (x as ShelfItem).config === "string" && typeof (x as ShelfItem).at === "number"
    );
  } catch {
    /* corrupt, or storage disabled: an empty shelf is a fine shelf */
    return [];
  }
}

function write(items: ShelfItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
  } catch {
    /* quota or private mode — the caller still has the item in memory */
  }
}

export const shelf = {
  list(): ShelfItem[] {
    return read().sort((a, b) => b.at - a.at);
  },

  has(config: string): boolean {
    return read().some((i) => i.config === config);
  },

  /** adds or replaces, so pressing save twice does not make two copies */
  add(config: string): ShelfItem[] {
    const items = read().filter((i) => i.config !== config);
    items.unshift({ config, title: bouquetTitle(decodeBouquet(config)), at: Date.now() });
    const next = items.slice(0, MAX);
    write(next);
    return next.sort((a, b) => b.at - a.at);
  },

  remove(config: string): ShelfItem[] {
    const next = read().filter((i) => i.config !== config);
    write(next);
    return next.sort((a, b) => b.at - a.at);
  },

  clear(): ShelfItem[] {
    write([]);
    return [];
  },
};

/** the URL a saved item reopens, in the instrument */
export function shelfHref(item: ShelfItem): string {
  return `/compose/?${item.config}`;
}
