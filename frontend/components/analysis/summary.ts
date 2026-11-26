/*
 * Turns raw detector output into a plain-English summary: one verdict, one
 * number ("chance it's AI-generated"), and the reasons behind it.
 * Pure functions so the landing-page demo and the real results share them.
 */

import type { AudioResult, VideoResult } from "./types";
import type { HeatmapResult } from "@/components/HeatmapTimeline";
import { pct } from "./format";

export type Verdict = "fake" | "real" | "uncertain";
export type Tone = "fake" | "real" | "neutral";

export type Reason = { tone: Tone; title: string; detail: string };

export type Summary = {
  verdict: Verdict;
  /** 0..1 chance the media is AI-generated / manipulated */
  fakeProb: number;
  headline: string;
  subline: string;
  reasons: Reason[];
};

const SIGNAL_PLAIN: Record<string, { fake: string; real: string }> = {
  hf_energy: { fake: "Unusual energy above 4 kHz, typical of synthetic voices", real: "High-frequency energy looks like a normal recording" },
  spectral_flatness: { fake: "An unnaturally flat spectrum", real: "Spectrum has natural harmonic peaks" },
  flux_cv: { fake: "Spectral changes are too regular", real: "Spectral changes vary naturally" },
  cpp: { fake: "Voicing is more periodic than human speech", real: "Voicing periodicity is in the human range" },
  shimmer: { fake: "Too little loudness variation between cycles", real: "Natural loudness variation (shimmer)" },
  noise_floor: { fake: "Silences are unnaturally clean", real: "Background noise in silences, like a real room" },
  phase: { fake: "Phase structure looks generated", real: "Phase structure looks natural" },
  vocoder: { fake: "Vocoder fingerprint detected", real: "No vocoder fingerprint" },
};

export const SIGNAL_NAMES: Record<string, string> = {
  hf_energy: "High-frequency energy",
  spectral_flatness: "Spectral flatness",
  flux_cv: "Spectral flux regularity",
  cpp: "Cepstral peak prominence",
  shimmer: "Shimmer",
  noise_floor: "Noise floor",
  phase: "Phase coherence",
  vocoder: "Vocoder fingerprint",
};

function headlineFor(verdict: Verdict, media: "audio" | "video") {
  const thing = media === "audio" ? "voice" : "video";
  if (verdict === "fake") return { headline: `Likely AI-generated`, subline: `This ${thing} shows signs of synthesis or manipulation.` };
  if (verdict === "real") return { headline: `Likely authentic`, subline: `We found no strong signs that this ${thing} was generated or altered.` };
  return { headline: `We can't tell for sure`, subline: `The evidence points both ways. Treat this ${thing} with caution and check the source.` };
}

/** Put reasons that support the verdict first, then the rest. */
function rank(reasons: Reason[], verdict: Verdict) {
  const support: Tone = verdict === "fake" ? "fake" : verdict === "real" ? "real" : "neutral";
  return [...reasons].sort((a, b) => Number(b.tone === support) - Number(a.tone === support));
}

export function summarizeAudio(r: AudioResult): Summary {
  const verdict = r.label;
  const reasons: Reason[] = [];
  const ml = r.authenticity_score?.breakdown?.deepfake_model ?? r.ml_a.fake_prob;

  if (r.verdict_reason === "artifact_override" || r.override) {
    reasons.push({
      tone: "fake",
      title: "Two strong synthesis artifacts at once",
      detail: "High-frequency energy and voicing periodicity are both far outside the human range. Together they are a strong sign of a generated voice.",
    });
  }

  reasons.push(
    ml >= 0.6
      ? { tone: "fake", title: `Deepfake models: ${pct(ml)} likely synthetic`, detail: `${r.ml_b ? "Two" : "One"} wav2vec2 deepfake model${r.ml_b ? "s" : ""} listened to the speech and flagged it.` }
      : ml <= 0.4
        ? { tone: "real", title: `Deepfake models: ${pct(ml)} likely synthetic`, detail: `The wav2vec2 deepfake model${r.ml_b ? "s" : ""} found the speech natural.` }
        : { tone: "neutral", title: `Deepfake models are unsure (${pct(ml)})`, detail: "The speech models could not decide either way." },
  );

  const sigs = Object.entries(r.signals ?? {});
  const fakeSigs = sigs.filter(([, s]) => s.vote === "fake").sort((a, b) => b[1].score - a[1].score);
  const realSigs = sigs.filter(([, s]) => s.vote === "real").sort((a, b) => a[1].score - b[1].score);
  if (fakeSigs.length >= realSigs.length && fakeSigs.length > 0) {
    reasons.push({
      tone: "fake",
      title: `${fakeSigs.length} of ${sigs.length} frequency checks found artifacts`,
      detail: fakeSigs.slice(0, 2).map(([k]) => SIGNAL_PLAIN[k]?.fake ?? k).join(". ") + ".",
    });
  } else if (realSigs.length > 0) {
    reasons.push({
      tone: "real",
      title: `${realSigs.length} of ${sigs.length} frequency checks look natural`,
      detail: realSigs.slice(0, 2).map(([k]) => SIGNAL_PLAIN[k]?.real ?? k).join(". ") + ".",
    });
  }

  const speechSec = r.vad?.speech_seconds ?? r.duration * (r.vad?.speech_ratio ?? 0);
  if (r.breathing.count > 0) {
    reasons.push({ tone: "real", title: `${r.breathing.count} breath${r.breathing.count === 1 ? "" : "s"} detected`, detail: "Real speakers breathe between phrases; many voice generators don't." });
  } else if (speechSec > 10) {
    reasons.push({ tone: "fake", title: "No breathing detected", detail: `${Math.round(speechSec)} s of speech without a single audible breath is unusual for a real speaker.` });
  }

  if (r.warning) reasons.push({ tone: "neutral", title: "The models and the signals disagree", detail: r.warning });

  if (verdict === "fake" && r.source_tool && r.source_tool !== "Real Speech") {
    reasons.push({ tone: "neutral", title: `Closest match: ${r.source_tool}`, detail: "A best guess at the kind of tool, based on its acoustic fingerprint. Not proof of which product was used." });
  }

  return { verdict, fakeProb: r.fake_prob, ...headlineFor(verdict, "audio"), reasons: rank(reasons, verdict) };
}

export function summarizeVideo(v: VideoResult, heatmap?: HeatmapResult | null): Summary {
  const fake = v.scores.find((s) => s.label.toUpperCase() === "FAKE")?.score ?? (v.verdict === "FAKE" ? v.confidence / 100 : 1 - v.confidence / 100);
  // Use the backend's binary verdict so the summary always matches the saved report.
  const verdict: Verdict = v.verdict === "FAKE" ? "fake" : "real";
  const reasons: Reason[] = [
    fake >= 0.5
      ? { tone: "fake", title: `Video model: ${pct(fake)} likely manipulated`, detail: "A ResNeXt50 + LSTM network looked at a 20-frame sequence of the face and flagged it." }
      : { tone: "real", title: `Video model: ${pct(fake)} likely manipulated`, detail: "A ResNeXt50 + LSTM network looked at a 20-frame sequence of the face and found it consistent." },
  ];
  if (heatmap) {
    const n = heatmap.suspicious_frame_count;
    const total = heatmap.total_frames_analyzed;
    reasons.push(
      n > 0
        ? { tone: "fake", title: `${n} of ${total} frames flagged`, detail: "The heatmap below shows which parts of those frames drove the decision." }
        : { tone: "real", title: `0 of ${total} frames flagged`, detail: "No individual frame crossed the suspicion threshold." },
    );
  }
  return { verdict, fakeProb: fake, ...headlineFor(verdict, "video"), reasons: rank(reasons, verdict) };
}
