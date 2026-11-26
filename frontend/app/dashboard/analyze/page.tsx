"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Upload, FileVideo, FileAudio, X, Loader2, AlertTriangle, Mic, Video, ChevronDown, RotateCcw } from "lucide-react";
import ForensicReport from "@/components/ForensicReport";
import HeatmapTimeline, { HeatmapResult } from "@/components/HeatmapTimeline";
import VerdictSummary from "@/components/analysis/VerdictSummary";
import ClipTimeline from "@/components/analysis/ClipTimeline";
import AudioDetails from "@/components/analysis/AudioDetails";
import { summarizeAudio, summarizeVideo } from "@/components/analysis/summary";
import { fmtTime, formatFileSize } from "@/components/analysis/format";
import type { AudioResult, MediaMode, VideoResult } from "@/components/analysis/types";

const AUDIO_ACCEPT = ".mp3,.wav,.flac,.ogg,.m4a,.aac,.wma,.webm,.mpeg,.mpg";
const AUDIO_EXTS = new Set(["mp3", "wav", "flac", "ogg", "m4a", "aac", "wma", "webm", "mpeg", "mpg"]);

const STEPS: Record<MediaMode, string[]> = {
  video: ["Extracting frames", "Finding the face", "Running the video model", "Building heatmaps"],
  audio: ["Converting audio", "Finding speech", "Running 2 deepfake models", "Checking 8 frequency signals", "Listening for breaths", "Scoring"],
};

function isAudioFile(f: File) {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  return f.type.startsWith("audio/") || f.type === "video/mpeg" || AUDIO_EXTS.has(ext);
}

/** Map the audio label onto the report API's verdict values. */
function reportVerdict(label: AudioResult["label"]) {
  return label === "fake" ? "FAKE" : label === "real" ? "REAL" : "UNCERTAIN";
}

export default function AnalyzePage() {
  const [mode, setMode] = useState<MediaMode>("video");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
  const [heatmapResult, setHeatmapResult] = useState<HeatmapResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!analyzing) return;
    const started = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [analyzing]);

  const pickFile = (f: File) => {
    setFile(f);
    setVideoResult(null);
    setAudioResult(null);
    setHeatmapResult(null);
    setError(null);
  };

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
      if ((mode === "video" && f.type.startsWith("video/")) || (mode === "audio" && isAudioFile(f))) {
        pickFile(f);
      } else {
        setError(mode === "video" ? "Please upload a video file (MP4, AVI, MOV)." : "Please upload an audio file (MP3, WAV, FLAC, OGG, M4A).");
      }
    },
    [mode]
  );

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    setVideoResult(null);
    setAudioResult(null);
    setHeatmapResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(mode === "video" ? "/api/analyze" : "/api/analyze-audio", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Analysis failed");
      }
      const data = await res.json();
      if (mode === "video") setVideoResult(data as VideoResult);
      else setAudioResult(data as AudioResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setVideoResult(null);
    setAudioResult(null);
    setHeatmapResult(null);
    setError(null);
  };

  const switchMode = (m: MediaMode) => {
    if (m === mode || analyzing) return;
    resetAnalysis();
    setMode(m);
  };

  const hasResult = Boolean(audioResult || videoResult);

  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow mb-3 text-signal">New analysis</p>
      <h1 className="display text-4xl text-paper sm:text-5xl">{hasResult ? "Here's what we found." : "Check a clip."}</h1>
      {!hasResult && <p className="mt-3 max-w-lg text-paper/60">Upload a video or a voice recording. The file is deleted from the server when the analysis finishes.</p>}

      {!hasResult && (
        <div role="tablist" aria-label="Media type" className="mt-8 inline-flex rounded-xl border border-white/15 bg-ink-2 p-1">
          {([
            { id: "video", label: "Video", icon: Video },
            { id: "audio", label: "Voice / audio", icon: Mic },
          ] as const).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={mode === t.id}
              onClick={() => switchMode(t.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                mode === t.id ? "bg-signal text-ink" : "text-paper/60 hover:text-paper"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        {audioResult ? (
          <motion.div key="audio-result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <VerdictSummary summary={summarizeAudio(audioResult)} media="audio" filename={file?.name}>
              {audioResult.timeline?.length > 0 && (
                <div className="border-t-[1.5px] border-ink px-5 py-5 sm:px-7">
                  <p className="eyebrow mb-3 text-ink/70">Where in the clip</p>
                  <ClipTimeline duration={audioResult.duration} chunks={audioResult.timeline} speech={audioResult.vad.speech_segments} />
                </div>
              )}
            </VerdictSummary>

            <details className="group rounded-2xl border border-white/10 bg-ink-2/60">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold text-paper sm:px-6">
                Technical details
                <ChevronDown className="h-5 w-5 text-paper/50 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                <AudioDetails r={audioResult} />
              </div>
            </details>

            <ForensicReport
              analysisData={{
                verdict: reportVerdict(audioResult.label),
                confidence: audioResult.confidence * 100,
                truth_score: Math.round(audioResult.real_prob * 100),
                filename: file?.name ?? "audio",
              }}
              audioData={audioResult}
            />

            <button onClick={resetAnalysis} className="btn-chunky w-full justify-center bg-paper text-ink">
              <RotateCcw className="h-4 w-4" /> Check another file
            </button>
          </motion.div>
        ) : videoResult ? (
          <motion.div key="video-result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <VerdictSummary summary={summarizeVideo(videoResult, heatmapResult)} media="video" filename={videoResult.filename} />

            {file && <HeatmapTimeline initialFile={file} autoAnalyze compact onResult={setHeatmapResult} />}

            {heatmapResult ? (
              <ForensicReport analysisData={videoResult} heatmapData={heatmapResult} />
            ) : (
              <p className="flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-2 p-5 text-sm text-paper/60">
                <Loader2 className="h-4 w-4 animate-spin" /> Building frame heatmaps. The signed report appears when they&apos;re ready.
              </p>
            )}

            <button onClick={resetAnalysis} className="btn-chunky w-full justify-center bg-paper text-ink">
              <RotateCcw className="h-4 w-4" /> Check another video
            </button>
          </motion.div>
        ) : (
          <motion.div key="upload" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {!file && (
              <label
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
                  dragActive ? "border-signal bg-signal/5" : "border-white/15 bg-ink-2 hover:border-white/30"
                }`}
              >
                <input
                  type="file"
                  accept={mode === "video" ? "video/*" : AUDIO_ACCEPT}
                  onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
                  className="sr-only"
                />
                <span className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 ${dragActive ? "border-signal text-signal" : "border-white/20 text-paper/60"}`}>
                  <Upload className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-lg font-semibold text-paper">
                    {dragActive ? `Drop your ${mode} here` : `Drag & drop ${mode === "video" ? "a video" : "an audio file"}, or click to browse`}
                  </span>
                  <span className="mt-1 block text-sm text-paper/50">
                    {mode === "video" ? "MP4, MOV, AVI" : "MP3, WAV, FLAC, OGG, M4A, AAC, WMA, WEBM"}
                  </span>
                </span>
              </label>
            )}

            {file && (
              <div className="rounded-2xl border border-white/10 bg-ink-2 p-5">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-signal/10 text-signal">
                    {mode === "video" ? <FileVideo className="h-6 w-6" /> : <FileAudio className="h-6 w-6" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-paper">{file.name}</p>
                    <p className="text-sm text-paper/50">{formatFileSize(file.size)}</p>
                  </div>
                  {!analyzing && (
                    <button onClick={() => setFile(null)} aria-label="Remove file" className="rounded-lg p-2 text-paper/50 hover:bg-white/5 hover:text-paper">
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {analyzing ? (
                  <div className="mt-5 border-t border-white/10 pt-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-semibold text-paper">
                        <Loader2 className="h-4 w-4 animate-spin text-signal" /> Analyzing…
                      </span>
                      <span className="font-mono text-paper/50">{fmtTime(elapsed)} elapsed</span>
                    </div>
                    <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                      {STEPS[mode].map((s, i) => (
                        <li key={s} className="flex items-center gap-2 text-sm text-paper/60">
                          <span className="font-mono text-[0.7rem] text-paper/35">{String(i + 1).padStart(2, "0")}</span> {s}
                        </li>
                      ))}
                    </ol>
                    <p className="mt-4 text-xs text-paper/40">
                      The first analysis after the server starts also loads the models, so it takes longer.
                    </p>
                  </div>
                ) : (
                  <button onClick={handleAnalyze} className="btn-chunky mt-5 w-full justify-center bg-signal text-ink">
                    Start analysis
                  </button>
                )}
              </div>
            )}

            {error && (
              <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl border border-alert/30 bg-alert/10 p-5">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-alert" />
                <div>
                  <p className="font-semibold text-alert">Analysis failed</p>
                  <p className="mt-1 text-sm text-paper/70">{error}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
