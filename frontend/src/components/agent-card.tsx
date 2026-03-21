"use client";

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

function scoreColor(score: number): string {
  if (score > 75) return "#D85A30";
  if (score > 50) return "#BA7517";
  if (score > 25) return "#1D9E75";
  return "#888780";
}

export const MOCK_AGENTS: AgentCardProps[] = [
  {
    agentName: "Lexical Agent",
    primerSet: "TTR · Density · Filler",
    brainRegion: "Broca's Area",
    markers: [
      { name: "TTR", value: 68 },
      { name: "Lexical density", value: 74 },
      { name: "Filler rate", value: 42 },
    ],
    topScore: 72,
  },
  {
    agentName: "Semantic Agent",
    primerSet: "Coherence · Density · Tang",
    brainRegion: "Wernicke's Area",
    markers: [
      { name: "Coherence", value: 58 },
      { name: "Idea density", value: 61 },
      { name: "Tangentiality", value: 33 },
    ],
    topScore: 58,
  },
  {
    agentName: "Prosody Agent",
    primerSet: "Rate · Pause · Hesitation",
    brainRegion: "SMA",
    markers: [
      { name: "Speech rate", value: 44, unit: "wpm" },
      { name: "Pause freq", value: 51, unit: "/min" },
      { name: "Hesitation", value: 38 },
    ],
    topScore: 44,
  },
  {
    agentName: "Syntax Agent",
    primerSet: "MLU · Depth · Passive",
    brainRegion: "DLPFC",
    markers: [
      { name: "MLU", value: 83 },
      { name: "Clause depth", value: 79 },
      { name: "Passive voice", value: 22 },
    ],
    topScore: 83,
  },
];

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
        <div className="h-3 w-2/3 rounded bg-black/10 animate-pulse" />
        <div className="h-2 w-1/2 rounded bg-black/8 animate-pulse" />
        <div className="h-1 w-full rounded-full bg-black/8 animate-pulse mt-2" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="h-2 w-24 rounded bg-black/8 animate-pulse" />
            <div className="h-2 w-8 rounded bg-black/8 animate-pulse" />
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
        <p className="text-xs font-semibold text-black/70">{agentName}</p>
        <p className="text-[10px] text-black/40 mt-0.5">
          {brainRegion} · {primerSet}
        </p>
      </div>

      {/* Top score bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-black/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${topScore}%`, background: color }}
          />
        </div>
        <span
          className="text-[10px] font-medium tabular-nums w-5 text-right"
          style={{ color }}
        >
          {topScore}
        </span>
      </div>

      {/* Markers */}
      <div className="flex flex-col gap-1.5">
        {markers.map((m) => (
          <div key={m.name} className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-black/50 truncate">{m.name}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-10 h-0.5 bg-black/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${m.value}%`, background: scoreColor(m.value) }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-black/40 w-8 text-right">
                {m.value}{m.unit ? ` ${m.unit}` : ""}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1" />

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-black/5">
        <span className="text-[10px] text-black/30">Agent Activity</span>
        <div className="flex items-center gap-1">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isActive ? "bg-amber-400 animate-pulse" : "bg-black/15"
            }`}
          />
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isActive ? "bg-emerald-400" : "bg-black/10"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
