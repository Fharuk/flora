/**
 * The garden's public contract.
 *
 * This module is shared by the route handlers and the client components, so it must stay
 * free of database imports and of any secret.
 */

import { bouquetTitle, decodeBouquet, encodeBouquet, type BouquetConfig } from "./bouquet";
import { getSpecimen } from "./hybrids";
import type { Arrangement, PaletteKey, Vessel } from "./specimens";

export type GardenEntry = {
  code: string;
  config: string;
  title: string;
  species: string[];
  palette: PaletteKey;
  arrangement: Arrangement;
  vessel: Vessel;
  density: number;
  bloom: number;
  seed: number;
  creator: string | null;
  message: string | null;
  views: number;
  created_at: string;
};

export type GardenList = {
  entries: GardenEntry[];
  /** false when the deployment has no database configured — the UI says so quietly */
  enabled: boolean;
};

/** No 0/O/1/I: these codes get read aloud and hand-typed off gift cards. */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function makeCode(length = 7): string {
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function isCode(value: string): boolean {
  return /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{7}$/.test(value);
}

const clean = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  // strip control characters and angle brackets: these strings are echoed back into the DOM
  const text = value
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
  return text.length ? text : null;
};

export type Submission = {
  config: BouquetConfig;
  encoded: string;
  title: string;
  creator: string | null;
  message: string | null;
};

/**
 * Validates a client submission.
 *
 * The bouquet is re-decoded and re-encoded on the server rather than stored as sent, so a
 * crafted payload cannot put arbitrary text or an unresolvable species into the shared
 * garden — every stored config is guaranteed to render.
 */
export function parseSubmission(input: unknown): Submission | null {
  if (!input || typeof input !== "object") return null;
  const body = input as Record<string, unknown>;
  const raw = typeof body.config === "string" ? body.config : "";
  if (!raw || raw.length > 400) return null;

  // decode with a defensive parse: a malformed string falls back to defaults, so compare
  const config = decodeBouquet(raw);
  if (!config.species.length) return null;
  if (!config.species.every((slug) => Boolean(getSpecimen(slug)))) return null;

  const encoded = encodeBouquet(config);
  return {
    config,
    encoded,
    title: bouquetTitle(config),
    creator: clean(body.creator, 48),
    message: clean(body.message, 180),
  };
}

/** Row from Postgres to the shape the client consumes. */
export function toEntry(row: Record<string, unknown>): GardenEntry {
  const config = decodeBouquet(String(row.config ?? ""));
  return {
    code: String(row.code ?? ""),
    config: String(row.config ?? ""),
    title: String(row.title ?? bouquetTitle(config)),
    species: Array.isArray(row.species) ? (row.species as string[]) : config.species,
    palette: config.palette,
    arrangement: config.arrangement,
    vessel: config.vessel,
    density: config.density,
    bloom: Math.round(config.bloom * 100),
    seed: config.seed,
    creator: typeof row.creator === "string" ? row.creator : null,
    message: typeof row.message === "string" ? row.message : null,
    views: typeof row.views === "number" ? row.views : Number(row.views ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export const GARDEN_COLUMNS =
  "code,config,title,species,palette,arrangement,vessel,density,bloom,seed,creator,message,views,created_at";
