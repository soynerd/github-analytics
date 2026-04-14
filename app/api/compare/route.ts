import { NextResponse } from "next/server";
import { getProfile } from "../../../lib/github";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url); const left = searchParams.get("left"); const right = searchParams.get("right");
  if (!left || !right) return NextResponse.json({ error: "left and right usernames are required" }, { status: 400 });
  try { const [leftProfile, rightProfile] = await Promise.all([getProfile(left), getProfile(right)]); return NextResponse.json({ left: leftProfile, right: rightProfile }); }
  catch { return NextResponse.json({ error: "One or both profiles are unavailable" }, { status: 503 }); }
}
