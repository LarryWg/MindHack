"use client";

import { useState, useRef } from "react";
import { Mic, MicOff, Send, Upload, ChevronDown } from "lucide-react";

export type AnalysisInput =
  | { type: "text"; content: string }
  | { type: "transcript"; content: string; pauseMap?: number[] }
  | { type: "file"; file: File };

type AnalysisAgentStep = {
  name: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
};

type AnalysisPanelProps = {
  onSubmit?: (input: AnalysisInput) => void;
  isLoading?: boolean;
  agentSteps?: AnalysisAgentStep[];
  placeholder?: string;
};

export function AnalysisPanel({
  onSubmit,
  isLoading = false,
  agentSteps = [],
  placeholder = "Ask about cognitive signature analysis...",
}: AnalysisPanelProps) {
  const [text, setText] = useState("");
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meterRafRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSubmit?.({ type: "text", content: text.trim() });
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

const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (meterRafRef.current) {
      window.cancelAnimationFrame(meterRafRef.current);
      meterRafRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setRecordSeconds(0);
    setAudioLevel(0);
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        // Setup metering
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const updateMeter = () => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const value = data[i] / 128 - 1;
            sum += value * value;
          }
          const rms = Math.sqrt(sum / data.length);
          setAudioLevel(Math.min(1, rms * 1.5));
          meterRafRef.current = window.requestAnimationFrame(updateMeter);
        };
        meterRafRef.current = window.requestAnimationFrame(updateMeter);

        mediaRecorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          setIsTranscribing(true);

          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
            const formData = new FormData();
            formData.append("audio", audioBlob, "recording.wav");

            const res = await fetch("/api/transcribe", {
              method: "POST",
              body: formData,
            });

            if (!res.ok) {
              const error = await res.json();
              console.error("Transcription failed:", error);
              setIsTranscribing(false);
              return;
            }

            const { transcript, pauseMap, wordTimestamps } = await res.json();
            const words = Array.isArray(wordTimestamps)
              ? wordTimestamps.map((w: {word: string}) => w.word).join(" ")
              : transcript;
            setTranscriptPreview(words || transcript);
            setText(transcript);
            onSubmit?.({ type: "transcript", content: transcript, pauseMap });
            setIsTranscribing(false);
          } catch (error) {
            console.error("Error sending audio:", error);
            setIsTranscribing(false);
          } finally {
            stopRecording();
          }
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);

        timerIntervalRef.current = window.setInterval(() => {
          setRecordSeconds((prev) => prev + 1);
        }, 1000);
      } catch (error) {
        console.error("Microphone access denied:", error);
      }
    } else {
      stopRecording();
    }
  };

  const statusDot = (status: AnalysisAgentStep["status"]) => {
    if (status === "running") return "bg-amber-400 animate-pulse";
    if (status === "done") return "bg-emerald-400";
    if (status === "error") return "bg-red-400";
    return "bg-black/15";
  };

  return (
    <div className="w-full max-w-[42rem] flex flex-col gap-3">
      {/* Agent steps — shown while loading */}
      {agentSteps.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(12px)" }}>
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
                <span className="text-xs text-black/30">Agent is working...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {transcriptPreview ? (
        <div className="rounded-2xl px-3 py-2 bg-black/5 text-sm text-black/70">
          <div className="text-xs text-black/40 mb-1">Live transcription preview</div>
          <div className="break-words">{transcriptPreview}</div>
        </div>
      ) : null}

      {/* Input box */}
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
          {/* Model selector */}
          <button className="flex items-center gap-1 text-xs text-black/40 hover:text-black/60 transition-colors rounded-lg px-2 py-1 hover:bg-black/5">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            GPT-4.1
            <ChevronDown size={11} />
          </button>

          {/* Mic */}
          <button
            onClick={toggleRecording}
            disabled={isTranscribing}
            title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Record voice"}
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
            <div className="flex flex-col items-start gap-1 text-xs text-black/60 ml-2">
              <div className="font-medium">{isRecording ? "Recording..." : "Transcribing..."}</div>
              <div className="flex items-center gap-2">
                <span>{`00:${recordSeconds.toString().padStart(2, "0")}`}</span>
                <div className="w-16 h-2 bg-black/10 rounded overflow-hidden">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${Math.round(audioLevel * 100)}%` }}
                  />
                </div>
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
          <input ref={fileRef} type="file" accept=".txt,.pdf,.wav,.mp3,.m4a" className="hidden" onChange={handleFile} />

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
