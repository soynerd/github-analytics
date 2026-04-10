import { NextResponse } from "next/server";
import { getProfile } from "../../../../../lib/github";

export async function GET(_: Request, { params }: { params: Promise<{ username: string }> }) {
  try { const profile = await getProfile((await params).username); return NextResponse.json({ username: profile.user.login, total: profile.totalContributions, currentStreak: profile.currentStreak, longestStreak: profile.longestStreak, days: profile.contributions }); }
  catch { return NextResponse.json({ error: "Profile data is unavailable" }, { status: 503 }); }
}
