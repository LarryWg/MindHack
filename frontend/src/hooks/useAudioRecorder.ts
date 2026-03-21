"use client";

import { useState, useRef, useCallback } from "react";

export type TranscriptResult = {
  transcript: string;
  pauseMap?: number[];
  wordTimestamps?: Array<{ word: string }>;
};

export function useAudioRecorder(
  onTranscriptReady: (result: TranscriptResult) => void,
) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meterRafRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const onTranscriptRef = useRef(onTranscriptReady);
  onTranscriptRef.current = onTranscriptReady;

  const stopCleanup = useCallback(() => {
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
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    stopCleanup();
  }, [stopCleanup]);

  const toggle = useCallback(async () => {
    if (isRecording) {
      stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

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
          const v = data[i] / 128 - 1;
          sum += v * v;
        }
        setAudioLevel(Math.min(1, Math.sqrt(sum / data.length) * 1.5));
        meterRafRef.current = window.requestAnimationFrame(updateMeter);
      };
      meterRafRef.current = window.requestAnimationFrame(updateMeter);

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsTranscribing(true);
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.wav");

          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          if (!res.ok) {
            console.error("Transcription failed:", await res.json());
            return;
          }
          onTranscriptRef.current(await res.json());
        } catch (err) {
          console.error("Audio send error:", err);
        } finally {
          setIsTranscribing(false);
          stopCleanup();
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      timerIntervalRef.current = window.setInterval(
        () => setRecordSeconds((s) => s + 1),
        1000,
      );
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }, [isRecording, stop, stopCleanup]);

  return { isRecording, isTranscribing, recordSeconds, audioLevel, toggle, stop };
}
