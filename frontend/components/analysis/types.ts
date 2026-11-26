/* Shapes returned by the FastAPI backend (via the Next.js /api proxies). */

export type MediaMode = "video" | "audio";

export type VideoResult = {
  verdict: "REAL" | "FAKE";
  confidence: number; // 0-100
  truth_score: number; // 0-100
  scores: { label: string; score: number }[];
  filename: string;
};

export type SignalVote = "fake" | "real" | "uncertain";

export type AudioResult = {
  verdict: string; // "AI-GENERATED" | "AUTHENTIC" | "UNCERTAIN"
  verdict_reason?: "" | "artifact_override" | "strong_agreement";
  label: "fake" | "real" | "uncertain";
  confidence: number;
  confidence_pct: string;
  fake_prob: number;
  real_prob: number;
  override: boolean;
  source_tool: string;
  tool_scores: Record<string, number>;
  tool_conf?: number;
  ml_a: { fake_prob: number; real_prob: number; fake_chunks: number; total_chunks: number };
  ml_b: { fake_prob: number; real_prob: number; fake_chunks: number; total_chunks: number } | null;
  freq_score: number;
  signals: Record<string, { value: number; score: number; vote: SignalVote }>;
  freq_votes: { fake: number; real: number; uncertain: number };
  authenticity_score: {
    total: number;
    fake: number;
    real: number;
    override_applied?: boolean;
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
  vad: {
    segments: number;
    speech_ratio: number;
    silence_ratio?: number;
    speech_seconds?: number;
    longest_speech_seconds?: number;
    speech_segments_count?: number;
    speech_segments?: { start_sec: number; end_sec: number; duration_sec: number }[];
  };
  mfcc: { regularity_score: number };
  speaker_verification: { similarity: number; score: number };
  breathing: { count: number; score: number; intervals: number[] };
  warning: string;
  analysis_mode?: string;
  timeline: { start: number; end: number; fake_prob: number; real_prob: number; label: string }[];
  duration: number;
};
