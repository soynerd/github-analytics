"use client";

import { useEffect, useState } from "react";

export function OnboardingHint() {
  const [show, setShow] = useState(true);

  if (!show) return null;

  return (
    <div className="onboarding-hint" onClick={() => setShow(false)} role="dialog" aria-label="Onboarding hint">
      <svg className="onboarding-arrow" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M25,45 Q40,45 40,10" />
        <path d="M30,20 L40,10 L50,20" />
      </svg>
      <div className="onboarding-text">
        Explore more tools from here
        <button aria-label="Dismiss" className="onboarding-close" onClick={(e) => { e.stopPropagation(); setShow(false); }}>×</button>
      </div>
    </div>
  );
}
