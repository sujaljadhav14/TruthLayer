"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  BarChart3,
  Loader2,
  AlertTriangle,
  Eye,
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
  if (score < 0.3) return "#22c55e";
  if (score < 0.5) return "#eab308";
  if (score < 0.7) return "#f97316";
  return "#ef4444";
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

  // Loading state
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111] border border-orange-500/20 rounded-3xl p-8"
      >
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-2 border-orange-500/30 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
            </div>
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-orange-500 rounded-full animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold">Running Grad-CAM Analysis</p>
            <p className="text-gray-400 text-sm mt-1">
              Generating per-frame heatmaps and suspicion timeline...
            </p>
          </div>
          <div className="w-full max-w-xs mt-2">
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-orange-600 to-amber-400 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 8, ease: "easeInOut" }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111] border border-red-500/20 rounded-3xl p-6"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-400 font-bold text-sm">Heatmap Analysis Failed</p>
            <p className="text-red-400/70 text-xs mt-1">{error}</p>
          </div>
        </div>
        {file && (
          <button
            onClick={() => analyzeFile(file)}
            className="mt-4 w-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold py-2.5 rounded-xl hover:bg-orange-500/20 transition-all text-sm"
          >
            Retry Heatmap
          </button>
        )}
      </motion.div>
    );
  }

  if (!result) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="bg-[#111] border border-white/10 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20">
              <Eye className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">Frame-Level Deep Analysis</h3>
              <p className="text-sm text-gray-400">
                Grad-CAM spatial analysis - see where and when deepfakes occur
              </p>
            </div>
          </div>

          {!compact && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                dragActive ? "border-orange-500 bg-orange-500/5" : "border-white/10 bg-black/20 hover:border-white/20"
              }`}
            >
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className={`w-8 h-8 mx-auto mb-3 ${dragActive ? "text-orange-400" : "text-gray-500"}`} />
              <p className="text-white font-medium">Drop video for frame-level analysis</p>
              <p className="text-gray-500 text-sm mt-1">MP4, AVI, MOV - generates Grad-CAM heatmap per frame</p>
            </div>
          )}

          {file && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
              <div className="bg-black/20 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                <FileVideo className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <span className="text-white text-sm flex-1 truncate">{file.name}</span>
                {!compact && (
                  <button
                    onClick={() => setFile(null)}
                    className="w-6 h-6 rounded border border-white/10 flex items-center justify-center text-gray-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                onClick={analyze}
                disabled={loading}
                className="w-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold py-3 rounded-xl hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <BarChart3 className="w-4 h-4" /> Generate Heatmap
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="bg-[#111] border border-white/10 rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20">
            <Eye className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">Frame-Level Deep Analysis</h3>
            <p className="text-sm text-gray-400">
              Grad-CAM spatial analysis - see where and when deepfakes occur
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{result.suspicious_frame_count}/{result.total_frames_analyzed} suspicious</p>
            <p className="text-xs text-gray-600">{formatMs(result.duration_ms)} duration</p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <div
            className={`rounded-2xl border p-5 flex items-center gap-4 ${
              result.verdict === "FAKE" ? "bg-red-500/5 border-red-500/20" : "bg-green-500/5 border-green-500/20"
            }`}
          >
            <div className="flex-1">
              <h4 className="text-xl font-bold text-white">
                {result.verdict === "FAKE" ? "Manipulation Detected" : "Authentic"}
              </h4>
              <p className="text-gray-400 text-sm mt-1">
                {result.suspicious_frame_count} / {result.total_frames_analyzed} suspicious frames
                {" | "}
                {formatMs(result.duration_ms)} duration
              </p>
            </div>
            <div
              className={`text-2xl font-black px-4 py-2 rounded-xl border ${
                result.verdict === "FAKE"
                  ? "bg-red-500/10 text-red-500 border-red-500/30"
                  : "bg-green-500/10 text-green-500 border-green-500/30"
              }`}
            >
              {result.confidence.toFixed(1)}%
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Frame-Level Fake Probability Timeline
            </p>
            <div className="flex h-10 rounded-xl overflow-hidden gap-px bg-black/30 p-1 cursor-pointer">
              {result.timeline.map((entry, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedFrame(i)}
                  title={`${formatMs(entry.timestamp_ms)} - ${(entry.fake_score * 100).toFixed(0)}% fake`}
                  className={`flex-1 rounded transition-opacity ${
                    selectedFrame === i ? "opacity-100 ring-2 ring-white/40" : "opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: getColor(entry.fake_score) }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1.5 px-0.5">
              <span>0:00</span>
              <span>{formatMs(result.duration_ms)}</span>
            </div>
          </div>

          {result.frames.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Grad-CAM Overlay - Frame {selectedFrame + 1}
                <span className="text-gray-600 ml-2">
                  ({formatMs(result.timeline[selectedFrame]?.timestamp_ms ?? 0)} |{" "}
                  {((result.timeline[selectedFrame]?.fake_score ?? 0) * 100).toFixed(1)}% fake)
                </span>
              </p>
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/jpeg;base64,${result.frames[selectedFrame]}`}
                  alt={`Frame ${selectedFrame + 1} Grad-CAM`}
                  className="w-full max-h-80 object-contain"
                />
                <div
                  className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold border ${
                    result.timeline[selectedFrame]?.is_suspicious
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : "bg-green-500/20 text-green-400 border-green-500/30"
                  }`}
                >
                  {result.timeline[selectedFrame]?.is_suspicious ? "Suspicious" : "Clean"}
                </div>
              </div>

              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {result.timeline.map((entry, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedFrame(i)}
                    className={`flex-shrink-0 w-10 h-10 rounded-lg text-[10px] font-bold border transition-all ${
                      selectedFrame === i
                        ? "ring-2 ring-white/50 border-transparent"
                        : "border-white/10 hover:border-white/20"
                    }`}
                    style={{
                      backgroundColor: `${getColor(entry.fake_score)}33`,
                      borderColor: selectedFrame === i ? getColor(entry.fake_score) : undefined,
                      color: getColor(entry.fake_score),
                    }}
                    title={`Frame ${i + 1}: ${(entry.fake_score * 100).toFixed(0)}%`}
                  >
                    {i + 1}
                  </button>
                ))}
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
              className="w-full bg-white/5 border border-white/10 text-gray-400 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm"
            >
              Analyze Another Video
            </button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
