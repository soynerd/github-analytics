import { NextRequest, NextResponse } from "next/server";
import { runSecurityScan } from "../../../lib/security";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const repoParam = searchParams.get("repo");
  
  if (!repoParam) {
    return NextResponse.json({ error: "Missing repo parameter" }, { status: 400 });
  }

  // Normalize: handle full URL or owner/repo
  let owner = "";
  let repo = "";
  
  try {
    let raw = repoParam.trim();
    if (raw.startsWith("http")) {
      const url = new URL(raw);
      if (url.hostname !== "github.com") {
        return NextResponse.json({ error: "Only GitHub repositories are supported" }, { status: 400 });
      }
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length < 2) {
        return NextResponse.json({ error: "Invalid GitHub repository URL" }, { status: 400 });
      }
      owner = parts[0];
      repo = parts[1];
    } else {
      const parts = raw.replace(/^github\.com\//, "").split("/").filter(Boolean);
      if (parts.length < 2) {
        return NextResponse.json({ error: "Invalid repository format. Use owner/repo" }, { status: 400 });
      }
      owner = parts[0];
      repo = parts[1];
    }
  } catch (err) {
    return NextResponse.json({ error: "Invalid repository format" }, { status: 400 });
  }

  try {
    const result = await runSecurityScan(owner, repo);
    
    // Convert null responses to 503 or something appropriate if needed
    // But our function returns a status payload
    
    if (result.status === "ERROR") {
        return NextResponse.json({ error: result.message || "Failed to scan repository" }, { status: 500 });
    }
    
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
