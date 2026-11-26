"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Loader2,
  AlertTriangle,
  Clock3,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Activity,
  Waves,
  Download,
  Eye,
  Siren,
} from "lucide-react";

type ReportRecord = {
  report_id: string;
  filename: string;
  issued_at: string;
  verdict: string;
  confidence: number;
  truth_score: number;
  summary: string;
  pdf_filename?: string | null;
  has_audio: boolean;
  has_heatmap: boolean;
};

type ReportPayload = {
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
  audio?: {
    verdict?: string;
    real_prob?: number;
    fake_prob?: number;
    source_tool?: string;
    warning?: string;
  } | null;
  heatmap?: {
    suspicious_frame_count?: number;
    total_frames_analyzed?: number;
    duration_ms?: number;
    timeline?: { timestamp_ms: number; fake_score: number; is_suspicious: boolean }[];
  } | null;
  report_record?: ReportRecord;
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

export default function HistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/report/history", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load history");
        const nextReports = data.reports as ReportRecord[];
        setReports(nextReports);
        const requestedReportId = searchParams.get("reportId");
        if (requestedReportId && nextReports.some((report) => report.report_id === requestedReportId)) {
          setSelectedId(requestedReportId);
        } else if (nextReports[0]?.report_id) {
          setSelectedId(nextReports[0].report_id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    };

    void loadHistory();
  }, [searchParams]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedReport(null);
      return;
    }

    const loadDetail = async () => {
      setDetailLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/report/${selectedId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load report");
        setSelectedReport(data as ReportPayload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setDetailLoading(false);
      }
    };

    void loadDetail();
  }, [selectedId]);

  useEffect(() => {
    setShowPdf(false);
  }, [selectedId]);

  const downloadStoredPdf = async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/report/${selectedId}/pdf`, { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to download PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${selectedReport?.analysis.filename?.split(".")[0] ?? "truthlayer_report"}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download PDF");
    }
  };

  const selectedTone = verdictTone(selectedReport?.analysis.verdict);

  const topHeatmap = selectedReport?.heatmap?.timeline
    ?.filter((entry) => entry.is_suspicious)
    .sort((a, b) => b.fake_score - a.fake_score)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl">
      <p className="eyebrow mb-3 text-signal">Reports</p>
      <h1 className="display text-4xl text-paper sm:text-5xl">Your evidence.</h1>
      <p className="mt-3 max-w-xl text-paper/60">
        Every saved report, with its stored results, heatmap summary and signed certificate.
      </p>

      {error && (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-alert/30 bg-alert/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-alert" />
          <p className="text-sm text-paper/80">{error}</p>
        </div>
      )}

      <div className="mt-8">
        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-ink-2 p-10 text-paper/60">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading saved reports…
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-ink-2 p-10 text-center">
            <FileText className="mx-auto mb-4 h-10 w-10 text-paper/30" />
            <p className="font-semibold text-paper">No saved reports yet</p>
            <p className="mt-2 text-sm text-paper/55">Run an analysis and press &ldquo;Generate &amp; save&rdquo;. It will show up here.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <ul className="space-y-3">
              {reports.map((report) => {
                const active = selectedId === report.report_id;
                const v = verdictTone(report.verdict);
                return (
                  <li key={report.report_id}>
                    <button
                      onClick={() => setSelectedId(report.report_id)}
                      aria-current={active ? "true" : undefined}
                      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                        active ? "border-signal bg-signal/10" : "border-white/10 bg-ink-2 hover:border-white/25"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${TONE[v].icon}`}>
                          {v === "fake" ? <ShieldAlert className="h-5 w-5" /> : v === "real" ? <ShieldCheck className="h-5 w-5" /> : <ShieldQuestion className="h-5 w-5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-paper">{report.filename}</p>
                          <p className="mt-0.5 text-xs text-paper/45">{formatDate(report.issued_at)}</p>
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            <span className={`eyebrow rounded px-2 py-1 text-[0.6rem] ${TONE[v].pill}`}>{TONE[v].label}</span>
                            {report.has_heatmap && <span className="eyebrow rounded bg-white/5 px-2 py-1 text-[0.6rem] text-paper/60">Heatmap</span>}
                            {report.has_audio && <span className="eyebrow rounded bg-white/5 px-2 py-1 text-[0.6rem] text-paper/60">Audio</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="min-h-[480px] rounded-2xl border border-white/10 bg-ink-2 p-5 sm:p-7">
              {detailLoading || !selectedReport ? (
                <div className="flex h-full items-center justify-center gap-3 text-paper/60">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading report…
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className={`eyebrow rounded px-2 py-1 text-[0.62rem] ${TONE[selectedTone].pill}`}>{TONE[selectedTone].label}</span>
                      <h2 className="mt-3 break-words font-display text-2xl font-extrabold text-paper sm:text-3xl">{selectedReport.analysis.filename}</h2>
                      <p className="mt-2 max-w-2xl text-sm text-paper/65">{selectedReport.certificate.summary}</p>
                    </div>
                    <div className="text-right">
                      <p className="display text-4xl text-paper tabular-nums">{selectedReport.analysis.confidence.toFixed(0)}%</p>
                      <p className="eyebrow mt-1 text-paper/45">confidence</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <MetricCard label="Truth score" value={`${selectedReport.analysis.truth_score}/100`} icon={<ShieldCheck className="h-4 w-4" />} />
                    <MetricCard label="Generated" value={formatDate(selectedReport.certificate.issued_at)} icon={<Clock3 className="h-4 w-4" />} />
                    <MetricCard label="Certificate" value={selectedReport.certificate.certificate_id.slice(0, 12) + "…"} icon={<FileText className="h-4 w-4" />} />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button onClick={downloadStoredPdf} className="btn-chunky bg-paper text-ink !py-2 text-sm">
                      <Download className="h-4 w-4" /> Download PDF
                    </button>
                    <button
                      onClick={() => setShowPdf((current) => !current)}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-paper hover:bg-white/5"
                    >
                      <Eye className="h-4 w-4" /> {showPdf ? "Hide PDF" : "Preview PDF"}
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/complaint?reportId=${selectedId}`)}
                      className="inline-flex items-center gap-2 rounded-xl border border-alert/30 bg-alert/10 px-4 py-2 text-sm font-semibold text-alert hover:bg-alert/15"
                    >
                      <Siren className="h-4 w-4" /> File a complaint
                    </button>
                  </div>

                  {showPdf && selectedId && (
                    <iframe
                      src={`/api/report/${selectedId}/pdf`}
                      title="Saved report PDF"
                      className="h-[720px] w-full rounded-xl border border-white/10 bg-white"
                    />
                  )}

                  {selectedReport.analysis.scores && selectedReport.analysis.scores.length > 0 && (
                    <Panel title="Model scores" icon={<Activity className="h-4 w-4" />}>
                      <div className="space-y-3">
                        {selectedReport.analysis.scores.map((score) => (
                          <div key={score.label}>
                            <div className="mb-1.5 flex justify-between text-sm">
                              <span className="text-paper/80">{score.label}</span>
                              <span className="font-mono text-paper/55">{(score.score * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <div className={`h-full rounded-full ${score.label === "FAKE" ? "bg-alert" : "bg-signal"}`} style={{ width: `${score.score * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  )}

                  {selectedReport.heatmap && (
                    <Panel title="Heatmap findings" icon={<Waves className="h-4 w-4" />}>
                      <div className="mb-4 grid gap-3 sm:grid-cols-3">
                        <MetricCard label="Suspicious frames" value={`${selectedReport.heatmap.suspicious_frame_count ?? 0}`} />
                        <MetricCard label="Frames analysed" value={`${selectedReport.heatmap.total_frames_analyzed ?? 0}`} />
                        <MetricCard label="Duration" value={formatTime(selectedReport.heatmap.duration_ms ?? 0)} />
                      </div>
                      {topHeatmap && topHeatmap.length > 0 && (
                        <ul className="space-y-2">
                          {topHeatmap.map((entry, index) => (
                            <li key={`${entry.timestamp_ms}-${index}`} className="flex items-center justify-between gap-4 rounded-xl bg-alert/10 px-4 py-3 text-sm">
                              <span className="text-paper">
                                Peak #{index + 1} <span className="font-mono text-paper/55">at {formatTime(entry.timestamp_ms)}</span>
                              </span>
                              <span className="font-mono font-semibold text-alert">{(entry.fake_score * 100).toFixed(1)}% fake</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Panel>
                  )}

                  {selectedReport.audio && (
                    <Panel title="Audio findings" icon={<Activity className="h-4 w-4" />}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <MetricCard label="Audio verdict" value={selectedReport.audio.verdict ?? "N/A"} />
                        <MetricCard label="Closest tool" value={selectedReport.audio.source_tool ?? "N/A"} />
                        <MetricCard label="Chance AI-generated" value={`${((selectedReport.audio.fake_prob ?? 0) * 100).toFixed(1)}%`} />
                        <MetricCard label="Chance authentic" value={`${((selectedReport.audio.real_prob ?? 0) * 100).toFixed(1)}%`} />
                      </div>
                      {selectedReport.audio.warning && <p className="mt-4 text-sm text-caution">{selectedReport.audio.warning}</p>}
                    </Panel>
                  )}

                  <Panel title="Certificate">
                    <div className="grid gap-4 text-sm md:grid-cols-2">
                      <KeyValue label="Algorithm" value={selectedReport.certificate.algorithm} />
                      <KeyValue label="Issuer" value={selectedReport.certificate.issuer} />
                      <KeyValue label="Report hash (SHA-256)" value={selectedReport.certificate.file_hash} mono />
                      <KeyValue label="Signature" value={selectedReport.certificate.signature} mono />
                    </div>
                  </Panel>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type Tone = "fake" | "real" | "uncertain";

function verdictTone(verdict?: string): Tone {
  const v = (verdict ?? "").toUpperCase();
  if (v === "FAKE") return "fake";
  if (v === "REAL") return "real";
  return "uncertain";
}

const TONE: Record<Tone, { label: string; pill: string; icon: string }> = {
  fake: { label: "AI-generated", pill: "bg-alert/15 text-alert", icon: "bg-alert/15 text-alert" },
  real: { label: "Authentic", pill: "bg-signal/15 text-signal", icon: "bg-signal/15 text-signal" },
  uncertain: { label: "Uncertain", pill: "bg-caution/15 text-caution", icon: "bg-caution/15 text-caution" },
};

function Panel({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-ink p-5">
      <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold text-paper">
        {icon && <span className="text-paper/50">{icon}</span>}
        {title}
      </h3>
      {children}
    </section>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink p-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-paper/45">
        {icon}
        <span className="eyebrow text-[0.62rem]">{label}</span>
      </div>
      <p className="font-semibold text-paper">{value}</p>
    </div>
  );
}

function KeyValue({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="eyebrow mb-1 text-[0.62rem] text-paper/45">{label}</p>
      <p className={`break-all text-paper/85 ${mono ? "font-mono text-xs" : "text-sm"}`}>{value}</p>
    </div>
  );
}
