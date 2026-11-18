import { NextResponse } from "next/server";

import { clientKey, db, rateLimit, TABLES } from "@/lib/db";
import { GARDEN_COLUMNS, isCode, toEntry } from "@/lib/garden";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!isCode(code)) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const client = db();
  if (!client) return NextResponse.json({ error: "no-database" }, { status: 503 });

  const { data, error } = await client
    .from(TABLES.bouquets)
    .select(GARDEN_COLUMNS)
    .eq("code", code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "lookup-failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not-found" }, { status: 404 });

  return NextResponse.json({ entry: toEntry(data as Record<string, unknown>) });
}

/** Counting a view is a write, so it gets its own verb and its own throttle. */
export async function POST(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!isCode(code)) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const client = db();
  if (!client) return NextResponse.json({ error: "no-database" }, { status: 503 });

  // one view per visitor per bouquet per hour
  if (!rateLimit(`view:${code}:${clientKey(request)}`, 1, 3_600_000)) {
    return NextResponse.json({ counted: false });
  }

  const { data } = await client
    .from(TABLES.bouquets)
    .select("views")
    .eq("code", code)
    .maybeSingle();

  const views = Number((data as { views?: number } | null)?.views ?? 0) + 1;
  await client.from(TABLES.bouquets).update({ views }).eq("code", code);

  return NextResponse.json({ counted: true, views });
}
