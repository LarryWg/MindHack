"use client";

interface BrainRegion {
  label: string;
  abbr: string;
  cx: number;
  cy: number;
  delay: string;
}

// Approximate projected positions on a 320x280 SVG viewport
const regions: BrainRegion[] = [
  { label: "Broca's Area", abbr: "IFG", cx: 112, cy: 148, delay: "0s" },
  { label: "Wernicke's", abbr: "STG", cx: 98, cy: 172, delay: "0.4s" },
  { label: "DLPFC", abbr: "DLPFC", cx: 110, cy: 118, delay: "0.8s" },
  { label: "SMA", abbr: "SMA", cx: 160, cy: 102, delay: "1.2s" },
  { label: "Amygdala", abbr: "AMY", cx: 130, cy: 188, delay: "1.6s" },
];

export function BrainViewerPlaceholder() {
  return (
    <div
      className="relative flex flex-col items-center justify-center flex-1 rounded-xl overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        minHeight: 0,
      }}
    >
      {/* Top-right readout */}
      <div
        className="absolute top-4 right-4 flex flex-col items-end gap-1"
        style={{ fontFamily: "var(--font-jetbrains-mono)" }}
      >
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{
            background: "var(--accent-cyan-dim)",
            color: "var(--accent-cyan)",
            fontSize: "0.62rem",
            border: "1px solid rgba(0, 229, 255, 0.15)",
          }}
        >
          MNI152 · 1mm Isotropic
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)", fontSize: "0.6rem" }}>
          NiiVue · WebGL
        </span>
      </div>

      {/* Top-left label */}
      <div className="absolute top-4 left-4">
        <span
          className="text-xs uppercase tracking-widest"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: "0.6rem",
          }}
        >
          Brain Atlas
        </span>
      </div>

      {/* SVG Brain Silhouette */}
      <div className="flex-1 flex items-center justify-center w-full px-8">
        <svg
          viewBox="0 0 320 280"
          className="w-full max-w-xs animate-brain-glow"
          style={{ maxHeight: "100%", overflow: "visible" }}
          aria-label="Brain silhouette placeholder"
        >
          {/* Outer glow ring */}
          <ellipse
            cx="160"
            cy="145"
            rx="130"
            ry="108"
            fill="none"
            stroke="rgba(0, 229, 255, 0.04)"
            strokeWidth="40"
          />

          {/* Left hemisphere */}
          <ellipse
            cx="145"
            cy="145"
            rx="105"
            ry="92"
            fill="rgba(13, 17, 23, 0.9)"
            stroke="rgba(0, 229, 255, 0.18)"
            strokeWidth="1.5"
          />

          {/* Right hemisphere overlay */}
          <ellipse
            cx="172"
            cy="143"
            rx="90"
            ry="80"
            fill="rgba(17, 22, 32, 0.6)"
            stroke="rgba(0, 229, 255, 0.1)"
            strokeWidth="1"
          />

          {/* Central sulcus line */}
          <path
            d="M160 62 C155 85 162 105 158 130 C154 155 161 175 158 200"
            fill="none"
            stroke="rgba(0, 229, 255, 0.12)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {/* Lateral sulcus */}
          <path
            d="M90 145 C110 140 130 148 155 145 C175 142 195 150 220 148"
            fill="none"
            stroke="rgba(0, 229, 255, 0.08)"
            strokeWidth="1"
          />

          {/* Cerebellum hint */}
          <ellipse
            cx="160"
            cy="222"
            rx="52"
            ry="30"
            fill="rgba(13, 17, 23, 0.8)"
            stroke="rgba(0, 229, 255, 0.1)"
            strokeWidth="1"
          />

          {/* Brain stem */}
          <rect
            x="150"
            y="208"
            width="20"
            height="22"
            rx="4"
            fill="rgba(13, 17, 23, 0.9)"
            stroke="rgba(0, 229, 255, 0.1)"
            strokeWidth="1"
          />

          {/* Region dots */}
          {regions.map((r) => (
            <g key={r.abbr}>
              {/* Outer pulse ring */}
              <circle
                cx={r.cx}
                cy={r.cy}
                r="8"
                fill="none"
                stroke="var(--accent-cyan)"
                strokeWidth="0.5"
                opacity="0.3"
                style={{
                  animation: `pulse-dot 2s ease-in-out ${r.delay} infinite`,
                }}
              />
              {/* Core dot */}
              <circle
                cx={r.cx}
                cy={r.cy}
                r="3"
                fill="var(--accent-cyan)"
                opacity="0.85"
              />
              {/* Label */}
              <text
                x={r.cx + 8}
                y={r.cy + 4}
                fontSize="7"
                fill="rgba(0, 229, 255, 0.55)"
                fontFamily="var(--font-jetbrains-mono)"
              >
                {r.abbr}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Bottom label */}
      <div
        className="w-full px-5 py-3 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <span
          className="text-xs"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-sans)" }}
        >
          Awaiting Analysis
        </span>
        <div className="flex items-center gap-3">
          {regions.slice(0, 3).map((r) => (
            <div key={r.abbr} className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--accent-cyan)", opacity: 0.5 }}
              />
              <span
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-jetbrains-mono)",
                  fontSize: "0.58rem",
                }}
              >
                {r.abbr}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
