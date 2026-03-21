"use client";

import { useState, useEffect } from "react";

export function NeuroTraceSplash({
  minDisplayMs = 2000,
  readyToFade,
  onFadeComplete,
}: {
  minDisplayMs?: number;
  readyToFade?: boolean;
  onFadeComplete?: () => void;
}) {
  const [minTimeReached, setMinTimeReached] = useState(false);
  const [fadeStarted, setFadeStarted] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeReached(true), minDisplayMs);
    return () => clearTimeout(t);
  }, [minDisplayMs]);

  useEffect(() => {
    if (!minTimeReached || fadeStarted) return;
    if (readyToFade === undefined || readyToFade) setFadeStarted(true);
  }, [minTimeReached, readyToFade, fadeStarted]);

  if (splashDone) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center gap-8 transition-opacity duration-700 ${fadeStarted ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      onTransitionEnd={() => {
        if (fadeStarted) {
          setSplashDone(true);
          onFadeComplete?.();
        }
      }}
      aria-hidden
    >
      <div className="flex flex-col items-center gap-3">
        <span className="text-5xl font-semibold tracking-tight text-black">
          neurotrace
        </span>
        <span className="text-sm text-black/40 tracking-widest uppercase">
          cognitive signature analysis
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full bg-black/40 animate-splash-dot-${i}`}
          />
        ))}
      </div>
    </div>
  );
}
