"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  Loader2,
  AlertTriangle,
  Eye,
} from "lucide-react";

type TimelineEntry = {
  frame_index: number;
  timestamp_ms: number;
  fake_score: number;
  is_suspicious: boolean;
};

type HeatmapResult = {
  verdict: string;
  confidence: number;
  truth_score: number;
  filename: string;
  duration_ms: number;
  total_frames_analyzed: number;
  per_frame_scores: number[];
  timeline: TimelineEntry[];
  frames: string[]; // base64 JPEG
  suspicious_frame_count: number;
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

export default function HeatmapTimeline({ videoFile }: { videoFile?: File | null }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HeatmapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<number>(0);
  const hasTriggered = useRef(false);

  // Auto-trigger when videoFile is provided
  useEffect(() => {
    if (videoFile && !hasTriggered.current) {
      hasTriggered.current = true;
      analyze(videoFile);
    }
  }, [videoFile]);

  const analyze = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/heatmap", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Heatmap analysis failed");
      }
      const data: HeatmapResult = await res.json();
      setResult(data);
      setSelectedFrame(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
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
        {videoFile && (
          <button
            onClick={() => { hasTriggered.current = false; analyze(videoFile); }}
            className="mt-4 w-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold py-2.5 rounded-xl hover:bg-orange-500/20 transition-all text-sm"
          >
            Retry Heatmap
          </button>
        )}
      </motion.div>
    );
  }

  if (!result) return null;

  // SVG chart dimensions
  const chartW = 600;
  const chartH = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 30 };
  const innerW = chartW - padding.left - padding.right;
  const innerH = chartH - padding.top - padding.bottom;
  const scores = result.per_frame_scores;
  const barWidth = scores.length > 0 ? innerW / scores.length : 0;

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
              Grad-CAM heatmap + per-frame suspicion scores
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{result.suspicious_frame_count}/{result.total_frames_analyzed} suspicious</p>
            <p className="text-xs text-gray-600">{formatMs(result.duration_ms)} duration</p>
          </div>
        </div>

        {/* ── Per-Frame Fake Score Chart (SVG) ── */}
        <div className="mb-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Per-Frame Suspicion Score
          </p>
          <div className="bg-black/30 rounded-xl p-3 border border-white/5">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
              {/* Y-axis labels */}
              <text x={padding.left - 4} y={padding.top + 4} textAnchor="end" className="fill-gray-500" fontSize="8">100%</text>
              <text x={padding.left - 4} y={padding.top + innerH / 2 + 3} textAnchor="end" className="fill-gray-500" fontSize="8">50%</text>
              <text x={padding.left - 4} y={padding.top + innerH + 3} textAnchor="end" className="fill-gray-500" fontSize="8">0%</text>

              {/* Grid lines */}
              <line x1={padding.left} y1={padding.top + innerH / 2} x2={padding.left + innerW} y2={padding.top + innerH / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1={padding.left} y1={padding.top} x2={padding.left + innerW} y2={padding.top} stroke="rgba(255,255,255,0.03)" />

              {/* Threshold line at 50% */}
              <line x1={padding.left} y1={padding.top + innerH * 0.5} x2={padding.left + innerW} y2={padding.top + innerH * 0.5} stroke="rgba(239,68,68,0.3)" strokeDasharray="3 3" />

              {/* Bars */}
              {scores.map((score, i) => {
                const x = padding.left + i * barWidth + barWidth * 0.15;
                const w = barWidth * 0.7;
                const h = Math.max(1, score * innerH);
                const y = padding.top + innerH - h;
                return (
                  <g key={i}>
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx={1.5}
                      fill={getColor(score)}
                      opacity={selectedFrame === i ? 1 : 0.7}
                      className="cursor-pointer transition-opacity"
                      onClick={() => setSelectedFrame(i)}
                    />
                    {selectedFrame === i && (
                      <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2} rx={2} fill="none" stroke="white" strokeWidth="1.5" opacity="0.6" />
                    )}
                  </g>
                );
              })}

              {/* X-axis labels */}
              {scores.length <= 20 && scores.map((_, i) => (
                <text
                  key={i}
                  x={padding.left + i * barWidth + barWidth / 2}
                  y={chartH - 2}
                  textAnchor="middle"
                  fontSize="7"
                  className="fill-gray-600"
                >
                  {i + 1}
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* ── Timeline bar ── */}
        <div className="mb-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Timeline
          </p>
          <div className="flex h-8 rounded-xl overflow-hidden gap-px bg-black/30 p-0.5 cursor-pointer">
            {result.timeline.map((entry, i) => (
              <div
                key={i}
                onClick={() => setSelectedFrame(i)}
                title={`${formatMs(entry.timestamp_ms)} — ${(entry.fake_score * 100).toFixed(0)}% fake`}
                className={`flex-1 rounded-sm transition-all ${
                  selectedFrame === i ? "opacity-100 ring-2 ring-white/50 scale-y-110" : "opacity-75 hover:opacity-100"
                }`}
                style={{ backgroundColor: getColor(entry.fake_score) }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1.5 px-0.5">
            <span>0:00</span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#22c55e" }} />Clean
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#eab308" }} />Low
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#f97316" }} />Suspicious
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#ef4444" }} />Deepfake
              </span>
            </span>
            <span>{formatMs(result.duration_ms)}</span>
          </div>
        </div>

        {/* ── Selected frame Grad-CAM viewer ── */}
        {result.frames.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Grad-CAM Overlay — Frame {selectedFrame + 1}
              <span className="text-gray-600 ml-2">
                ({formatMs(result.timeline[selectedFrame]?.timestamp_ms ?? 0)} · {(
                  (result.timeline[selectedFrame]?.fake_score ?? 0) * 100
                ).toFixed(1)}% fake)
              </span>
            </p>
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-black relative">
              <img
                src={`data:image/jpeg;base64,${result.frames[selectedFrame]}`}
                alt={`Frame ${selectedFrame + 1} Grad-CAM`}
                className="w-full max-h-80 object-contain"
              />
              <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold border ${
                result.timeline[selectedFrame]?.is_suspicious
                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                  : "bg-green-500/20 text-green-400 border-green-500/30"
              }`}>
                {result.timeline[selectedFrame]?.is_suspicious ? "Suspicious" : "Clean"}
              </div>
            </div>

            {/* Frame nav buttons */}
            <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
              {result.timeline.map((entry, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedFrame(i)}
                  className={`flex-shrink-0 w-9 h-9 rounded-lg text-[10px] font-bold border transition-all ${
                    selectedFrame === i
                      ? "ring-2 ring-white/50 border-transparent"
                      : "border-white/10 hover:border-white/20"
                  }`}
                  style={{
                    backgroundColor: getColor(entry.fake_score) + "33",
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
      </div>
    </motion.div>
  );
}
