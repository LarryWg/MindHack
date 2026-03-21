"use client";

type WaveformDisplayProps = {
  amplitude?: number[];
  isRecording?: boolean;
};

// 60 bars with pre-computed static heights
const STATIC_HEIGHTS = Array.from({ length: 60 }, (_, i) =>
  0.08 + 0.14 * Math.abs(Math.sin(i * 0.4))
);

export function WaveformDisplay({ amplitude, isRecording }: WaveformDisplayProps) {
  const heights = amplitude?.length === 60 ? amplitude : STATIC_HEIGHTS;

  return (
    <div className="h-12 w-full flex items-center gap-0.5">
      {heights.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-full"
          style={{
            height: `${Math.round(h * 100)}%`,
            maxWidth: "3px",
            background: isRecording
              ? `rgba(0,0,0,${0.25 + h * 0.45})`
              : "rgba(0,0,0,0.15)",
            animation: isRecording
              ? `waveform-bar ${0.5 + (i % 7) * 0.1}s ease-in-out ${(i * 0.02).toFixed(2)}s infinite`
              : undefined,
          }}
        />
      ))}
    </div>
  );
}
