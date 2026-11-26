"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useParams } from "next/navigation";
import { AlertTriangle, Loader2, ScanEye, ShieldCheck } from "lucide-react";

type SharedReport = {
  certificate: {
    certificate_id: string;
    issued_at: string;
    filename: string;
    verdict: string;
    confidence: number;
    truth_score: number;
    summary: string;
    file_hash: string;
    signature: string;
    algorithm: string;
    issuer: string;
  };
  analysis: {
    filename: string;
    verdict: string;
    confidence: number;
    truth_score: number;
    scores?: { label: string; score: number }[];
  };
  heatmap?: {
    suspicious_frame_count?: number;
    total_frames_analyzed?: number;
    duration_ms?: number;
    timeline?: { timestamp_ms: number; fake_score: number; is_suspicious: boolean }[];
  } | null;
  audio?: {
    verdict?: string;
    real_prob?: number;
    fake_prob?: number;
    source_tool?: string;
  } | null;
};

const STAMP: Record<string, { text: string; color: string; headline: string }> = {
  FAKE: { text: "AI-generated", color: "var(--color-alert)", headline: "Likely AI-generated or manipulated" },
  REAL: { text: "Authentic", color: "var(--color-signal-deep)", headline: "No manipulation detected" },
  UNCERTAIN: { text: "Uncertain", color: "#c98500", headline: "Inconclusive, treat with caution" },
};

function formatDate(value?: string) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t-[1.5px] border-ink px-6 py-6 sm:px-8">
      <p className="eyebrow mb-4 text-ink/60">{title}</p>
      {children}
    </section>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="eyebrow text-[0.62rem] text-ink/50">{label}</dt>
      <dd className={`mt-1 ${mono ? "break-all font-mono text-xs" : "font-semibold"}`}>{value}</dd>
    </div>
  );
}

export default function SharedReportPage() {
  const params = useParams<{ shareToken: string }>();
  const shareToken = params?.shareToken;
  const [report, setReport] = useState<SharedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/report/share/${shareToken}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load shared report");
        setReport(data as SharedReport);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shared report");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [shareToken]);

  const topHeatmap = report?.heatmap?.timeline
    ?.filter((entry) => entry.is_suspicious)
    .sort((a, b) => b.fake_score - a.fake_score)
    .slice(0, 3);
  const stamp = STAMP[report?.analysis.verdict ?? ""] ?? STAMP.UNCERTAIN;

  return (
    <div className="min-h-screen bg-paper px-4 py-10 text-ink sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-signal">
              <ScanEye className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight">TruthLayer</span>
          </Link>
          <p className="eyebrow text-ink/60">Shared forensic report</p>
        </header>

        {loading ? (
          <div className="paper-card flex items-center justify-center gap-3 p-10 text-ink/60">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading shared report…
          </div>
        ) : error || !report ? (
          <div className="paper-card flex items-start gap-3 p-8" role="alert">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-alert" />
            <div>
              <p className="font-semibold">This report couldn&apos;t be loaded.</p>
              <p className="mt-1 text-sm text-ink/60">{error ?? "Shared report not found."} The link may be wrong or the report was removed.</p>
            </div>
          </div>
        ) : (
          <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="paper-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b-[1.5px] border-ink px-6 py-3 sm:px-8">
              <p className="eyebrow truncate text-ink/70">Exhibit · {report.analysis.filename}</p>
              <p className="eyebrow whitespace-nowrap text-ink/50">{formatDate(report.certificate.issued_at)}</p>
            </div>

            <div className="grid gap-6 px-6 py-7 sm:grid-cols-[1fr_auto] sm:px-8">
              <div>
                <div
                  className="mb-4 inline-block -rotate-3 rounded-md px-3 py-1 font-display text-sm font-black uppercase tracking-[0.14em]"
                  style={{ color: stamp.color, border: `3px double ${stamp.color}` }}
                >
                  {stamp.text}
                </div>
                <h1 className="display text-3xl sm:text-4xl">{stamp.headline}</h1>
                <p className="mt-3 max-w-lg text-ink/70">{report.certificate.summary}</p>
              </div>
              <div className="sm:text-right">
                <p className="display text-5xl tabular-nums">{report.analysis.confidence.toFixed(0)}%</p>
                <p className="eyebrow mt-1 text-ink/55">confidence in verdict</p>
              </div>
            </div>

            {report.analysis.scores && report.analysis.scores.length > 0 && (
              <Section title="Model scores">
                <div className="space-y-3">
                  {report.analysis.scores.map((score) => (
                    <div key={score.label}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="font-semibold">{score.label}</span>
                        <span className="font-mono text-ink/60">{(score.score * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full border border-ink bg-paper-2/60">
                        <div
                          className={`h-full ${score.label === "FAKE" ? "bg-alert" : "bg-signal"}`}
                          style={{ width: `${score.score * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {report.heatmap && (
              <Section title="Frame heatmap findings">
                <dl className="grid grid-cols-3 gap-4">
                  <Field label="Suspicious frames" value={`${report.heatmap.suspicious_frame_count ?? 0}`} />
                  <Field label="Frames analysed" value={`${report.heatmap.total_frames_analyzed ?? 0}`} />
                  <Field label="Duration" value={formatTime(report.heatmap.duration_ms ?? 0)} />
                </dl>
                {topHeatmap && topHeatmap.length > 0 && (
                  <ul className="mt-5 space-y-2">
                    {topHeatmap.map((entry, index) => (
                      <li key={`${entry.timestamp_ms}-${index}`} className="flex items-center gap-3 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full border border-ink bg-alert" />
                        Peak #{index + 1} at <span className="font-mono">{formatTime(entry.timestamp_ms)}</span>
                        <span className="text-ink/60">· {(entry.fake_score * 100).toFixed(1)}% fake</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}

            {report.audio && (
              <Section title="Audio findings">
                <dl className="grid grid-cols-3 gap-4">
                  <Field label="Audio verdict" value={report.audio.verdict ?? "N/A"} />
                  <Field label="Chance AI-generated" value={report.audio.fake_prob != null ? `${(report.audio.fake_prob * 100).toFixed(0)}%` : "N/A"} />
                  <Field label="Closest tool" value={report.audio.source_tool ?? "N/A"} />
                </dl>
              </Section>
            )}

            <Section title="Certificate">
              <dl className="grid gap-5 sm:grid-cols-2">
                <Field label="Certificate ID" value={report.certificate.certificate_id} mono />
                <Field label="Algorithm" value={report.certificate.algorithm} />
                <Field label="Issuer" value={report.certificate.issuer} />
                <Field label="Report hash (SHA-256)" value={report.certificate.file_hash} mono />
                <div className="sm:col-span-2">
                  <Field label="Signature" value={report.certificate.signature} mono />
                </div>
              </dl>
            </Section>

            <footer className="flex items-start gap-2 border-t-[1.5px] border-ink bg-ink px-6 py-4 text-paper sm:px-8">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-signal" />
              <p className="text-xs text-paper/75">
                Signed with Ed25519. If anyone edits this report, the signature no longer matches. A verdict is evidence, not proof.
              </p>
            </footer>
          </motion.article>
        )}

        <p className="mt-8 text-center text-sm text-ink/60">
          Got a clip of your own?{" "}
          <Link href="/" className="font-semibold text-ink underline underline-offset-4">
            Check it with TruthLayer
          </Link>
        </p>
      </div>
    </div>
  );
}
