"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Send, Upload, ChevronDown } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

export type AnalysisInput =
  | { type: "text"; content: string }
  | { type: "transcript"; content: string; pauseMap?: number[] }
  | { type: "file"; file: File };

type AgentStep = {
  name: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
};

type AnalysisPanelProps = {
  onSubmit?: (input: AnalysisInput) => void;
  onLangFlowTest?: (input: AnalysisInput) => void;
  useLangFlowTest?: boolean;
  onToggleLangFlowTest?: () => void;
  isLoading?: boolean;
  agentSteps?: AgentStep[];
  placeholder?: string;
};

export function AnalysisPanel({
  onSubmit,
  onLangFlowTest,
  useLangFlowTest = false,
  onToggleLangFlowTest,
  isLoading = false,
  agentSteps = [],
  placeholder = "Ask about cognitive signature analysis...",
}: AnalysisPanelProps) {
  const [text, setText] = useState("");
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleTranscriptReady = useCallback(
    ({
      transcript,
      pauseMap,
      wordTimestamps,
    }: {
      transcript: string;
      pauseMap?: number[];
      wordTimestamps?: Array<{ word: string }>;
    }) => {
      const words = Array.isArray(wordTimestamps)
        ? wordTimestamps.map((w) => w.word).join(" ")
        : transcript;
      setTranscriptPreview(words || transcript);
      setText(transcript);

      const input: AnalysisInput = useLangFlowTest
        ? { type: "text", content: transcript }
        : { type: "transcript", content: transcript, pauseMap };

      if (useLangFlowTest && onLangFlowTest) {
        onLangFlowTest(input);
      } else if (!useLangFlowTest && onSubmit) {
        onSubmit(input);
      }
    },
    [onSubmit, onLangFlowTest, useLangFlowTest],
  );

  const { isRecording, isTranscribing, recordSeconds, audioLevel, toggle } =
    useAudioRecorder(handleTranscriptReady);

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    const input: AnalysisInput = { type: "text", content: text.trim() };

    if (useLangFlowTest && onLangFlowTest) {
      onLangFlowTest(input);
    } else if (!useLangFlowTest && onSubmit) {
      onSubmit(input);
    }

    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSubmit?.({ type: "file", file });
  };

  const statusDot = (status: AgentStep["status"]) => {
    if (status === "running") return "bg-amber-400 animate-pulse";
    if (status === "done") return "bg-emerald-400";
    if (status === "error") return "bg-red-400";
    return "bg-black/15";
  };

  return (
    <div className="w-full max-w-[42rem] mx-auto flex flex-col gap-3">
      {/* Agent steps */}
      {agentSteps.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(12px)" }}
        >
          <div className="px-4 py-3 flex flex-col gap-1.5">
            {agentSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(step.status)}`} />
                <span className="text-xs text-black/50">{step.name}</span>
                {step.detail && (
                  <span className="text-xs text-black/30 ml-auto">{step.detail}</span>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-black/20 animate-pulse shrink-0" />
                <span className="text-xs text-black/30">Agents processing…</span>
              </div>
            )}
          </div>
        </div>
      )}

      {transcriptPreview && (
        <div className="rounded-2xl px-3 py-2 bg-black/5 text-sm text-black/70">
          <div className="text-xs text-black/40 mb-1">Transcription</div>
          <div className="break-words">{transcriptPreview}</div>
        </div>
      )}

      {/* Input */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(16px)" }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={2}
          disabled={isLoading}
          className="w-full px-4 pt-3 pb-1 text-sm text-black/70 placeholder:text-black/30 bg-transparent resize-none outline-none"
        />
        <div className="flex items-center gap-2 px-3 pb-3 pt-1">
          {/* Model badge */}
          <div className="flex items-center gap-1 text-xs text-black/35 rounded-lg px-2 py-1 bg-black/[0.03]">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-400/80" />
            <span>Claude</span>
            <ChevronDown size={10} className="opacity-50" />
          </div>

          {/* LangFlow Test Toggle */}
          {onToggleLangFlowTest && (
            <button
              onClick={onToggleLangFlowTest}
              className={`flex items-center gap-1 text-xs rounded-lg px-2 py-1 transition-colors ${
                useLangFlowTest
                  ? "bg-blue-100 text-blue-700"
                  : "text-black/35 bg-black/[0.03] hover:bg-black/[0.05]"
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${useLangFlowTest ? "bg-blue-500" : "bg-gray-400"}`} />
              <span>LangFlow Test</span>
            </button>
          )}

          {/* Mic */}
          <button
            onClick={toggle}
            disabled={isTranscribing}
            title={isRecording ? "Stop" : isTranscribing ? "Transcribing…" : "Record"}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              isTranscribing
                ? "bg-blue-100 text-blue-500"
                : isRecording
                  ? "bg-red-100 text-red-500"
                  : "text-black/30 hover:text-black/60 hover:bg-black/5"
            }`}
          >
            {isTranscribing ? (
              <div className="w-3 h-3 rounded-full border border-blue-500/50 border-t-blue-500 animate-spin" />
            ) : isRecording ? (
              <MicOff size={13} />
            ) : (
              <Mic size={13} />
            )}
          </button>

          {/* Recording status */}
          {(isRecording || isTranscribing) && (
            <div className="flex items-center gap-2 text-xs text-black/50">
              <span className="font-medium">{isRecording ? "Recording" : "Transcribing…"}</span>
              <span>{`00:${recordSeconds.toString().padStart(2, "0")}`}</span>
              <div className="w-14 h-1.5 bg-black/10 rounded overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all"
                  style={{ width: `${Math.round(audioLevel * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* File upload */}
          <button
            onClick={() => fileRef.current?.click()}
            title="Upload file"
            className="w-7 h-7 rounded-full flex items-center justify-center text-black/30 hover:text-black/60 hover:bg-black/5 transition-colors"
          >
            <Upload size={13} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.pdf,.wav,.mp3,.m4a"
            className="hidden"
            onChange={handleFile}
          />

          <div className="flex-1" />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!text.trim() || isLoading}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-black/80 text-white disabled:opacity-30 hover:bg-black transition-colors"
          >
            {isLoading ? (
              <div className="w-3 h-3 rounded-full border border-white/50 border-t-white animate-spin" />
            ) : (
              <Send size={12} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
