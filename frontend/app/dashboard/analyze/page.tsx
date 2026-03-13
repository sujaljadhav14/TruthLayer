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
} from "lucide-react";
import Link from "next/link";
import DebatePanel from "@/components/DebatePanel";

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
  ml_a: { fake_prob: number; real_prob: number };
  ml_b: { fake_prob: number; real_prob: number } | null;
  freq_score: number;
  signals: Record<string, { value: number; score: number; vote: string }>;
  freq_votes: { fake: number; real: number; uncertain: number };
  authenticity_score: { total: number };
  vad: { segments: number; speech_ratio: number };
  mfcc: { regularity_score: number };
  speaker_verification: { similarity: number; score: number };
  breathing: { count: number; score: number };
  warning: string;
  timeline: { start: number; end: number; fake_prob: number; real_prob: number; label: string }[];
  duration: number;
};

/* ── Helpers ── */

const AUDIO_ACCEPT = ".mp3,.wav,.flac,.ogg,.m4a,.aac,.wma,.webm,.mpeg,.mpg";
const AUDIO_EXTS = new Set(["mp3", "wav", "flac", "ogg", "m4a", "aac", "wma", "webm", "mpeg", "mpg"]);

function isAudioFile(f: File) {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  return f.type.startsWith("audio/") || AUDIO_EXTS.has(ext);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ── Component ── */

export default function AnalyzePage() {
  const [mode, setMode] = useState<MediaMode>("video");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const result = mode === "video" ? videoResult : audioResult;

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
        setFile(f); setVideoResult(null); setAudioResult(null); setError(null);
      } else if (mode === "audio" && isAudioFile(f)) {
        setFile(f); setVideoResult(null); setAudioResult(null); setError(null);
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
    if (f) { setFile(f); setVideoResult(null); setAudioResult(null); setError(null); }
  };

  /* ── Analyze ── */
  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true); setError(null); setVideoResult(null); setAudioResult(null); setProgress(0);

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
    setFile(null); setVideoResult(null); setAudioResult(null); setError(null); setProgress(0);
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
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === "video"
              ? "bg-green-500 text-black shadow-lg shadow-green-500/20"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Video className="w-4 h-4" />
          Video
        </button>
        <button
          onClick={() => switchMode("audio")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === "audio"
              ? "bg-green-500 text-black shadow-lg shadow-green-500/20"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Mic className="w-4 h-4" />
          Audio
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* ═══════════════ AUDIO RESULT ═══════════════ */}
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

            {/* ML Models + Frequency Analysis */}
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
                <div className="space-y-2">
                  {Object.entries(audioResult.signals).slice(0, 4).map(([name, sig]) => (
                    <div key={name} className="flex justify-between items-center text-xs px-2">
                      <span className="text-gray-400 capitalize">{name.replace(/_/g, " ")}</span>
                      <span className={`font-bold ${sig.vote === "fake" ? "text-red-400" : sig.vote === "real" ? "text-green-400" : "text-amber-400"}`}>
                        {sig.vote}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Audio Timeline */}
            {audioResult.timeline && audioResult.timeline.length > 0 && (
              <div className="bg-[#111] border border-white/10 rounded-3xl p-8 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-white">Audio Timeline</h3>
                  <span className="text-xs text-gray-500 ml-auto">{fmtTime(audioResult.duration || audioResult.timeline[audioResult.timeline.length - 1].end)}</span>
                </div>
                <div className="relative">
                  <div className="flex rounded-xl overflow-hidden h-10 bg-white/5">
                    {audioResult.timeline.map((seg, i) => {
                      const total = audioResult.duration || audioResult.timeline[audioResult.timeline.length - 1].end;
                      const widthPct = ((seg.end - seg.start) / total) * 100;
                      return (
                        <div
                          key={i}
                          className={`relative group h-full border-r border-black/20 last:border-r-0 transition-opacity hover:opacity-80 ${
                            seg.label === "fake"
                              ? "bg-gradient-to-b from-red-500/80 to-red-600/60"
                              : "bg-gradient-to-b from-green-500/80 to-green-600/60"
                          }`}
                          style={{ width: `${widthPct}%`, minWidth: "2px" }}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 border border-white/10 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
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
                <div className="flex items-center gap-6 mt-4 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-red-500/80" />
                    <span>Fake / AI Generated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-green-500/80" />
                    <span>Authentic / Real</span>
                  </div>
                  <span className="ml-auto text-gray-600">Hover segments for details</span>
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

            {/* AI Debate Panel — auto-triggered */}
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
      </AnimatePresence>
    </div>
  );
}
