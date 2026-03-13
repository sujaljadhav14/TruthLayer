"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  FileVideo,
  X,
  Upload,
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
  // Green → Yellow → Red gradient
  if (score < 0.3) return "#22c55e"; // green
  if (score < 0.5) return "#eab308"; // yellow
  if (score < 0.7) return "#f97316"; // orange
  return "#ef4444"; // red
}

export default function HeatmapTimeline() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HeatmapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<number>(0);
  const [showAllFrames, setShowAllFrames] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f?.type.startsWith("video/")) { setFile(f); setResult(null); setError(null); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setError(null); }
  };

  const analyze = async () => {
    if (!file) return;
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

  return (
    <div className="space-y-6">
      <div className="bg-[#111] border border-white/10 rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20">
            <BarChart3 className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Frame Heatmap Timeline</h3>
            <p className="text-sm text-gray-400">
              Grad-CAM spatial analysis — see exactly WHERE and WHEN deepfakes occur
            </p>
          </div>
        </div>

        {!result ? (
          <>
            {/* Drop zone */}
            <div
              onDragEnter={handleDrag} onDragLeave={handleDrag}
              onDragOver={handleDrag} onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                dragActive ? "border-orange-500 bg-orange-500/5" : "border-white/10 bg-black/20 hover:border-white/20"
              }`}
            >
              <input
                type="file" accept="video/*" onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className={`w-8 h-8 mx-auto mb-3 ${dragActive ? "text-orange-400" : "text-gray-500"}`} />
              <p className="text-white font-medium">Drop video for frame-level analysis</p>
              <p className="text-gray-500 text-sm mt-1">MP4, AVI, MOV — generates Grad-CAM heatmap per frame</p>
            </div>

            {file && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
                <div className="bg-black/20 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                  <FileVideo className="w-5 h-5 text-orange-400 flex-shrink-0" />
                  <span className="text-white text-sm flex-1 truncate">{file.name}</span>
                  <button onClick={() => setFile(null)} className="w-6 h-6 rounded border border-white/10 flex items-center justify-center text-gray-400 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={analyze} disabled={loading}
                  className="w-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold py-3 rounded-xl hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Running Grad-CAM Analysis...</>
                    : <><BarChart3 className="w-4 h-4" /> Generate Heatmap</>
                  }
                </button>
              </motion.div>
            )}

            {error && (
              <div className="mt-4 bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {/* Summary */}
            <div className={`rounded-2xl border p-5 flex items-center gap-4 ${
              result.verdict === "FAKE" ? "bg-red-500/5 border-red-500/20" : "bg-green-500/5 border-green-500/20"
            }`}>
              <div className="flex-1">
                <h4 className="text-xl font-bold text-white">
                  {result.verdict === "FAKE" ? "⚠️ Manipulation Detected" : "✅ Authentic"}
                </h4>
                <p className="text-gray-400 text-sm mt-1">
                  {result.suspicious_frame_count} / {result.total_frames_analyzed} suspicious frames
                  · {formatMs(result.duration_ms)} duration
                </p>
              </div>
              <div className={`text-2xl font-black px-4 py-2 rounded-xl border ${
                result.verdict === "FAKE"
                  ? "bg-red-500/10 text-red-500 border-red-500/30"
                  : "bg-green-500/10 text-green-500 border-green-500/30"
              }`}>
                {result.confidence.toFixed(1)}%
              </div>
            </div>

            {/* ── Timeline bar ── */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Frame-Level Fake Probability Timeline
              </p>
              <div className="flex h-10 rounded-xl overflow-hidden gap-px bg-black/30 p-1 cursor-pointer">
                {result.timeline.map((entry, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedFrame(i)}
                    title={`${formatMs(entry.timestamp_ms)} — ${(entry.fake_score * 100).toFixed(0)}% fake`}
                    className={`flex-1 rounded transition-opacity ${
                      selectedFrame === i ? "opacity-100 ring-2 ring-white/40" : "opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: getColor(entry.fake_score) }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-1.5 px-0.5">
                <span>0:00</span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#22c55e" }} />Clean (&lt;30%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#eab308" }} />Low (&lt;50%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#f97316" }} />Suspicious (&lt;70%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#ef4444" }} />Deepfake
                  </span>
                </span>
                <span>{formatMs(result.duration_ms)}</span>
              </div>
            </div>

            {/* ── Selected frame viewer ── */}
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
                  {/* Heatmap image */}
                  <img
                    src={`data:image/jpeg;base64,${result.frames[selectedFrame]}`}
                    alt={`Frame ${selectedFrame + 1} Grad-CAM`}
                    className="w-full max-h-80 object-contain"
                  />
                  {/* Suspicion badge */}
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold border ${
                    result.timeline[selectedFrame]?.is_suspicious
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : "bg-green-500/20 text-green-400 border-green-500/30"
                  }`}>
                    {result.timeline[selectedFrame]?.is_suspicious ? "⚠ Suspicious" : "✓ Clean"}
                  </div>
                </div>

                {/* Frame nav buttons */}
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

            <button
              onClick={() => { setResult(null); setFile(null); }}
              className="w-full bg-white/5 border border-white/10 text-gray-400 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm"
            >
              Analyze Another Video
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
