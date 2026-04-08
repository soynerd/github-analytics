"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const [username, setUsername] = useState("");
  const router = useRouter();
  function submit(e: FormEvent) {
    e.preventDefault();
    const value = username.trim().replace(/^@/, "");
    if (value) router.push(`/${encodeURIComponent(value)}`);
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
      />
      <button type="submit">
        Analyze <span>↗</span>
      </button>
    </form>
  );
}
