import { AgentCard, AgentCardProps } from "@/components/agent-card";

const agents: Omit<AgentCardProps, "animationDelay">[] = [
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

export function AgentPanel() {
  return (
    <aside
      className="flex flex-col h-full w-80 shrink-0 overflow-y-auto"
      style={{ borderLeft: "1px solid var(--border)" }}
    >
      {/* Panel header */}
      <div
        className="px-4 py-3.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-xs font-semibold uppercase tracking-widest"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--font-syne)",
              letterSpacing: "0.1em",
            }}
          >
            Agent Pipeline
          </h2>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: "var(--accent-cyan-dim)",
              color: "var(--accent-cyan)",
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: "0.6rem",
              border: "1px solid rgba(0, 229, 255, 0.15)",
            }}
          >
            4 agents
          </span>
        </div>
        <p
          className="mt-0.5 text-xs"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-dm-sans)", fontSize: "0.68rem" }}
        >
          Langflow · Fan-out pattern
        </p>
      </div>

      {/* Agent cards */}
      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
        {agents.map((agent, i) => (
          <AgentCard
            key={agent.name}
            {...agent}
            animationDelay={`${i * 0.08}s`}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-xs"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.6rem" }}
          >
            Biomarker Mapper
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.6rem" }}
          >
            + Report Composer
          </span>
        </div>
      </div>
    </aside>
  );
}
