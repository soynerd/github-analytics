import { NextResponse } from "next/server";
import { getProfile } from "../../../../lib/github";

export async function GET(_: Request, { params }: { params: Promise<{ username: string }> }) {
  try { return NextResponse.json(await getProfile((await params).username)); }
  catch (error) { const status = error instanceof Error && error.message === "404" ? 404 : 503; return NextResponse.json({ error: "Profile data is unavailable" }, { status }); }
}
