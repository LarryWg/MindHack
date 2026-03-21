"use client";

import { useEffect, useRef } from "react";

type RegionActivation = {
  region: string;
  mni: [number, number, number];
  activation: number; // 0-1
  agent: string;
};

type BrainViewerProps = {
  activations?: RegionActivation[];
  onRegionClick?: (region: RegionActivation) => void;
};

const DEFAULT_REGIONS: RegionActivation[] = [
  { region: "Broca's area", mni: [-44, 20, 8], activation: 0.72, agent: "Lexical" },
  { region: "Wernicke's area", mni: [-54, -40, 14], activation: 0.58, agent: "Semantic" },
  { region: "DLPFC", mni: [-46, 20, 32], activation: 0.83, agent: "Syntax" },
  { region: "SMA", mni: [0, -4, 60], activation: 0.44, agent: "Prosody" },
  { region: "Amygdala", mni: [-24, -4, -22], activation: 0.31, agent: "Affective" },
];

function activationColor(a: number): string {
  if (a > 0.75) return "#D85A30";
  if (a > 0.5) return "#EF9F27";
  if (a > 0.25) return "#1D9E75";
  return "#B4B2A9";
}

// SVG brain silhouette fallback — projected MNI coords to 2D
// This is the fallback while NiiVue is integrated
export function BrainViewer({ activations = DEFAULT_REGIONS, onRegionClick }: BrainViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Project MNI coords to SVG space (rough lateral view projection)
  // MNI x: -80 to +80 → SVG x: 60 to 340
  // MNI z: -50 to +80 → SVG y: 280 to 60
  const project = (mni: [number, number, number]): [number, number] => {
    const svgX = ((mni[0] + 80) / 160) * 280 + 60;
    const svgY = 280 - ((mni[2] + 50) / 130) * 220;
    return [svgX, svgY];
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        viewBox="0 0 400 320"
        className="w-full h-full max-w-sm"
        style={{ filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.06))" }}
      >
        {/* Brain silhouette — lateral view outline */}
        <g opacity="0.12">
          {/* Outer cortex */}
          <ellipse cx="200" cy="160" rx="155" ry="130" fill="none" stroke="#000" strokeWidth="1.5" />
          {/* Frontal lobe curve */}
          <path d="M 80 160 Q 60 80 150 50 Q 200 35 240 55" fill="none" stroke="#000" strokeWidth="1" />
          {/* Parietal */}
          <path d="M 240 55 Q 330 60 350 130 Q 360 180 330 230" fill="none" stroke="#000" strokeWidth="1" />
          {/* Temporal */}
          <path d="M 80 160 Q 70 200 90 240 Q 120 270 170 265" fill="none" stroke="#000" strokeWidth="1" />
          {/* Central sulcus */}
          <path d="M 185 48 Q 220 100 210 180" fill="none" stroke="#000" strokeWidth="0.8" strokeDasharray="3 3" />
          {/* Lateral fissure */}
          <path d="M 95 155 Q 160 140 230 150 Q 270 155 300 170" fill="none" stroke="#000" strokeWidth="0.8" strokeDasharray="3 3" />
          {/* Occipital */}
          <path d="M 330 230 Q 310 270 270 275 Q 220 280 170 265" fill="none" stroke="#000" strokeWidth="1" />
          {/* Cerebellum hint */}
          <ellipse cx="285" cy="265" rx="55" ry="30" fill="none" stroke="#000" strokeWidth="0.8" opacity="0.5" />
          {/* Brainstem */}
          <path d="M 200 275 Q 205 295 210 310" fill="none" stroke="#000" strokeWidth="1.5" />
        </g>

        {/* Region activation circles */}
        {activations.map((r) => {
          const [x, y] = project(r.mni);
          const color = activationColor(r.activation);
          const radius = 10 + r.activation * 14;
          return (
            <g
              key={r.region}
              onClick={() => onRegionClick?.(r)}
              style={{ cursor: "pointer" }}
            >
              {/* Pulse ring */}
              <circle
                cx={x}
                cy={y}
                r={radius + 4}
                fill="none"
                stroke={color}
                strokeWidth="1"
                opacity={0.25}
              >
                <animate
                  attributeName="r"
                  values={`${radius + 2};${radius + 10};${radius + 2}`}
                  dur="2.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.3;0;0.3"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* Main dot */}
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill={color}
                opacity={0.75}
              />
              {/* Label */}
              <text
                x={x}
                y={y - radius - 6}
                textAnchor="middle"
                fontSize="9"
                fill="#000"
                opacity={0.45}
                fontFamily="sans-serif"
              >
                {r.region}
              </text>
              {/* Score */}
              <text
                x={x}
                y={y + 3.5}
                textAnchor="middle"
                fontSize="9"
                fill="#fff"
                fontFamily="sans-serif"
                fontWeight="600"
                opacity={0.9}
              >
                {Math.round(r.activation * 100)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* NiiVue TODO badge */}
      <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/5 text-[10px] text-black/30 font-medium">
        SVG fallback · NiiVue loading
      </div>
    </div>
  );
}

export type { RegionActivation };
