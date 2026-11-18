import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase access.
 *
 * Every read and write goes through a route handler holding the service key, so the browser
 * never sees a database credential and row-level security can stay fully closed. When the
 * two environment variables are missing — which is the case in a bare local checkout — the
 * garden degrades to an empty, read-only state instead of throwing, so the app still runs
 * without a database.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

let cached: SupabaseClient | null = null;

export function hasGarden(): boolean {
  return Boolean(url && serviceKey);
}

export function db(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  if (!cached) {
    cached = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-application-name": "flora-synth" } },
    });
  }
  return cached;
}

/** Table names are namespaced so the project can host more than one product. */
export const TABLES = {
  bouquets: "flora_bouquets",
  hybrids: "flora_hybrids",
} as const;

/**
 * A tiny in-process throttle. Serverless instances are recycled, so this is a speed bump
 * rather than a hard limit — enough to stop a single client from filling the table.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return (forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip")) ?? "anonymous";
}
