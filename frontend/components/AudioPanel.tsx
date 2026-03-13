"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
  FileVideo,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

type ForensicFeatures = {
  pitch_anomaly: number;
  spectral_flux_anomaly: number;
  overall_anomaly_score: number;
  mfcc_variance_anomaly: number;
  spectral_centroid_mean: number;
  zcr_mean: number;
  rms_mean: number;
};

type ChunkResult = {
  start_ms: number;
  end_ms: number;
  label: string;
  confidence: number;
  method: string;
  forensic_features: ForensicFeatures;
};

type AudioResult = {
  verdict: string;
  confidence: number;
  truth_score: number;
  fake_chunks: number;
  total_chunks: number;
  fake_ratio: number;
  avg_anomaly_score: number;
  duration_ms: number;
  filename: string;
  source: string;
  forensic_features: ForensicFeatures;
  chunk_results: ChunkResult[];
};

export default function AudioPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AudioResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); setResult(null); setError(null); }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setError(null); }
  };

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/analyze-audio", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Analysis failed");
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAnalyzing(false);
    }
  };

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111] border border-white/10 rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
            <FileVideo className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Audio Deepfake Analyzer</h3>
            <p className="text-sm text-gray-400">Upload audio or video — extracts & analyzes the audio track</p>
          </div>
        </div>

        {!result ? (
          <>
            {/* Drop zone */}
            <div
              onDragEnter={handleDrag} onDragLeave={handleDrag}
              onDragOver={handleDrag} onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                dragActive
                  ? "border-blue-500 bg-blue-500/5"
                  : "border-white/10 bg-black/20 hover:border-white/20"
              }`}
            >
              <input
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className={`w-8 h-8 mx-auto mb-3 ${dragActive ? "text-blue-400" : "text-gray-500"}`} />
              <p className="text-white font-medium">Drop audio or video file here</p>
              <p className="text-gray-500 text-sm mt-1">WAV, MP3, FLAC, MP4, AVI, MOV supported</p>
            </div>

            {file && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                <div className="bg-black/20 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                  <FileVideo className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <span className="text-white text-sm flex-1 truncate">{file.name}</span>
                  <button
                    onClick={() => setFile(null)}
                    className="w-6 h-6 rounded-md border border-white/10 flex items-center justify-center text-gray-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={analyze}
                  disabled={analyzing}
                  className="w-full mt-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold py-3 rounded-xl hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {analyzing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Audio...</>
                  ) : (
                    <><BarChart3 className="w-4 h-4" /> Analyze Audio</>
                  )}
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
            {/* Verdict */}
            <div className={`rounded-2xl border p-5 ${
              result.verdict === "FAKE"
                ? "bg-red-500/5 border-red-500/20"
                : "bg-green-500/5 border-green-500/20"
            }`}>
              <div className="flex items-center gap-4">
                {result.verdict === "FAKE" ? (
                  <ShieldAlert className="w-10 h-10 text-red-500" />
                ) : (
                  <ShieldCheck className="w-10 h-10 text-green-500" />
                )}
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-white">
                    {result.verdict === "FAKE" ? "AUDIO MANIPULATION DETECTED" : "AUDIO AUTHENTIC"}
                  </h4>
                  <p className="text-gray-400 text-sm">{result.filename}</p>
                </div>
                <div className={`text-2xl font-black px-4 py-2 rounded-xl border ${
                  result.verdict === "FAKE"
                    ? "bg-red-500/10 text-red-500 border-red-500/30"
                    : "bg-green-500/10 text-green-500 border-green-500/30"
                }`}>
                  {result.confidence.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Duration", value: formatMs(result.duration_ms) },
                { label: "Fake Chunks", value: `${result.fake_chunks}/${result.total_chunks}` },
                { label: "Fake Ratio", value: `${result.fake_ratio}%` },
                { label: "Truth Score", value: `${result.truth_score}/100` },
              ].map((stat) => (
                <div key={stat.label} className="bg-black/20 border border-white/5 rounded-xl p-3 text-center">
                  <p className="text-gray-500 text-xs uppercase tracking-wider">{stat.label}</p>
                  <p className="text-white font-bold text-lg mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Forensic features */}
            <div className="bg-black/20 border border-white/5 rounded-2xl p-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Forensic Signal Analysis</p>
              <div className="space-y-2">
                {[
                  { label: "Pitch Anomaly", value: result.forensic_features?.pitch_anomaly ?? 0 },
                  { label: "Spectral Flux Anomaly", value: result.forensic_features?.spectral_flux_anomaly ?? 0 },
                  { label: "Overall Anomaly Score", value: result.forensic_features?.overall_anomaly_score ?? 0 },
                ].map((feat) => (
                  <div key={feat.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{feat.label}</span>
                      <span className={feat.value > 0.5 ? "text-red-400" : "text-green-400"}>
                        {(feat.value * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${feat.value * 100}%` }}
                        transition={{ duration: 0.8 }}
                        className={`h-full rounded-full ${feat.value > 0.5 ? "bg-red-500" : "bg-green-500"}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline toggle */}
            {result.chunk_results?.length > 0 && (
              <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setShowTimeline(!showTimeline)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-sm font-bold text-white">
                    Temporal Timeline ({result.chunk_results.length} segments)
                  </span>
                  {showTimeline ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                <AnimatePresence>
                  {showTimeline && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5">
                        {/* Color bar timeline */}
                        <div className="flex h-8 rounded-xl overflow-hidden mb-3 gap-px">
                          {result.chunk_results.map((chunk, i) => (
                            <div
                              key={i}
                              title={`${formatMs(chunk.start_ms)}–${formatMs(chunk.end_ms)}: ${chunk.label} (${(chunk.confidence * 100).toFixed(0)}%)`}
                              className={`flex-1 transition-colors ${
                                chunk.label === "FAKE"
                                  ? chunk.confidence > 0.8
                                    ? "bg-red-600"
                                    : "bg-red-400/70"
                                  : chunk.confidence > 0.8
                                  ? "bg-green-600"
                                  : "bg-green-400/50"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>0:00</span>
                          <span className="text-red-400">■ Fake</span>
                          <span className="text-green-400">■ Real</span>
                          <span>{formatMs(result.duration_ms)}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button
              onClick={() => { setResult(null); setFile(null); }}
              className="w-full bg-white/5 border border-white/10 text-gray-400 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm"
            >
              Analyze Another File
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
