"use client";

const BAR_COUNT = 40;

// Pre-computed random heights and delays for deterministic SSR
const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
  const heights = [
    20, 45, 30, 65, 80, 55, 35, 70, 90, 60, 40, 75, 50, 85, 30, 65,
    45, 55, 80, 70, 35, 60, 90, 50, 40, 75, 65, 55, 80, 45, 30, 70,
    85, 60, 50, 90, 40, 65, 55, 75,
  ];
  const delays = [
    0, 0.08, 0.16, 0.24, 0.1, 0.32, 0.4, 0.18, 0.48, 0.26, 0.56,
    0.34, 0.64, 0.42, 0.72, 0.5, 0.08, 0.58, 0.16, 0.66, 0.24, 0.74,
    0.32, 0.08, 0.4, 0.16, 0.48, 0.24, 0.56, 0.32, 0.64, 0.4, 0.72,
    0.48, 0.08, 0.56, 0.16, 0.64, 0.24, 0.72,
  ];
  return {
    id: i,
    maxH: heights[i % heights.length],
    delay: delays[i % delays.length],
  };
});

export function WaveformPlaceholder() {
  return (
    <div
      className="rounded-xl px-5 py-3 flex flex-col gap-2 shrink-0"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        height: "96px",
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--text-muted)" }}
          />
          <span
            className="text-xs"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-dm-sans)",
              fontSize: "0.7rem",
            }}
          >
            Speech Input
          </span>
          <span
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: "0.6rem",
            }}
          >
            · —
          </span>
        </div>
        <span
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: "0.6rem",
          }}
        >
          Whisper v3
        </span>
      </div>

      {/* Waveform bars */}
      <div
        className="flex-1 flex items-center gap-[2px]"
        style={{ minHeight: 0 }}
      >
        {bars.map((bar) => (
          <div
            key={bar.id}
            className="flex-1 rounded-full"
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "100%",
                height: `${bar.maxH}%`,
                background: "var(--accent-cyan)",
                opacity: 0.25,
                borderRadius: "2px",
                transformOrigin: "center",
                animation: `waveform-bar 1.8s ease-in-out ${bar.delay}s infinite`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
