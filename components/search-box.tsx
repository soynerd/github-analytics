"use client";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const [username, setUsername] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  function submit(e: FormEvent) {
    e.preventDefault();
    const value = username.trim().replace(/^@/, "");
    if (value) {
      startTransition(() => {
        router.push(`/${encodeURIComponent(value)}`);
      });
    }
  }
  return (
    <form
      className={compact ? "search compact-search" : "search"}
      onSubmit={submit}
    >
      <span className="search-icon">⌕</span>
      <input
        aria-label="GitHub username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter a GitHub username"
        disabled={isPending}
      />
      <button type="submit" disabled={isPending} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {isPending ? <>Analyzing <span className="spinner" aria-label="Loading"></span></> : <>Analyze <span>↗</span></>}
      </button>
    </form>
  );
}
