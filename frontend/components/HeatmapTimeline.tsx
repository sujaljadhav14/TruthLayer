"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Loader2,
  AlertTriangle,
  Upload,
  FileVideo,
  X,
} from "lucide-react";

type TimelineEntry = {
  frame_index: number;
  timestamp_ms: number;
  fake_score: number;
  is_suspicious: boolean;
};

export type HeatmapResult = {
  verdict: string;
  confidence: number;
  truth_score: number;
  filename: string;
  duration_ms: number;
  total_frames_analyzed: number;
  per_frame_scores: number[];
  timeline: TimelineEntry[];
  frames: string[];
  suspicious_frame_count: number;
};

type Props = {
  initialFile?: File | null;
  autoAnalyze?: boolean;
  compact?: boolean;
  onResult?: (result: HeatmapResult | null) => void;
};

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `0:${sec.toString().padStart(2, "0")}`;
}

function getColor(score: number): string {
  if (score < 0.3) return "#2bd46b";
  if (score < 0.5) return "#ffb020";
  if (score < 0.7) return "#ff8a3d";
  return "#ff4b3e";
}

export default function HeatmapTimeline({ initialFile = null, autoAnalyze = false, compact = false, onResult }: Props) {
  const [file, setFile] = useState<File | null>(initialFile);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HeatmapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState(0);

  const analyzeFile = useCallback(async (selected: File) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", selected);
      const res = await fetch("/api/heatmap", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Heatmap analysis failed");
      }
      const data: HeatmapResult = await res.json();
      setResult(data);
      onResult?.(data);
      setSelectedFrame(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [onResult]);

  useEffect(() => {
    setFile(initialFile);
    setResult(null);
    setError(null);
    setSelectedFrame(0);
    onResult?.(null);
  }, [initialFile, onResult]);

  useEffect(() => {
    if (!autoAnalyze || !initialFile) return;
    void analyzeFile(initialFile);
  }, [autoAnalyze, initialFile, analyzeFile]);

  const analyze = async () => {
    if (!file) return;
    await analyzeFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped?.type.startsWith("video/")) {
      setFile(dropped);
      setResult(null);
      setError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setError(null);
    }
  };

  const Header = ({ right }: { right?: React.ReactNode }) => (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <p className="eyebrow text-signal">Frame evidence</p>
        <h3 className="mt-2 font-display text-2xl font-extrabold text-paper">Where in the video</h3>
        <p className="mt-1 text-sm text-paper/60">Grad-CAM heatmaps show which parts of each frame drove the model&apos;s call.</p>
      </div>
      {right}
    </div>
  );

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-ink-2 p-5 sm:p-7">
        <Header />
        <p className="flex items-center gap-3 text-sm text-paper/70">
          <Loader2 className="h-5 w-5 animate-spin text-signal" />
          Building a heatmap for each frame. This takes a little longer than the verdict.
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-alert/30 bg-ink-2 p-5 sm:p-7" role="alert">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-alert" />
          <div>
            <p className="font-semibold text-paper">Heatmap analysis failed</p>
            <p className="mt-1 text-sm text-paper/60">{error}</p>
          </div>
        </div>
        {file && (
          <button onClick={() => analyzeFile(file)} className="btn-chunky mt-5 bg-paper text-ink !py-2 text-sm">
            Try again
          </button>
        )}
      </section>
    );
  }

  if (!result) {
    return (
      <section className="rounded-2xl border border-white/10 bg-ink-2 p-5 sm:p-7">
        <Header />

        {!compact && (
          <label
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`block cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragActive ? "border-signal bg-signal/5" : "border-white/15 hover:border-white/30"
            }`}
          >
            <input type="file" accept="video/*" onChange={handleFileSelect} className="sr-only" />
            <Upload className={`mx-auto mb-3 h-8 w-8 ${dragActive ? "text-signal" : "text-paper/40"}`} />
            <span className="block font-semibold text-paper">Drop a video for frame-level analysis</span>
            <span className="mt-1 block text-sm text-paper/50">MP4, AVI, MOV</span>
          </label>
        )}

        {file && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink p-4">
              <FileVideo className="h-5 w-5 flex-none text-signal" />
              <span className="flex-1 truncate text-sm text-paper">{file.name}</span>
              {!compact && (
                <button onClick={() => setFile(null)} aria-label="Remove file" className="rounded p-1 text-paper/50 hover:text-paper">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button onClick={analyze} disabled={loading} className="btn-chunky w-full justify-center bg-signal text-ink disabled:opacity-50">
              <BarChart3 className="h-4 w-4" /> Generate heatmap
            </button>
          </div>
        )}
      </section>
    );
  }

  const current = result.timeline[selectedFrame];

  return (
    <section className="rounded-2xl border border-white/10 bg-ink-2 p-5 sm:p-7">
      <Header
        right={
          <div className="text-right">
            <p className="display text-3xl text-paper tabular-nums">
              {result.suspicious_frame_count}/{result.total_frames_analyzed}
            </p>
            <p className="eyebrow mt-1 text-paper/45">frames flagged</p>
          </div>
        }
      />

      {/* Standalone use shows the heatmap's own verdict; on the analyze page the main summary card already does. */}
      {!compact && (
        <div
          className={`mb-5 flex items-center justify-between gap-4 rounded-xl border p-4 ${
            result.verdict === "FAKE" ? "border-alert/30 bg-alert/10" : "border-signal/30 bg-signal/10"
          }`}
        >
          <p className="font-display text-lg font-extrabold text-paper">
            {result.verdict === "FAKE" ? "Manipulation detected" : "No manipulation detected"}
          </p>
          <span className={`font-mono font-semibold ${result.verdict === "FAKE" ? "text-alert" : "text-signal"}`}>
            {result.confidence.toFixed(1)}%
          </span>
        </div>
      )}

      <p className="eyebrow mb-2 text-paper/50">Chance each frame is manipulated · click a frame</p>
      <div className="flex h-10 gap-px overflow-hidden rounded-lg border border-white/10 bg-ink p-1">
        {result.timeline.map((entry, i) => (
          <button
            key={i}
            onClick={() => setSelectedFrame(i)}
            aria-label={`Frame ${i + 1}: ${(entry.fake_score * 100).toFixed(0)}% fake`}
            title={`${formatMs(entry.timestamp_ms)} · ${(entry.fake_score * 100).toFixed(0)}% fake`}
            className={`flex-1 rounded-sm transition-opacity ${selectedFrame === i ? "opacity-100 ring-2 ring-paper" : "opacity-75 hover:opacity-100"}`}
            style={{ backgroundColor: getColor(entry.fake_score) }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[0.68rem] text-paper/45">
        <span>0:00</span>
        <span>{formatMs(result.duration_ms)}</span>
      </div>

      {result.frames.length > 0 && current && (
        <div className="mt-6">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="eyebrow text-paper/50">
              Frame {selectedFrame + 1} · {formatMs(current.timestamp_ms)}
            </p>
            <p className="font-mono text-xs text-paper/60">{(current.fake_score * 100).toFixed(1)}% fake</p>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/jpeg;base64,${result.frames[selectedFrame]}`}
              alt={`Frame ${selectedFrame + 1} with Grad-CAM heatmap`}
              className="max-h-80 w-full object-contain"
            />
            <span
              className={`eyebrow absolute right-3 top-3 rounded px-2 py-1 text-[0.62rem] ${
                current.is_suspicious ? "bg-alert text-ink" : "bg-signal text-ink"
              }`}
            >
              {current.is_suspicious ? "Suspicious" : "Clean"}
            </span>
          </div>
        </div>
      )}

      {!compact && (
        <button
          onClick={() => {
            setResult(null);
            setFile(null);
            onResult?.(null);
          }}
          className="mt-6 w-full rounded-xl border border-white/15 py-3 text-sm font-semibold text-paper/70 hover:bg-white/5"
        >
          Analyze another video
        </button>
      )}
    </section>
  );
}
