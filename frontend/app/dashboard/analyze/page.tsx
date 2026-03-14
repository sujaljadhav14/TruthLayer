"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  FileVideo,
  FileAudio,
  X,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  BarChart3,
  ArrowLeft,
  Mic,
  Video,
  Activity,
  Fingerprint,
  Wind,
  Clock,
  Zap,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import ForensicReport from "@/components/ForensicReport";
import DebatePanel from "@/components/DebatePanel";
import HeatmapTimeline, { HeatmapResult } from "@/components/HeatmapTimeline";

/* ── Types ── */

type MediaMode = "video" | "audio";

type VideoResult = {
  verdict: "REAL" | "FAKE";
  confidence: number;
  truth_score: number;
  scores: { label: string; score: number }[];
  filename: string;
};

type AudioResult = {
  verdict: string;
  label: string;
  confidence: number;
  confidence_pct: string;
  fake_prob: number;
  real_prob: number;
  override: boolean;
  source_tool: string;
  tool_scores: Record<string, number>;
  ml_a: { fake_prob: number; real_prob: number; fake_chunks: number; total_chunks: number };
  ml_b: { fake_prob: number; real_prob: number; fake_chunks: number; total_chunks: number } | null;
  freq_score: number;
  signals: Record<string, { value: number; score: number; vote: string }>;
  freq_votes: { fake: number; real: number; uncertain: number };
  authenticity_score: {
    total: number;
    fake: number;
    real: number;
    breakdown: {
      deepfake_model: number;
      speaker_verification: number;
      artifact_detection: number;
      noise_analysis: number;
    };
    weights: {
      deepfake_model: number;
      speaker_verification: number;
      artifact_detection: number;
      noise_analysis: number;
    };
  };
  vad: { segments: number; speech_ratio: number };
  mfcc: { regularity_score: number };
  speaker_verification: { similarity: number; score: number };
  breathing: { count: number; score: number; intervals: number[] };
  warning: string;
  timeline: { start: number; end: number; fake_prob: number; real_prob: number; label: string }[];
  duration: number;
};

/* ── Helpers ── */

const AUDIO_ACCEPT = ".mp3,.wav,.flac,.ogg,.m4a,.aac,.wma,.webm,.mpeg,.mpg";
const AUDIO_EXTS = new Set(["mp3", "wav", "flac", "ogg", "m4a", "aac", "wma", "webm", "mpeg", "mpg"]);

function isAudioFile(f: File) {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  return f.type.startsWith("audio/") || f.type === "video/mpeg" || AUDIO_EXTS.has(ext);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function pct(v: number) {
  if (v == null || isNaN(v)) return "N/A";
  return `${(v * 100).toFixed(1)}%`;
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ── Signal chart color helper ── */
function signalColor(vote: string) {
  if (vote === "fake") return { bar: "from-red-600 to-red-400", text: "text-red-400", bg: "bg-red-500/10" };
  if (vote === "real") return { bar: "from-green-600 to-green-400", text: "text-green-400", bg: "bg-green-500/10" };
  return { bar: "from-amber-600 to-amber-400", text: "text-amber-400", bg: "bg-amber-500/10" };
}

/* ── Component ── */

export default function AnalyzePage() {
  const [mode, setMode] = useState<MediaMode>("video");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
  const [heatmapResult, setHeatmapResult] = useState<HeatmapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  /* ── Drag & Drop ── */
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const f = e.dataTransfer.files?.[0];
      if (!f) return;

      if (mode === "video" && f.type.startsWith("video/")) {
        setFile(f); setVideoResult(null); setAudioResult(null); setHeatmapResult(null); setError(null);
      } else if (mode === "audio" && isAudioFile(f)) {
        setFile(f); setVideoResult(null); setAudioResult(null); setHeatmapResult(null); setError(null);
      } else {
        setError(mode === "video"
          ? "Please upload a video file (MP4, AVI, MOV)."
          : "Please upload an audio file (MP3, WAV, FLAC, OGG, M4A).");
      }
    },
    [mode]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setVideoResult(null); setAudioResult(null); setHeatmapResult(null); setError(null); }
  };

  /* ── Analyze ── */
  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true); setError(null); setVideoResult(null); setAudioResult(null); setHeatmapResult(null); setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.random() * 8));
    }, 500);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const endpoint = mode === "video" ? "/api/analyze" : "/api/analyze-audio";
      const res = await fetch(endpoint, { method: "POST", body: fd });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Analysis failed");
      }

      const data = await res.json();
      setProgress(100);

      if (mode === "video") {
        setTimeout(() => setVideoResult(data as VideoResult), 300);
      } else {
        setTimeout(() => setAudioResult(data as AudioResult), 300);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      clearInterval(progressInterval);
      setAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setFile(null); setVideoResult(null); setAudioResult(null); setHeatmapResult(null); setError(null); setProgress(0);
  };

  const switchMode = (m: MediaMode) => {
    if (m === mode) return;
    resetAnalysis();
    setMode(m);
  };

  const isFake = audioResult
    ? audioResult.label === "fake"
    : videoResult
      ? videoResult.verdict === "FAKE"
      : false;

  /* ── Render ── */
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard"
          className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Forensic Analysis</h1>
          <p className="text-sm text-gray-400">
            Upload media to detect deepfake manipulation
          </p>
        </div>
      </div>

      {/* ── Mode Toggle ── */}
      <div className="flex gap-2 mb-8 bg-[#111] border border-white/10 rounded-xl p-1.5 w-fit">
        <button
          onClick={() => switchMode("video")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === "video"
              ? "bg-green-500 text-black shadow-lg shadow-green-500/20"
              : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
        >
          <Video className="w-4 h-4" />
          Video
        </button>
        <button
          onClick={() => switchMode("audio")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === "audio"
              ? "bg-green-500 text-black shadow-lg shadow-green-500/20"
              : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
        >
          <Mic className="w-4 h-4" />
          Audio
        </button>
      </div>
        <>
          {audioResult ? (
          <motion.div key="audio-result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            {/* Verdict */}
            <div className={`relative overflow-hidden rounded-3xl border p-8 mb-6 ${isFake ? "bg-red-500/5 border-red-500/30" : "bg-green-500/5 border-green-500/30"}`}>
              <div className={`absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl ${isFake ? "bg-red-500/10" : "bg-green-500/10"}`} />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border ${isFake ? "bg-red-500/10 border-red-500/30" : "bg-green-500/10 border-green-500/30"}`}>
                  {isFake ? <ShieldAlert className="w-10 h-10 text-red-500" /> : <ShieldCheck className="w-10 h-10 text-green-500" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-3xl font-bold text-white">{audioResult.verdict}</h2>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${isFake ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-green-500/20 text-green-400 border border-green-500/30"}`}>
                      {audioResult.confidence_pct} confidence
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">File: {file?.name}</p>
                  {audioResult.source_tool && audioResult.source_tool !== "Real Speech" && (
                    <p className="text-amber-400 text-sm mt-1">Detected source: <span className="font-bold">{audioResult.source_tool}</span></p>
                  )}
                  {audioResult.warning && <p className="text-amber-500/80 text-xs mt-2">{audioResult.warning}</p>}
                </div>
                <div className="text-center">
                  <div className="relative w-28 h-28">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                      <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={`${(audioResult.real_prob * 100) * 3.14} 314`} strokeLinecap="round"
                        className={audioResult.real_prob >= 0.7 ? "text-green-500" : audioResult.real_prob >= 0.4 ? "text-amber-500" : "text-red-500"} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-white">{Math.round(audioResult.real_prob * 100)}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">Auth</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Probability Bars */}
            <div className="bg-[#111] border border-white/10 rounded-3xl p-8 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-bold text-white">Probability Breakdown</h3>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Fake Probability", value: audioResult.fake_prob, color: "from-red-600 to-red-400" },
                  { label: "Real Probability", value: audioResult.real_prob, color: "from-green-600 to-green-400" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300 font-medium">{s.label}</span>
                      <span className="text-gray-400">{pct(s.value)}</span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: pct(s.value) }} transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full bg-gradient-to-r ${s.color}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Authenticity Score Breakdown — 4 weighted components */}
            {audioResult.authenticity_score?.breakdown && (
              <div className="bg-[#111] border border-white/10 rounded-3xl p-8 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-lg font-bold text-white">Authenticity Score Breakdown</h3>
                  <span className="text-xs text-gray-500 ml-auto">
                    Weighted composite: {pct(audioResult.authenticity_score.total)} fake
                  </span>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      label: "ML Deepfake Model",
                      key: "deepfake_model" as const,
                      icon: <Fingerprint className="w-4 h-4 text-purple-400" />,
                      desc: "wav2vec2 transformer models",
                    },
                    {
                      label: "Speaker Verification",
                      key: "speaker_verification" as const,
                      icon: <Mic className="w-4 h-4 text-blue-400" />,
                      desc: "Resemblyzer consistency",
                    },
                    {
                      label: "Artifact Detection",
                      key: "artifact_detection" as const,
                      icon: <Activity className="w-4 h-4 text-cyan-400" />,
                      desc: "8 frequency signals",
                    },
                    {
                      label: "Noise Analysis",
                      key: "noise_analysis" as const,
                      icon: <Wind className="w-4 h-4 text-green-400" />,
                      desc: "Noise floor + breathing",
                    },
                  ].map((comp) => {
                    const score = audioResult.authenticity_score.breakdown[comp.key];
                    const weight = audioResult.authenticity_score.weights[comp.key];
                    const isFakeSignal = score > 0.55;
                    const isRealSignal = score < 0.45;
                    return (
                      <div key={comp.key}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <div className="flex items-center gap-2">
                            {comp.icon}
                            <span className="text-gray-300 font-medium">{comp.label}</span>
                            <span className="text-[10px] text-gray-600">({comp.desc})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-gray-500 font-mono">{(weight * 100).toFixed(0)}% weight</span>
                            <span className={`text-sm font-bold ${isFakeSignal ? "text-red-400" : isRealSignal ? "text-green-400" : "text-amber-400"}`}>
                              {pct(score)}
                            </span>
                          </div>
                        </div>
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: pct(score) }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full rounded-full bg-gradient-to-r ${isFakeSignal ? "from-red-600 to-red-400" : isRealSignal ? "from-green-600 to-green-400" : "from-amber-600 to-amber-400"}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 8-Step Analysis Pipeline Overview */}
            <div className="bg-[#111] border border-white/10 rounded-3xl p-8 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-bold text-white">8-Step Analysis Pipeline</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { step: 1, name: "FFmpeg Pre-process", value: `${audioResult.duration?.toFixed(1) || "?"}s`, sub: "Audio normalized" },
                  { step: 2, name: "Voice Activity", value: `${audioResult.vad.segments} segs`, sub: `${pct(audioResult.vad.speech_ratio)} speech` },
                  { step: 3, name: "MFCC Features", value: pct(audioResult.mfcc.regularity_score), sub: "39 features extracted" },
                  { step: 4, name: "Speaker Verify", value: pct(audioResult.speaker_verification.similarity), sub: `Score: ${pct(1 - audioResult.speaker_verification.score)}` },
                  { step: 5, name: "ML Detection", value: pct(audioResult.ml_a.fake_prob), sub: `${audioResult.ml_a.fake_chunks}/${audioResult.ml_a.total_chunks} chunks` },
                  { step: 6, name: "8 Freq Signals", value: pct(audioResult.freq_score), sub: `${audioResult.freq_votes.fake}F/${audioResult.freq_votes.real}R/${audioResult.freq_votes.uncertain}U` },
                  { step: 7, name: "Breathing", value: `${audioResult.breathing.count} found`, sub: `Score: ${pct(1 - audioResult.breathing.score)}` },
                  { step: 8, name: "Auth Score", value: pct(1 - audioResult.authenticity_score.total), sub: audioResult.override ? "Override active" : "Weighted composite" },
                ].map((s) => (
                  <div key={s.step} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">{s.step}</span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider truncate">{s.name}</span>
                    </div>
                    <p className="text-base font-bold text-white">{s.value}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ML Models + Signal Votes */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-[#111] border border-white/10 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <Fingerprint className="w-5 h-5 text-green-500" />
                  <h3 className="text-base font-bold text-white">ML Model Scores</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-sm text-gray-300">Model A (XLS-R)</span>
                    <span className={`text-sm font-bold ${audioResult.ml_a.fake_prob > 0.5 ? "text-red-400" : "text-green-400"}`}>
                      {pct(audioResult.ml_a.fake_prob)} fake
                    </span>
                  </div>
                  {audioResult.ml_b && (
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-sm text-gray-300">Model B (V2)</span>
                      <span className={`text-sm font-bold ${audioResult.ml_b.fake_prob > 0.5 ? "text-red-400" : "text-green-400"}`}>
                        {pct(audioResult.ml_b.fake_prob)} fake
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-sm text-gray-300">Frequency Score</span>
                    <span className={`text-sm font-bold ${audioResult.freq_score > 0.5 ? "text-red-400" : "text-green-400"}`}>
                      {pct(audioResult.freq_score)} fake
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#111] border border-white/10 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <Activity className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-white">Signal Votes</h3>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                    <p className="text-2xl font-bold text-red-400">{audioResult.freq_votes.fake}</p>
                    <p className="text-xs text-gray-500">Fake</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                    <p className="text-2xl font-bold text-green-400">{audioResult.freq_votes.real}</p>
                    <p className="text-xs text-gray-500">Real</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <p className="text-2xl font-bold text-amber-400">{audioResult.freq_votes.uncertain}</p>
                    <p className="text-xs text-gray-500">Uncertain</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Signal Strength Chart (all signals) ── */}
            {audioResult.signals && Object.keys(audioResult.signals).length > 0 && (
              <div className="bg-[#111] border border-white/10 rounded-3xl p-8 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-white">Frequency Signal Analysis</h3>
                  <span className="text-xs text-gray-500 ml-auto">
                    {Object.keys(audioResult.signals).length} signals analyzed
                  </span>
                </div>

                {/* SVG bar chart */}
                <div className="bg-black/30 rounded-xl p-4 border border-white/5 mb-4">
                  <svg viewBox="0 0 600 200" className="w-full" preserveAspectRatio="xMidYMid meet">
                    {(() => {
                      const entries = Object.entries(audioResult.signals);
                      const barH = entries.length > 0 ? Math.min(22, 180 / entries.length) : 20;
                      const gap = 4;
                      const labelW = 140;
                      const chartW = 420;
                      const startX = 150;

                      return entries.map(([name, sig], i) => {
                        const y = 10 + i * (barH + gap);
                        const w = Math.max(2, sig.score * chartW);
                        const voteColor = sig.vote === "fake" ? "#ef4444" : sig.vote === "real" ? "#22c55e" : "#eab308";
                        return (
                          <g key={name}>
                            {/* Label */}
                            <text x={labelW} y={y + barH / 2 + 4} textAnchor="end" fontSize="9" className="fill-gray-400">
                              {name.replace(/_/g, " ")}
                            </text>
                            {/* Background bar */}
                            <rect x={startX} y={y} width={chartW} height={barH} rx={3} fill="rgba(255,255,255,0.03)" />
                            {/* Value bar */}
                            <rect x={startX} y={y} width={w} height={barH} rx={3} fill={voteColor} opacity={0.7} />
                            {/* Value label */}
                            <text x={startX + w + 6} y={y + barH / 2 + 4} fontSize="8" fill={voteColor}>
                              {sig.score.toFixed(3)} ({sig.vote})
                            </text>
                          </g>
                        );
                      });
                    })()}
                  </svg>
                </div>

                {/* Signal details grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(audioResult.signals).map(([name, sig]) => {
                    const c = signalColor(sig.vote);
                    return (
                      <div key={name} className={`${c.bg} border border-white/5 rounded-xl p-3 text-center`}>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 truncate">{name.replace(/_/g, " ")}</p>
                        <p className={`text-sm font-bold ${c.text}`}>{sig.value.toFixed(4)}</p>
                        <p className={`text-[10px] font-bold mt-1 ${c.text}`}>{sig.vote.toUpperCase()}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Audio Timeline */}
            {audioResult.timeline && audioResult.timeline.length > 0 && (
              <div className="bg-[#111] border border-white/10 rounded-3xl p-8 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-white">Audio Timeline</h3>
                  <span className="text-xs text-gray-500 ml-auto">{fmtTime(audioResult.duration || audioResult.timeline[audioResult.timeline.length - 1].end)}</span>
                </div>

                {/* Confidence gradient bar */}
                <div className="mb-4">
                  <div className="flex rounded-xl overflow-hidden h-10 bg-white/5">
                    {audioResult.timeline.map((seg, i) => {
                      const total = audioResult.duration || audioResult.timeline[audioResult.timeline.length - 1].end;
                      const widthPct = Math.max(0, ((seg.end - seg.start) / total) * 100);
                      const confOpacity = Math.max(0.2, Math.min(1, 0.4 + Math.abs((seg.fake_prob || 0) - 0.5) * 1.2));
                      return (
                        <div
                          key={i}
                          className={`relative group h-full border-r border-black/20 last:border-r-0 transition-all hover:opacity-100 ${
                            seg.label === "fake"
                              ? "bg-red-500"
                              : "bg-green-500"
                          }`}
                          style={{ width: `${widthPct}%`, minWidth: "2px", opacity: confOpacity }}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/95 border border-white/10 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                            <p className="text-white font-medium">{fmtTime(seg.start)} - {fmtTime(seg.end)}</p>
                            <p className={seg.label === "fake" ? "text-red-400" : "text-green-400"}>
                              {seg.label === "fake" ? "Fake" : "Real"}: {pct(seg.fake_prob)} fake
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-gray-500">
                    <span>0:00</span>
                    {audioResult.duration > 10 && <span>{fmtTime(audioResult.duration / 2)}</span>}
                    <span>{fmtTime(audioResult.duration || audioResult.timeline[audioResult.timeline.length - 1].end)}</span>
                  </div>
                </div>

                {/* Fake probability per chunk SVG chart */}
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Chunk-Level Fake Probability</p>
                  <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                    <svg viewBox="0 0 600 80" className="w-full" preserveAspectRatio="xMidYMid meet">
                      {/* Background grid */}
                      <line x1="30" y1="10" x2="590" y2="10" stroke="rgba(255,255,255,0.03)" />
                      <line x1="30" y1="35" x2="590" y2="35" stroke="rgba(239,68,68,0.2)" strokeDasharray="3 3" />
                      <line x1="30" y1="60" x2="590" y2="60" stroke="rgba(255,255,255,0.03)" />

                      {/* Y-axis labels */}
                      <text x="26" y="14" textAnchor="end" fontSize="7" className="fill-gray-500">100%</text>
                      <text x="26" y="39" textAnchor="end" fontSize="7" className="fill-gray-500">50%</text>
                      <text x="26" y="64" textAnchor="end" fontSize="7" className="fill-gray-500">0%</text>

                      {/* Line chart */}
                      {audioResult.timeline.length > 1 && (
                        <polyline
                          fill="none"
                          stroke="url(#fakeGrad)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={audioResult.timeline.map((seg, i) => {
                            const x = 32 + (i / (audioResult.timeline.length - 1)) * 556;
                            const y = 60 - seg.fake_prob * 50;
                            return `${x},${y}`;
                          }).join(" ")}
                        />
                      )}

                      {/* Area fill */}
                      {audioResult.timeline.length > 1 && (
                        <polygon
                          fill="url(#fakeArea)"
                          opacity="0.3"
                          points={[
                            `32,60`,
                            ...audioResult.timeline.map((seg, i) => {
                              const x = 32 + (i / (audioResult.timeline.length - 1)) * 556;
                              const y = 60 - seg.fake_prob * 50;
                              return `${x},${y}`;
                            }),
                            `${32 + 556},60`,
                          ].join(" ")}
                        />
                      )}

                      {/* Dots */}
                      {audioResult.timeline.map((seg, i) => {
                        const x = 32 + (i / Math.max(audioResult.timeline.length - 1, 1)) * 556;
                        const y = 60 - seg.fake_prob * 50;
                        return (
                          <circle key={i} cx={x} cy={y} r="3"
                            fill={seg.label === "fake" ? "#ef4444" : "#22c55e"}
                            stroke="rgba(0,0,0,0.5)" strokeWidth="1"
                          />
                        );
                      })}

                      <defs>
                        <linearGradient id="fakeGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                        <linearGradient id="fakeArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-red-500/80" />
                    <span>Fake / AI Generated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-green-500/80" />
                    <span>Authentic / Real</span>
                  </div>
                  <span className="ml-auto text-gray-600">Opacity = confidence level</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="text-center p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                    <p className="text-xl font-bold text-red-400">
                      {audioResult.timeline.filter(s => s.label === "fake").length}
                    </p>
                    <p className="text-xs text-gray-500">Fake Segments</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                    <p className="text-xl font-bold text-green-400">
                      {audioResult.timeline.filter(s => s.label === "real").length}
                    </p>
                    <p className="text-xs text-gray-500">Real Segments</p>
                  </div>
                </div>
              </div>
            )}

            {/* Voice Analysis */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#111] border border-white/10 rounded-2xl p-5 text-center">
                <Wind className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                <p className="text-xs text-gray-500 mb-1">Breathing Detection</p>
                <p className="text-xl font-bold text-white">{audioResult.breathing.count} breaths</p>
                <p className="text-xs text-gray-500 mt-1">Score: {pct(1 - audioResult.breathing.score)}</p>
              </div>
              <div className="bg-[#111] border border-white/10 rounded-2xl p-5 text-center">
                <Fingerprint className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                <p className="text-xs text-gray-500 mb-1">Speaker Consistency</p>
                <p className="text-xl font-bold text-white">{pct(audioResult.speaker_verification.similarity)}</p>
                <p className="text-xs text-gray-500 mt-1">Score: {pct(1 - audioResult.speaker_verification.score)}</p>
              </div>
              <div className="bg-[#111] border border-white/10 rounded-2xl p-5 text-center">
                <Activity className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                <p className="text-xs text-gray-500 mb-1">MFCC Regularity</p>
                <p className="text-xl font-bold text-white">{pct(audioResult.mfcc.regularity_score)}</p>
                <p className="text-xs text-gray-500 mt-1">Speech ratio: {pct(audioResult.vad.speech_ratio)}</p>
              </div>
            </div>

            {/* Tool Classification */}
            {audioResult.source_tool && (
              <div className="bg-[#111] border border-white/10 rounded-3xl p-8 mb-6">
                <h3 className="text-lg font-bold text-white mb-4">Tool Classification</h3>
                <div className="space-y-3">
                  {Object.entries(audioResult.tool_scores)
                    .sort(([, a], [, b]) => b - a)
                    .map(([tool, score]) => (
                      <div key={tool}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className={`font-medium ${tool === audioResult.source_tool ? "text-green-400" : "text-gray-400"}`}>{tool}</span>
                          <span className="text-gray-500">{pct(score)}</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: pct(score) }} transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full ${tool === audioResult.source_tool ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-white/10"}`} />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Forensic Report & Certificate */}
            <ForensicReport
              analysisData={{
                verdict: audioResult.label === "fake" ? "FAKE" : "REAL",
                confidence: audioResult.confidence,
                truth_score: Math.round(audioResult.real_prob * 100),
                filename: file?.name ?? "audio",
              }}
              audioData={audioResult}
            />

            {/* AI Debate Panel removed for audio */}

            <div className="flex gap-4">
              <button onClick={resetAnalysis} className="flex-1 bg-[#111] border border-white/10 text-white py-4 rounded-2xl font-medium hover:bg-[#1a1a1a] transition-colors">
                Analyze Another File
              </button>
            </div>
          </motion.div>

        ) : videoResult ? (
          /* ═══════════════ VIDEO RESULT ═══════════════ */
          <motion.div key="video-result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className={`relative overflow-hidden rounded-3xl border p-8 mb-6 ${videoResult.verdict === "FAKE" ? "bg-red-500/5 border-red-500/30" : "bg-green-500/5 border-green-500/30"}`}>
              <div className={`absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl ${videoResult.verdict === "FAKE" ? "bg-red-500/10" : "bg-green-500/10"}`} />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border ${videoResult.verdict === "FAKE" ? "bg-red-500/10 border-red-500/30" : "bg-green-500/10 border-green-500/30"}`}>
                  {videoResult.verdict === "FAKE" ? <ShieldAlert className="w-10 h-10 text-red-500" /> : <ShieldCheck className="w-10 h-10 text-green-500" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-bold text-white">{videoResult.verdict === "FAKE" ? "DEEPFAKE DETECTED" : "AUTHENTIC"}</h2>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${videoResult.verdict === "FAKE" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-green-500/20 text-green-400 border border-green-500/30"}`}>
                      {videoResult.confidence}% confidence
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">File: {videoResult.filename}</p>
                </div>
                <div className="text-center">
                  <div className="relative w-28 h-28">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                      <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={`${videoResult.truth_score * 3.14} 314`} strokeLinecap="round"
                        className={videoResult.truth_score >= 70 ? "text-green-500" : videoResult.truth_score >= 40 ? "text-amber-500" : "text-red-500"} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-white">{videoResult.truth_score}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">Truth</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="bg-[#111] border border-white/10 rounded-3xl p-8 mb-6">
              <div className="flex items-center gap-3 mb-6"><BarChart3 className="w-5 h-5 text-gray-400" /><h3 className="text-lg font-bold text-white">Score Breakdown</h3></div>
              <div className="space-y-4">
                {videoResult.scores.map((score) => (
                  <div key={score.label}>
                    <div className="flex justify-between text-sm mb-2"><span className="text-gray-300 font-medium">{score.label}</span><span className="text-gray-400">{(score.score * 100).toFixed(2)}%</span></div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${score.score * 100}%` }} transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${score.label === "FAKE" ? "bg-gradient-to-r from-red-600 to-red-400" : "bg-gradient-to-r from-green-600 to-green-400"}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {file && (
              <HeatmapTimeline initialFile={file} autoAnalyze compact onResult={setHeatmapResult} />
            )}

            {heatmapResult ? (
              <ForensicReport analysisData={videoResult} heatmapData={heatmapResult} />
            ) : (
              <div className="bg-[#111] border border-white/10 rounded-3xl p-6 mt-6">
                <p className="text-sm text-gray-400">
                  Preparing heatmap evidence for the saved report. The report will appear once frame-level analysis finishes.
                </p>
              </div>
            )}

            {/* AI Debate Panel */}
            <DebatePanel analysisData={videoResult} />

            <div className="flex gap-4 mt-6">
              <button onClick={resetAnalysis} className="flex-1 bg-[#111] border border-white/10 text-white py-4 rounded-2xl font-medium hover:bg-[#1a1a1a] transition-colors">
                Analyze Another Video
              </button>
            </div>
          </motion.div>

        ) : (
          /* ═══════════════ UPLOAD VIEW ═══════════════ */
          <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${dragActive ? "border-green-500 bg-green-500/5" : "border-white/10 bg-[#111] hover:border-white/20 hover:bg-[#151515]"}`}
            >
              <input
                type="file"
                accept={mode === "video" ? "video/*" : AUDIO_ACCEPT}
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${dragActive ? "bg-green-500/10 border-green-500/30" : "bg-white/5 border-white/10"}`}>
                  <Upload className={`w-8 h-8 ${dragActive ? "text-green-500" : "text-gray-400"}`} />
                </div>
                <div>
                  <p className="text-white font-medium text-lg">
                    {dragActive
                      ? `Drop your ${mode} here`
                      : `Drag & drop ${mode === "video" ? "a video" : "an audio"} file`}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    {mode === "video"
                      ? "or click to browse — MP4, AVI, MOV supported"
                      : "or click to browse — MP3, WAV, FLAC, OGG, M4A supported"}
                  </p>
                </div>
              </div>
            </div>

            {file && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                <div className="bg-[#111] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
                    {mode === "video" ? <FileVideo className="w-6 h-6 text-green-500" /> : <FileAudio className="w-6 h-6 text-green-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{file.name}</p>
                    <p className="text-gray-500 text-sm">{formatFileSize(file.size)}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {analyzing && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Analyzing {mode}...</span>
                      <span className="text-gray-400">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {mode === "video"
                        ? "Extracting frames, detecting faces, running neural network..."
                        : "Running VAD, MFCC extraction, ML models, frequency analysis, breathing detection..."}
                    </p>
                  </div>
                )}

                {!analyzing && (
                  <button onClick={handleAnalyze}
                    className="w-full mt-4 bg-green-500 text-black font-bold py-4 rounded-2xl hover:bg-green-400 transition-colors flex items-center justify-center gap-2 text-lg">
                    <ShieldCheck className="w-5 h-5" /> Start Forensic Analysis
                  </button>
                )}

                {analyzing && (
                  <button disabled className="w-full mt-4 bg-green-500/50 text-black/50 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-lg cursor-not-allowed">
                    <Loader2 className="w-5 h-5 animate-spin" /> Analyzing...
                  </button>
                )}
              </motion.div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-red-500/5 border border-red-500/20 rounded-2xl p-5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-medium">Analysis Failed</p>
                  <p className="text-red-400/70 text-sm mt-1">{error}</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </>
    </div>
  );
}
