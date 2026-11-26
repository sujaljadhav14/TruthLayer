"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { Summary, Tone, Verdict } from "./summary";

const STAMP: Record<Verdict, { text: string; color: string }> = {
  fake: { text: "AI-generated", color: "var(--color-alert)" },
  real: { text: "Authentic", color: "var(--color-signal-deep)" },
  uncertain: { text: "Uncertain", color: "#c98500" },
};

const DOT: Record<Tone, string> = {
  fake: "bg-alert",
  real: "bg-signal-deep",
  neutral: "bg-caution",
};

type Props = {
  summary: Summary;
  media: "audio" | "video";
  filename?: string;
  /** Top-right tag, e.g. "Illustrative example" on the landing page */
  tag?: string;
  maxReasons?: number;
  children?: ReactNode;
};

export default function VerdictSummary({ summary, media, filename, tag, maxReasons = 3, children }: Props) {
  const stamp = STAMP[summary.verdict];
  const value = Math.round(summary.fakeProb * 100);
  const reasons = summary.reasons.slice(0, maxReasons);

  return (
    <section className="paper-card text-ink overflow-hidden" aria-label="Verdict summary">
      <header className="flex items-center justify-between gap-3 border-b-[1.5px] border-ink px-5 py-3 sm:px-7">
        <p className="eyebrow text-ink/70">
          Evidence summary · {media}
          {filename && <span className="normal-case tracking-normal font-normal"> · {filename}</span>}
        </p>
        {tag && <span className="eyebrow rounded border-[1.5px] border-ink px-2 py-1 text-[0.62rem]">{tag}</span>}
      </header>

      <div className="grid gap-6 px-5 py-6 sm:grid-cols-[1fr_auto] sm:px-7 sm:py-7">
        <div>
          <motion.div
            initial={{ opacity: 0, scale: 1.4, rotate: -12 }}
            animate={{ opacity: 1, scale: 1, rotate: -4 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="mb-4 inline-block rounded-md px-3 py-1 font-display text-sm font-black uppercase tracking-[0.14em]"
            style={{ color: stamp.color, border: `3px double ${stamp.color}` }}
          >
            {stamp.text}
          </motion.div>
          <h3 className="display text-3xl sm:text-4xl">{summary.headline}</h3>
          <p className="mt-2 max-w-md text-[0.95rem] text-ink/70">{summary.subline}</p>
        </div>

        <div className="sm:text-right">
          <p className="display text-6xl sm:text-7xl tabular-nums">{value}%</p>
          <p className="eyebrow mt-1 text-ink/60">chance it&apos;s AI-generated</p>
        </div>

        <div className="sm:col-span-2">
          <div className="relative h-3 rounded-full border-[1.5px] border-ink bg-gradient-to-r from-signal via-caution to-alert">
            <motion.div
              initial={{ left: "0%" }}
              animate={{ left: `${value}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="absolute top-1/2 h-6 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-ink"
              aria-hidden
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[0.68rem] text-ink/55">
            <span>Authentic</span>
            <span>Unsure</span>
            <span>AI-generated</span>
          </div>
        </div>
      </div>

      {reasons.length > 0 && (
        <div className="border-t-[1.5px] border-ink bg-paper/60 px-5 py-5 sm:px-7">
          <p className="eyebrow mb-3 text-ink/70">Why we think so</p>
          <ul className="space-y-3">
            {reasons.map((r) => (
              <li key={r.title} className="flex gap-3">
                <span className={`mt-1.5 h-2.5 w-2.5 flex-none rounded-full border border-ink ${DOT[r.tone]}`} aria-hidden />
                <div>
                  <p className="font-semibold leading-snug">{r.title}</p>
                  <p className="text-sm text-ink/65">{r.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {children}

      <footer className="border-t-[1.5px] border-ink px-5 py-3 font-mono text-[0.7rem] text-ink/55 sm:px-7">
        A verdict is evidence, not proof. Check the source before you act on it.
      </footer>
    </section>
  );
}
