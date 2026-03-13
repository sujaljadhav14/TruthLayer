"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  FileVideo,
  X,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import DebatePanel from "@/components/DebatePanel";
import ErrorBoundary from "@/components/ErrorBoundary";
import AudioPanel from "@/components/AudioPanel";

type AnalysisResult = {
  verdict: "REAL" | "FAKE";
  confidence: number;
  truth_score: number;
  scores: { label: string; score: number }[];
  filename: string;
};

export default function AnalyzePage() {
  const [activeTab, setActiveTab] = useState<"video" | "audio">("video");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("video/")) {
      setFile(droppedFile);
      setResult(null);
      setError(null);
    } else {
      setError("Please upload a video file (MP4, AVI, MOV).");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);
    setProgress(0);

    // Simulate progress while waiting for the backend
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 8;
      });
    }, 500);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Analysis failed");
      }

      const data: AnalysisResult = await response.json();
      setProgress(100);
      setTimeout(() => setResult(data), 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      clearInterval(progressInterval);
      setAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
            Upload a video to detect deepfake manipulation
          </p>
        </div>
      </div>

      {/* Tab switcher */}
        <div className="flex gap-2 mb-8 bg-[#111] border border-white/10 rounded-2xl p-1 w-fit">
          {(["video", "audio"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                activeTab === tab
                  ? "bg-white/10 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab === "video" ? "🎬 Video" : "🎙️ Audio"}
            </button>
          ))}
        </div>

      {activeTab === "audio" ? (
        <ErrorBoundary>
          <AudioPanel />
        </ErrorBoundary>
      ) : (
      <AnimatePresence mode="wait">
        {/* ─── RESULT VIEW ─── */}
        {result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Verdict Card */}
            <div
              className={`relative overflow-hidden rounded-3xl border p-8 mb-6 ${
                result.verdict === "FAKE"
                  ? "bg-red-500/5 border-red-500/30"
                  : "bg-green-500/5 border-green-500/30"
              }`}
            >
              <div
                className={`absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl ${
                  result.verdict === "FAKE"
                    ? "bg-red-500/10"
                    : "bg-green-500/10"
                }`}
              />

              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                <div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center border ${
                    result.verdict === "FAKE"
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-green-500/10 border-green-500/30"
                  }`}
                >
                  {result.verdict === "FAKE" ? (
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                  ) : (
                    <ShieldCheck className="w-10 h-10 text-green-500" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-bold text-white">
                      {result.verdict === "FAKE" ? "DEEPFAKE DETECTED" : "AUTHENTIC"}
                    </h2>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        result.verdict === "FAKE"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-green-500/20 text-green-400 border border-green-500/30"
                      }`}
                    >
                      {result.confidence}% confidence
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    File: {result.filename}
                  </p>
                </div>

                {/* Truth Score Gauge */}
                <div className="text-center">
                  <div className="relative w-28 h-28">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-white/5"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={`${result.truth_score * 3.14} 314`}
                        strokeLinecap="round"
                        className={
                          result.truth_score >= 70
                            ? "text-green-500"
                            : result.truth_score >= 40
                            ? "text-amber-500"
                            : "text-red-500"
                        }
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {result.truth_score}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                        Truth
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="bg-[#111] border border-white/10 rounded-3xl p-8 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-bold text-white">Score Breakdown</h3>
              </div>

              <div className="space-y-4">
                {result.scores.map((score) => (
                  <div key={score.label}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300 font-medium">
                        {score.label}
                      </span>
                      <span className="text-gray-400">
                        {(score.score * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score.score * 100}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          score.label === "FAKE"
                            ? "bg-gradient-to-r from-red-600 to-red-400"
                            : "bg-gradient-to-r from-green-600 to-green-400"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Debate Panel */}
            <ErrorBoundary>
              <DebatePanel analysisData={result} />
            </ErrorBoundary>

            {/* Actions */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={resetAnalysis}
                className="flex-1 bg-[#111] border border-white/10 text-white py-4 rounded-2xl font-medium hover:bg-[#1a1a1a] transition-colors"
              >
                Analyze Another Video
              </button>
            </div>
          </motion.div>
        ) : (
          /* ─── UPLOAD VIEW ─── */
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Drop zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${
                dragActive
                  ? "border-green-500 bg-green-500/5"
                  : "border-white/10 bg-[#111] hover:border-white/20 hover:bg-[#151515]"
              }`}
            >
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <div className="flex flex-col items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${
                    dragActive
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <Upload
                    className={`w-8 h-8 ${
                      dragActive ? "text-green-500" : "text-gray-400"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-white font-medium text-lg">
                    {dragActive
                      ? "Drop your video here"
                      : "Drag & drop a video file"}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    or click to browse — MP4, AVI, MOV supported
                  </p>
                </div>
              </div>
            </div>

            {/* Selected file + analyze button */}
            {file && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <div className="bg-[#111] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
                    <FileVideo className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {file.name}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress bar during analysis */}
                {analyzing && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Analyzing video...</span>
                      <span className="text-gray-400">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Extracting frames, detecting faces, running neural
                      network...
                    </p>
                  </div>
                )}

                {/* Analyze button */}
                {!analyzing && (
                  <button
                    onClick={handleAnalyze}
                    className="w-full mt-4 bg-green-500 text-black font-bold py-4 rounded-2xl hover:bg-green-400 transition-colors flex items-center justify-center gap-2 text-lg"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    Start Forensic Analysis
                  </button>
                )}

                {analyzing && (
                  <button
                    disabled
                    className="w-full mt-4 bg-green-500/50 text-black/50 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-lg cursor-not-allowed"
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </button>
                )}
              </motion.div>
            )}

            {/* Error display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-red-500/5 border border-red-500/20 rounded-2xl p-5 flex items-start gap-3"
              >
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
      )}
    </div>
  );
}
