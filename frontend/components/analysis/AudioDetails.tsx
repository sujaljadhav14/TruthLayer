"use client";

import type { ReactNode } from "react";
import type { AudioResult } from "./types";
import { pct } from "./format";
import { SIGNAL_NAMES } from "./summary";

const VOTE_COLOR = { fake: "bg-alert", real: "bg-signal", uncertain: "bg-caution" } as const;
const VOTE_TEXT = { fake: "text-alert", real: "text-signal", uncertain: "text-caution" } as const;

function Panel({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-ink-2 p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h4 className="font-display text-lg font-extrabold text-paper">{title}</h4>
        {note && <p className="text-right font-mono text-[0.7rem] text-paper/45">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

const tone = (v: number) => (v > 0.55 ? "fake" : v < 0.45 ? "real" : "uncertain");

/** Everything behind "Technical details": the raw numbers for experts. */
export default function AudioDetails({ r }: { r: AudioResult }) {
  const comps = [
    { key: "deepfake_model" as const, label: "Deepfake models", desc: "wav2vec2 classifiers on the speech" },
    { key: "artifact_detection" as const, label: "Frequency artifacts", desc: "8 signal checks" },
    { key: "noise_analysis" as const, label: "Noise & breathing", desc: "noise floor + breaths" },
    { key: "speaker_verification" as const, label: "Speaker consistency", desc: "Resemblyzer (optional)" },
  ];
  const sigs = Object.entries(r.signals ?? {}).sort((a, b) => b[1].score - a[1].score);

  return (
    <div className="space-y-4">
      <Panel title="How the score was built" note={r.authenticity_score?.override_applied ? "raised to match artifact override" : "weighted average"}>
        <div className="space-y-4">
          {comps.map((c) => {
            const v = r.authenticity_score.breakdown[c.key];
            const w = r.authenticity_score.weights[c.key];
            const t = tone(v);
            return (
              <div key={c.key} className={w === 0 ? "opacity-45" : ""}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-paper">
                    {c.label} <span className="text-xs text-paper/40">· {c.desc}</span>
                  </span>
                  <span className="whitespace-nowrap font-mono text-xs text-paper/50">
                    weight {(w * 100).toFixed(0)}% · <span className={VOTE_TEXT[t]}>{pct(v)} AI</span>
                  </span>
                </div>
                <Bar value={v} color={VOTE_COLOR[t]} />
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Model scores" note={r.analysis_mode === "speech_focused" ? "scored on detected speech" : "scored on full file"}>
          <dl className="divide-y divide-white/5 text-sm">
            {[
              { k: "Model A · XLS-R", v: r.ml_a.fake_prob, sub: `${r.ml_a.fake_chunks}/${r.ml_a.total_chunks} chunks flagged` },
              ...(r.ml_b ? [{ k: "Model B · wav2vec2", v: r.ml_b.fake_prob, sub: `${r.ml_b.fake_chunks}/${r.ml_b.total_chunks} chunks flagged` }] : []),
              { k: "Frequency score", v: r.freq_score, sub: `${r.freq_votes.fake} fake · ${r.freq_votes.real} real · ${r.freq_votes.uncertain} unsure` },
            ].map((row) => (
              <div key={row.k} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <dt className="text-paper">{row.k}</dt>
                  <dd className="font-mono text-[0.7rem] text-paper/40">{row.sub}</dd>
                </div>
                <span className={`font-mono font-semibold ${VOTE_TEXT[tone(row.v)]}`}>{pct(row.v)}</span>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Voice cues">
          <dl className="divide-y divide-white/5 text-sm">
            {[
              { k: "Breaths detected", v: `${r.breathing.count}` },
              { k: "Speech in clip", v: `${pct(r.vad.speech_ratio)} · ${r.vad.speech_segments_count ?? r.vad.segments} regions` },
              { k: "MFCC regularity", v: pct(r.mfcc.regularity_score) },
              { k: "Speaker similarity", v: r.speaker_verification.similarity ? pct(r.speaker_verification.similarity) : "not run" },
              { k: "Closest tool match", v: r.source_tool ? `${r.source_tool}${r.tool_conf ? ` (${pct(r.tool_conf)})` : ""}` : "—" },
            ].map((row) => (
              <div key={row.k} className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-paper/70">{row.k}</dt>
                <dd className="font-mono text-paper">{row.v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      {sigs.length > 0 && (
        <Panel title="Frequency signals" note="0% = human-like · 100% = synthetic-like">
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {sigs.map(([k, s]) => (
              <div key={k}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-paper/80">{SIGNAL_NAMES[k] ?? k}</span>
                  <span className={`font-mono text-xs ${VOTE_TEXT[s.vote]}`}>
                    {pct(s.score)} · {s.vote}
                  </span>
                </div>
                <Bar value={s.score} color={VOTE_COLOR[s.vote]} />
              </div>
            ))}
          </div>
        </Panel>
      )}

      {Object.keys(r.tool_scores ?? {}).length > 0 && (
        <Panel title="Source tool guess" note="acoustic fingerprint match, not proof">
          <div className="space-y-2.5">
            {Object.entries(r.tool_scores)
              .sort(([, a], [, b]) => b - a)
              .map(([tool, score]) => (
                <div key={tool} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm">
                  <span className={tool === r.source_tool ? "font-semibold text-paper" : "text-paper/60"}>{tool}</span>
                  <Bar value={score} color={tool === r.source_tool ? "bg-paper" : "bg-white/25"} />
                  <span className="text-right font-mono text-xs text-paper/50">{pct(score)}</span>
                </div>
              ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
