"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types & constants ────────────────────────────────────────────────

export type RegionActivation = {
  region: string;
  mni: [number, number, number];
  activation: number; // 0–1, driven by agent overall score
  agent: string;
};

export const DEFAULT_REGIONS: RegionActivation[] = [
  { region: "Broca's area", mni: [-44, 20, 8], activation: 0.72, agent: "Lexical" },
  { region: "Wernicke's area", mni: [-54, -40, 14], activation: 0.58, agent: "Semantic" },
  { region: "DLPFC", mni: [-46, 20, 32], activation: 0.83, agent: "Syntax" },
  { region: "SMA", mni: [0, -4, 60], activation: 0.44, agent: "Prosody" },
  { region: "Amygdala", mni: [-24, -4, -22], activation: 0.31, agent: "Affective" },
];

type BrainViewerProps = {
  activations?: RegionActivation[];
  onRegionClick?: (r: RegionActivation) => void;
  activeAgentName?: string;
};

// ─── MNI ↔ Voxel helpers ─────────────────────────────────────────────

/** MNI152 1mm isotropic: origin at voxel [90, 126, 72] */
function mniToVoxel(mni: [number, number, number]): [number, number, number] {
  return [
    Math.round(90 - mni[0]),
    Math.round(126 + mni[1]),
    Math.round(72 + mni[2]),
  ];
}

// ─── SVG fallback ─────────────────────────────────────────────────────

function activationColor(a: number): string {
  if (a > 0.75) return "#D85A30";
  if (a > 0.5) return "#EF9F27";
  if (a > 0.25) return "#1D9E75";
  return "#B4B2A9";
}

/** Project MNI coords to SVG lateral view (viewBox 0 0 400 320) */
const project = (mni: [number, number, number]): [number, number] => [
  ((mni[0] + 80) / 160) * 280 + 60,
  280 - ((mni[2] + 50) / 130) * 220,
];

function SvgFallback({
  activations,
  onRegionClick,
}: {
  activations: RegionActivation[];
  onRegionClick?: (r: RegionActivation) => void;
}) {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white/50 rounded-xl">
      <svg viewBox="0 0 400 320" className="w-full h-full max-w-[400px] max-h-[320px]">
        {/* Brain silhouette — lateral view outline */}
        <g opacity="0.12">
          <ellipse cx="200" cy="160" rx="155" ry="130" fill="none" stroke="#000" strokeWidth="1.5" />
          <path d="M 80 160 Q 60 80 150 50 Q 200 35 240 55" fill="none" stroke="#000" strokeWidth="1" />
          <path d="M 240 55 Q 330 60 350 130 Q 360 180 330 230" fill="none" stroke="#000" strokeWidth="1" />
          <path d="M 80 160 Q 70 200 90 240 Q 120 270 170 265" fill="none" stroke="#000" strokeWidth="1" />
          <path d="M 185 48 Q 220 100 210 180" fill="none" stroke="#000" strokeWidth="0.8" strokeDasharray="3 3" />
          <path d="M 95 155 Q 160 140 230 150 Q 270 155 300 170" fill="none" stroke="#000" strokeWidth="0.8" strokeDasharray="3 3" />
          <path d="M 330 230 Q 310 270 270 275 Q 220 280 170 265" fill="none" stroke="#000" strokeWidth="1" />
          <ellipse cx="285" cy="265" rx="55" ry="30" fill="none" stroke="#000" strokeWidth="0.8" opacity="0.5" />
          <path d="M 200 275 Q 205 295 210 310" fill="none" stroke="#000" strokeWidth="1.5" />
        </g>

        {/* Region activation circles */}
        {activations.map((r) => {
          const [x, y] = project(r.mni);
          const color = activationColor(r.activation);
          const radius = 10 + r.activation * 14;
          return (
            <g key={r.region} onClick={() => onRegionClick?.(r)} style={{ cursor: "pointer" }}>
              <circle cx={x} cy={y} r={radius + 4} fill="none" stroke={color} strokeWidth="1" opacity={0.25}>
                <animate attributeName="r" values={`${radius + 2};${radius + 10};${radius + 2}`} dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={x} cy={y} r={radius} fill={color} opacity={0.75} />
              <text x={x} y={y - radius - 6} textAnchor="middle" fontSize="9" fill="#000" opacity={0.45} fontFamily="sans-serif">
                {r.region}
              </text>
              <text x={x} y={y + 3.5} textAnchor="middle" fontSize="9" fill="#fff" fontFamily="sans-serif" fontWeight="600" opacity={0.9}>
                {Math.round(r.activation * 100)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/5 text-[10px] text-black/30 font-medium">
        SVG fallback · WebGL unavailable
      </div>
    </div>
  );
}

// ─── Overlay generation ───────────────────────────────────────────────

type NiivueInstance = {
  attachToCanvas: (canvas: HTMLCanvasElement) => void;
  loadVolumes: (list: Array<{ url: string }>) => Promise<unknown>;
  setSliceType: (st: number) => unknown;
  volumes: Array<{
    hdr: { dims: number[]; pixDims: number[] } | null;
    img?: Float32Array | Uint8Array | Int16Array | Float64Array | Uint16Array | Int32Array | Uint32Array;
    clone: () => NiivueVolume;
  }>;
  removeVolumeByIndex: (idx: number) => void;
  addVolume: (vol: NiivueVolume) => void;
  updateGLVolume: () => void;
  scene: { crosshairPos: [number, number, number] };
  frac2mm: (frac: [number, number, number]) => [number, number, number, number];
};

type NiivueVolume = {
  hdr: { dims: number[]; pixDims: number[] } | null;
  img?: Float32Array | Uint8Array | Int16Array | Float64Array | Uint16Array | Int32Array | Uint32Array;
  colormap: string;
  opacity: number;
  cal_min: number;
  cal_max: number;
  clone: () => NiivueVolume;
};

function updateOverlay(nv: NiivueInstance, activations: RegionActivation[]) {
  const baseVol = nv.volumes[0];
  if (!baseVol?.hdr) return;

  const { dims, pixDims } = baseVol.hdr;
  const [nx, ny, nz] = [dims[1], dims[2], dims[3]];
  const data = new Float32Array(nx * ny * nz).fill(0);

  for (const r of activations) {
    const [vx, vy, vz] = mniToVoxel(r.mni);
    const sigVox = 8 / pixDims[1]; // 8mm Gaussian blob
    for (let x = Math.max(0, vx - 15); x < Math.min(nx, vx + 15); x++)
      for (let y = Math.max(0, vy - 15); y < Math.min(ny, vy + 15); y++)
        for (let z = Math.max(0, vz - 15); z < Math.min(nz, vz + 15); z++) {
          const d2 = ((x - vx) ** 2 + (y - vy) ** 2 + (z - vz) ** 2) / (sigVox ** 2);
          const val = r.activation * Math.exp(-d2 / 2);
          const idx = x + y * nx + z * nx * ny;
          if (val > data[idx]) data[idx] = val; // max blend
        }
  }

  // Remove existing overlay
  if (nv.volumes.length > 1) {
    nv.removeVolumeByIndex(1);
  }

  // Create overlay volume by cloning the base, zeroing it, then filling with our data
  const overlay = baseVol.clone() as NiivueVolume;
  overlay.img = data;
  overlay.colormap = "warm";
  overlay.opacity = 0.7;
  overlay.cal_min = 0.1;
  overlay.cal_max = 1.0;
  nv.addVolume(overlay as unknown as Parameters<NiivueInstance["addVolume"]>[0]);
  nv.updateGLVolume();
}

// ─── Main component ───────────────────────────────────────────────────

export default function BrainViewer({
  activations = DEFAULT_REGIONS,
  onRegionClick,
  activeAgentName: _activeAgentName,
}: BrainViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nvRef = useRef<NiivueInstance | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Init NiiVue on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!canvasRef.current) return;

      try {
        const { Niivue, SLICE_TYPE } = await import("@niivue/niivue");

        if (cancelled) return;

        const nv = new Niivue({
          backColor: [1, 1, 1, 0],
          crosshairColor: [0.8, 0.3, 0.1, 0.6],
        });

        nv.attachToCanvas(canvasRef.current);
        await nv.loadVolumes([{ url: "/MNI152_T1_1mm.nii.gz" }]);

        if (cancelled) return;

        nv.setSliceType(SLICE_TYPE.RENDER);
        nvRef.current = nv as unknown as NiivueInstance;
        setIsLoading(false);
      } catch (err) {
        console.error("NiiVue init failed:", err);
        if (!cancelled) {
          setWebglFailed(true);
          setIsLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Update overlay when activations change
  useEffect(() => {
    if (!nvRef.current) return;
    updateOverlay(nvRef.current, activations);
  }, [activations]);

  // Region click handler
  const handleClick = useCallback(() => {
    if (!nvRef.current || !onRegionClick) return;

    const nv = nvRef.current;
    const mm = nv.frac2mm(nv.scene.crosshairPos);

    const closest = activations.reduce((best, r) => {
      const d = Math.hypot(r.mni[0] - mm[0], r.mni[1] - mm[1], r.mni[2] - mm[2]);
      const bd = Math.hypot(best.mni[0] - mm[0], best.mni[1] - mm[1], best.mni[2] - mm[2]);
      return d < bd ? r : best;
    });

    const dist = Math.hypot(
      closest.mni[0] - mm[0],
      closest.mni[1] - mm[1],
      closest.mni[2] - mm[2],
    );

    if (dist < 20) onRegionClick(closest);
  }, [activations, onRegionClick]);

  // SVG fallback when WebGL is unavailable
  if (webglFailed) {
    return <SvgFallback activations={activations} onRegionClick={onRegionClick} />;
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="w-full h-full"
        style={{ cursor: onRegionClick ? "crosshair" : "default" }}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-black/10 border-t-black/40 rounded-full animate-spin" />
            <span className="text-[11px] text-black/30 font-medium tracking-wide">
              Loading MNI152 atlas
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
