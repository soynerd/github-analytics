"use client";

export function ExportControls({ username }: { username: string }) {
  async function downloadJson() {
    const response = await fetch(`/api/profile/${username}`);
    if (!response.ok) return;
    const blob = new Blob([JSON.stringify(await response.json(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${username}-gitlume-analytics.json`; anchor.click(); URL.revokeObjectURL(url);
  }
  async function share() {
    const data = { title: `${username} on GitLume`, text: `Explore ${username}'s public GitHub analytics.`, url: window.location.href };
    if (navigator.share) await navigator.share(data); else await navigator.clipboard.writeText(window.location.href);
  }
  return <div className="export-controls"><button onClick={downloadJson}>Export JSON</button><button onClick={() => window.print()}>Save as PDF</button><button onClick={share}>Share profile</button></div>;
}
