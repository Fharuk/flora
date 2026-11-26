import { NextResponse } from "next/server";

import { clientKey, db, hasGarden, rateLimit, TABLES } from "@/lib/db";
import { GARDEN_COLUMNS, makeCode, parseSubmission, toEntry, type GardenList } from "@/lib/garden";

export const dynamic = "force-dynamic";

const LIMIT = 24;

export async function GET() {
  const client = db();
  if (!client) {
    return NextResponse.json<GardenList>({ entries: [], enabled: false });
  }

  /*
   * The garden is a public wall, so it must not list what was sent privately.
   *
   * A gift carries the recipient's name and a letter written to one person. Put on a
   * public page, both are readable by anyone browsing, and the PIN would be guarding the
   * photographs while the words sat in the open — the lock would look like privacy without
   * being it. Filtering on `pin_hash` alone would not be enough either: an unlocked gift is
   * still a private letter, so the test is whether the row was sent as a gift at all.
   *
   * `recipient` is that test. `status` cannot be one — it defaults to 'sealed' on every row,
   * gift or not, so filtering on it would have hidden the entire garden. `recipient` is only
   * set by the gift flow, where it names who the envelope is for.
   */
  const { data, error } = await client
    .from(TABLES.bouquets)
    .select(GARDEN_COLUMNS)
    .is("recipient", null)
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    // A garden that cannot reach its database should read as empty, not as an error page.
    return NextResponse.json<GardenList>({ entries: [], enabled: hasGarden() });
  }

  return NextResponse.json<GardenList>({
    entries: (data ?? []).map((row) => toEntry(row as Record<string, unknown>)),
    enabled: true,
  });
}

export async function POST(request: Request) {
  const client = db();
  if (!client) {
    return NextResponse.json({ error: "no-database" }, { status: 503 });
  }

  if (!rateLimit(`garden:${clientKey(request)}`, 6, 60_000)) {
    return NextResponse.json({ error: "too-many" }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const submission = parseSubmission(payload);
  if (!submission) {
    return NextResponse.json({ error: "bad-bouquet" }, { status: 400 });
  }

  const config = submission.config;
  const row = {
    code: makeCode(),
    config: submission.encoded,
    title: submission.title,
    species: config.species,
    palette: config.palette,
    arrangement: config.arrangement,
    vessel: config.vessel,
    density: config.density,
    bloom: Math.round(config.bloom * 100),
    seed: config.seed,
    creator: submission.creator,
    message: submission.message,
  };

  // A code collision is possible in principle; one retry is enough at this scale.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await client
      .from(TABLES.bouquets)
      .insert(row)
      .select("code,created_at")
      .single();

    if (!error && data) {
      return NextResponse.json({ code: data.code, created_at: data.created_at }, { status: 201 });
    }
    if (error?.code !== "23505") {
      return NextResponse.json({ error: "insert-failed" }, { status: 500 });
    }
    row.code = makeCode();
  }

  return NextResponse.json({ error: "insert-failed" }, { status: 500 });
}
