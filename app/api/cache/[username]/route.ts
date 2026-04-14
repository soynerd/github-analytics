import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ username: string }> }) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ enabled: false });
  try { const entry = await prisma.analyticsCache.findUnique({ where: { username: (await params).username.toLowerCase() }, select: { cachedAt: true, expiresAt: true } }); return NextResponse.json({ enabled: true, cached: Boolean(entry), cachedAt: entry?.cachedAt ?? null, expiresAt: entry?.expiresAt ?? null, fresh: entry ? entry.expiresAt > new Date() : false }); }
  catch { return NextResponse.json({ enabled: true, available: false }, { status: 503 }); }
}
