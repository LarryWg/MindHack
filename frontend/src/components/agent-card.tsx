"use client";

import { REGIONS } from "./brain-atlas";

type Marker = { name: string; value: number; unit?: string };

export type AgentCardProps = {
  agentName: string;
  primerSet: string;
  brainRegion: string;
  markers: Marker[];
  topScore?: number;
  isActive?: boolean;
  isLoading?: boolean;
};

const AGENT_DETAILS: Record<string, { primerSet: string; markers: Marker[]; topScore: number }> = {
  Syntax: {
    primerSet: "MLU · Depth · Passive",
    markers: [
      { name: "MLU", value: 83 },
      { name: "Clause depth", value: 79 },
      { name: "Passive voice", value: 22 },
    ],
    topScore: 83,
  },
  Lexical: {
    primerSet: "TTR · Density · Filler",
    markers: [
      { name: "TTR", value: 68 },
      { name: "Lexical density", value: 74 },
      { name: "Filler rate", value: 42 },
    ],
    topScore: 72,
  },
  Semantic: {
    primerSet: "Coherence · Density · Tang",
    markers: [
      { name: "Coherence", value: 58 },
      { name: "Idea density", value: 61 },
      { name: "Tangentiality", value: 33 },
    ],
    topScore: 58,
  },
  Prosody: {
    primerSet: "Rate · Pause · Hesitation",
    markers: [
      { name: "Speech rate", value: 44, unit: "wpm" },
      { name: "Pause freq", value: 51, unit: "/min" },
      { name: "Hesitation", value: 38 },
    ],
    topScore: 44,
  },
  Affective: {
    primerSet: "Valence · Arousal · Intensity",
    markers: [
      { name: "Valence", value: 55 },
      { name: "Arousal", value: 62 },
      { name: "Intensity", value: 48 },
    ],
    topScore: 62,
  },
};

function scoreColor(score: number): string {
  if (score > 75) return "#D85A30";
  if (score > 50) return "#BA7517";
  if (score > 25) return "#1D9E75";
  return "#888780";
}

export const MOCK_AGENTS: AgentCardProps[] = REGIONS.map((region) => {
  const details = AGENT_DETAILS[region.agent];
  return {
    agentName: `${region.agent} Agent`,
    primerSet: details.primerSet,
    brainRegion: region.label,
    markers: details.markers,
    topScore: details.topScore,
  };
});

export function AgentCard({
  agentName,
  primerSet,
  brainRegion,
  markers,
  topScore = 0,
  isActive = false,
  isLoading = false,
}: AgentCardProps) {
  if (isLoading) {
    return (
      <div className="p-4 h-full flex flex-col gap-3">
        <div className="h-3.5 w-2/3 rounded-md bg-black/8 animate-pulse" />
        <div className="h-2.5 w-1/2 rounded bg-black/5 animate-pulse" />
        <div className="h-1.5 w-full rounded-full bg-black/5 animate-pulse mt-1" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="h-2.5 w-24 rounded bg-black/5 animate-pulse" />
            <div className="h-2.5 w-8 rounded bg-black/5 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const color = scoreColor(topScore);

  return (
    <div className="p-4 h-full flex flex-col gap-3">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-black/85">{agentName}</p>
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color }}
          >
            {topScore}
          </span>
        </div>
        <p className="text-xs text-black/45 mt-0.5">
          {brainRegion}
          <span className="mx-1.5 text-black/20">·</span>
          <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: "10px" }}>
            {primerSet}
          </span>
        </p>
      </div>

      {/* Top score bar */}
      <div className="h-1.5 bg-black/8 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${topScore}%`, background: color }}
        />
      </div>

      {/* Markers */}
      <div className="flex flex-col gap-2">
        {markers.map((m) => (
          <div key={m.name} className="flex items-center justify-between gap-2">
            <span className="text-xs text-black/60 truncate">{m.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-12 h-1 bg-black/8 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${m.value}%`, background: scoreColor(m.value) }}
                />
              </div>
              <span
                className="text-xs tabular-nums text-black/55 w-10 text-right"
                style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
              >
                {m.value}{m.unit ? <>&thinsp;{m.unit}</> : ""}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1" />

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-black/6">
        <span
          className="text-[10px] uppercase tracking-widest"
          style={{ color: "rgba(0,0,0,0.3)", fontFamily: "var(--font-jetbrains-mono), monospace" }}
        >
          {isActive ? "Processing" : "Standby"}
        </span>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${isActive ? "bg-amber-400 animate-pulse" : "bg-black/12"}`} />
          <div className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-black/8"}`} />
        </div>
      </div>
    </div>
  );
}
