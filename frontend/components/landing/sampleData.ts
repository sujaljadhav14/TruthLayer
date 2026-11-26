/*
 * FICTIONAL example results for the landing page demo. Shaped exactly like
 * real backend output so the demo runs through the same summary code as the
 * app. Always label it as an illustrative example where it's shown.
 */

import type { AudioResult, VideoResult } from "@/components/analysis/types";
import type { HeatmapResult } from "@/components/HeatmapTimeline";

const chunk = (start: number, fake: number) => ({
  start,
  end: start + 4,
  fake_prob: fake,
  real_prob: 1 - fake,
  label: fake >= 0.5 ? "fake" : "real",
});

export const SAMPLE_AUDIO: AudioResult = {
  verdict: "AI-GENERATED",
  verdict_reason: "",
  label: "fake",
  confidence: 0.87,
  confidence_pct: "87.0%",
  fake_prob: 0.87,
  real_prob: 0.13,
  override: false,
  source_tool: "ElevenLabs",
  tool_scores: { ElevenLabs: 0.41, "OpenAI TTS": 0.22, "XTTS/Coqui": 0.16, "Generic TTS": 0.12, RVC: 0.06, "Real Speech": 0.03 },
  ml_a: { fake_prob: 0.93, real_prob: 0.07, fake_chunks: 6, total_chunks: 7 },
  ml_b: { fake_prob: 0.81, real_prob: 0.19, fake_chunks: 5, total_chunks: 7 },
  freq_score: 0.71,
  signals: {
    hf_energy: { value: 0.92, score: 0.92, vote: "fake" },
    noise_floor: { value: 0.78, score: 0.78, vote: "fake" },
    spectral_flatness: { value: 0.64, score: 0.64, vote: "fake" },
    flux_cv: { value: 0.58, score: 0.58, vote: "fake" },
    cpp: { value: 0.51, score: 0.51, vote: "uncertain" },
    shimmer: { value: 0.47, score: 0.47, vote: "uncertain" },
    phase: { value: 0.44, score: 0.44, vote: "real" },
    vocoder: { value: 0.62, score: 0.62, vote: "fake" },
  },
  freq_votes: { fake: 5, real: 1, uncertain: 2 },
  authenticity_score: {
    total: 0.87,
    fake: 0.87,
    real: 0.13,
    breakdown: { deepfake_model: 0.89, speaker_verification: 0.5, artifact_detection: 0.71, noise_analysis: 0.82 },
    weights: { deepfake_model: 0.65, speaker_verification: 0, artifact_detection: 0.25, noise_analysis: 0.1 },
  },
  vad: {
    segments: 5,
    speech_ratio: 0.82,
    speech_seconds: 19.7,
    speech_segments: [
      { start_sec: 0.4, end_sec: 5.1, duration_sec: 4.7 },
      { start_sec: 5.8, end_sec: 10.9, duration_sec: 5.1 },
      { start_sec: 11.6, end_sec: 15.2, duration_sec: 3.6 },
      { start_sec: 16.0, end_sec: 20.1, duration_sec: 4.1 },
      { start_sec: 21.0, end_sec: 23.2, duration_sec: 2.2 },
    ],
  },
  mfcc: { regularity_score: 0.71 },
  speaker_verification: { similarity: 0, score: 0.5 },
  breathing: { count: 0, score: 0.85, intervals: [] },
  warning: "",
  analysis_mode: "speech_focused",
  timeline: [chunk(0.4, 0.42), chunk(3.4, 0.71), chunk(6.4, 0.88), chunk(9.4, 0.95), chunk(12.6, 0.93), chunk(16.2, 0.9), chunk(19.2, 0.86)],
  duration: 24,
};

export const SAMPLE_VIDEO: VideoResult = {
  verdict: "REAL",
  confidence: 91.2,
  truth_score: 91,
  scores: [
    { label: "REAL", score: 0.912 },
    { label: "FAKE", score: 0.088 },
  ],
  filename: "press_conference.mp4",
};

export const SAMPLE_HEATMAP = {
  verdict: "REAL",
  confidence: 0.91,
  truth_score: 91,
  filename: "press_conference.mp4",
  duration_ms: 12000,
  total_frames_analyzed: 20,
  per_frame_scores: [],
  timeline: [],
  frames: [],
  suspicious_frame_count: 0,
} as HeatmapResult;
