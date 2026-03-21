export interface AgentMetric {
  label: string;
  value: string;
}

export interface AgentCardProps {
  name: string;
  region: string;
  status: "ready" | "running" | "complete" | "error";
  metrics: AgentMetric[];
  animationDelay?: string;
  isLoading?: boolean;
}

export const MOCK_AGENTS: Omit<AgentCardProps, "animationDelay" | "isLoading">[] = [
  {
    name: "Lexical Agent",
    region: "Broca's Area · IFG [-44, 20, 8]",
    status: "ready",
    metrics: [
      { label: "TTR", value: "0.72" },
      { label: "Lexical Density", value: "0.61" },
      { label: "Filler Rate", value: "0.03" },
    ],
  },
  {
    name: "Semantic Agent",
    region: "Wernicke's · STG [-54, -40, 14]",
    status: "ready",
    metrics: [
      { label: "Coherence", value: "0.84" },
      { label: "Idea Density", value: "0.58" },
      { label: "Tangentiality", value: "0.12" },
    ],
  },
  {
    name: "Prosody Agent",
    region: "SMA [0, -4, 60]",
    status: "ready",
    metrics: [
      { label: "WPM", value: "142" },
      { label: "Pause Freq", value: "3.2/min" },
      { label: "Hesitation", value: "0.08" },
    ],
  },
  {
    name: "Syntax Agent",
    region: "DLPFC [-46, 20, 32]",
    status: "ready",
    metrics: [
      { label: "MLU", value: "8.4" },
      { label: "Clause Depth", value: "2.1" },
      { label: "Passive Ratio", value: "0.14" },
    ],
  },
];

const statusConfig = {
  ready: { color: "var(--accent-cyan)", label: "Ready", pulse: "animate-pulse-dot" },
  running: { color: "var(--accent-amber)", label: "Running", pulse: "animate-pulse-amber" },
  complete: { color: "#4ade80", label: "Complete", pulse: "" },
  error: { color: "var(--accent-coral)", label: "Error", pulse: "" },
} as const;

const AgentIcon = ({ name }: { name: string }) => {
  const firstLetter = name.charAt(0);
  return (
    <div
      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-xs font-bold"
      style={{
        background: "var(--accent-cyan-dim)",
        border: "1px solid rgba(0, 229, 255, 0.15)",
        color: "var(--accent-cyan)",
        fontFamily: "var(--font-syne)",
      }}
    >
      {firstLetter}
    </div>
  );
};

export function AgentCard({
  name,
  region,
  status,
  metrics,
  animationDelay = "0s",
  isLoading = false,
}: AgentCardProps) {
  const cfg = statusConfig[status];

  return (
    <div
      className="rounded-xl p-3.5 animate-fade-up"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        animationDelay,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <AgentIcon name={name} />
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-semibold truncate"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-syne)", fontWeight: 600 }}
          >
            {name}
          </p>
          <p
            className="text-xs truncate"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.6rem" }}
          >
            {region}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={`w-1.5 h-1.5 rounded-full ${isLoading ? "animate-pulse-amber" : cfg.pulse}`}
            style={{ background: isLoading ? "var(--accent-amber)" : cfg.color }}
          />
          <span
            className="text-xs"
            style={{ color: isLoading ? "var(--accent-amber)" : cfg.color, fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.6rem" }}
          >
            {isLoading ? "Running" : cfg.label}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--border)", marginBottom: "0.625rem" }} />

      {/* Metrics */}
      <div className="space-y-1.5">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center justify-between">
            <span
              className="text-xs"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-sans)", fontSize: "0.7rem" }}
            >
              {m.label}
            </span>
            <span
              className="text-xs font-medium tabular-nums"
              style={{
                color: "var(--text-secondary)",
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: "0.68rem",
              }}
            >
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
