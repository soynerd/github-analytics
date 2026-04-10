import { NextResponse } from "next/server";
import { getProfile } from "../../../../../lib/github";

export async function GET(_: Request, { params }: { params: Promise<{ username: string }> }) {
  try { const profile = await getProfile((await params).username); const languages = profile.repos.reduce<Record<string, number>>((all, repo) => { if (repo.language) all[repo.language] = (all[repo.language] || 0) + repo.size; return all; }, {}); return NextResponse.json({ username: profile.user.login, languages }); }
  catch { return NextResponse.json({ error: "Profile data is unavailable" }, { status: 503 }); }
}
