"use client";

import { useState, useEffect } from "react";

const SPLASH_MIN_MS = 2000;

export function CallioLabsSplash({
  minDisplayMs = SPLASH_MIN_MS,
  /** When provided, fade only after both minDisplayMs and readyToFade are true (e.g. model loaded). */
  readyToFade,
  onFadeComplete,
  className = "",
  style = {},
}: {
  minDisplayMs?: number;
  readyToFade?: boolean;
  onFadeComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
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

  const handleAnimationEnd = () => {
    if (fadeStarted && !splashDone) {
      setSplashDone(true);
      onFadeComplete?.();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-white ${fadeStarted ? "animate-splash-fade-out" : ""} ${className}`}
      style={{
        opacity: fadeStarted ? undefined : 1,
        pointerEvents: splashDone ? "none" : "auto",
        ...style,
      }}
      onAnimationEnd={handleAnimationEnd}
      aria-hidden
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6 text-black"
        aria-label="Loading"
      >
        <span
          className="font-semibold text-5xl md:text-6xl tracking-tight"
          style={{ fontFamily: '"Callio", sans-serif' }}
        >
          callio labs
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-black/80 animate-loading-dot-1" />
          <span className="w-2 h-2 rounded-full bg-black/80 animate-loading-dot-2" />
          <span className="w-2 h-2 rounded-full bg-black/80 animate-loading-dot-3" />
        </div>
      </div>
    </div>
  );
}
