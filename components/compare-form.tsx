"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";

export function CompareForm({ defaultLeft, defaultRight }: { defaultLeft?: string, defaultRight?: string }) {
  const [left, setLeft] = useState(defaultLeft || "");
  const [right, setRight] = useState(defaultRight || "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (left && right) {
      startTransition(() => {
        router.push(`/compare?left=${encodeURIComponent(left)}&right=${encodeURIComponent(right)}`);
      });
    }
  }

  return (
    <form className="compare-form" onSubmit={submit}>
      <input 
        name="left" 
        value={left}
        onChange={e => setLeft(e.target.value)}
        placeholder="First GitHub username" 
        required
        disabled={isPending}
      />
      <span>vs</span>
      <input 
        name="right" 
        value={right}
        onChange={e => setRight(e.target.value)}
        placeholder="Second GitHub username" 
        required
        disabled={isPending}
      />
      <button type="submit" disabled={isPending} style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "center" }}>
        {isPending ? <>Comparing... <span className="spinner"></span></> : "Compare →"}
      </button>
    </form>
  );
}
