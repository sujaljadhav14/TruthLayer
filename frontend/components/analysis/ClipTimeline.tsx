"use client";

import { fmtTime, pct } from "./format";

type Chunk = { start: number; end: number; fake_prob: number; label: string };
type Region = { start_sec: number; end_sec: number };

type Props = {
  duration: number;
  chunks: Chunk[];
  speech?: Region[];
  /** "paper" for light cards, "ink" for dark panels */
  tone?: "paper" | "ink";
};

/**
 * Where in the clip: speech regions + per-chunk verdicts, positioned by real
 * time (chunks overlap by design, so each one is drawn up to the next start).
 */
export default function ClipTimeline({ duration, chunks, speech = [], tone = "paper" }: Props) {
  const total = Math.max(duration, ...chunks.map((c) => c.end), 0.001);
  const left = (t: number) => `${(Math.max(0, t) / total) * 100}%`;
  const width = (a: number, b: number) => `${(Math.max(0, b - a) / total) * 100}%`;
  const sorted = [...chunks].sort((a, b) => a.start - b.start);
  const flagged = sorted.filter((c) => c.label === "fake");
  const border = tone === "paper" ? "border-ink" : "border-white/25";
  const muted = tone === "paper" ? "text-ink/55" : "text-white/50";

  return (
    <div>
      <div className={`relative h-9 overflow-hidden rounded-lg border-[1.5px] ${border} ${tone === "paper" ? "bg-paper-2/60" : "bg-white/5"}`}>
        {speech.map((r, i) => (
          <div
            key={`s${i}`}
            className={`absolute inset-y-0 ${tone === "paper" ? "bg-ink/10" : "bg-white/10"}`}
            style={{ left: left(r.start_sec), width: width(r.start_sec, r.end_sec) }}
          />
        ))}
        {sorted.map((c, i) => {
          const end = Math.min(c.end, sorted[i + 1]?.start ?? c.end);
          return (
            <div
              key={`c${i}`}
              title={`${fmtTime(c.start)}–${fmtTime(c.end)} · ${pct(c.fake_prob)} AI-generated`}
              className={`absolute top-1.5 bottom-1.5 rounded-[3px] ${c.label === "fake" ? "bg-alert" : "bg-signal"}`}
              style={{ left: left(c.start), width: width(c.start, end), opacity: 0.45 + Math.abs(c.fake_prob - 0.5) }}
            />
          );
        })}
      </div>
      <div className={`mt-1.5 flex justify-between font-mono text-[0.68rem] ${muted}`}>
        <span>0:00</span>
        <span>
          {flagged.length > 0
            ? `${flagged.length} of ${sorted.length} chunks flagged`
            : `${sorted.length} chunks, none flagged`}
          {speech.length > 0 && " · shaded = speech"}
        </span>
        <span>{fmtTime(total)}</span>
      </div>
    </div>
  );
}
