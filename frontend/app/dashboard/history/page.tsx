"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  FileText,
  Loader2,
  AlertTriangle,
  Clock3,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Waves,
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
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        if (nextReports[0]?.report_id) {
          setSelectedId(nextReports[0].report_id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    };

    void loadHistory();
  }, []);

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

  const topHeatmap = selectedReport?.heatmap?.timeline
    ?.filter((entry) => entry.is_suspicious)
    .sort((a, b) => b.fake_score - a.fake_score)
    .slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Reports History</h1>
        <p className="text-sm text-gray-400 mt-2">
          Browse saved forensic reports and inspect the stored analysis, heatmap summary, and certificate.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-[#111] p-10 flex items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading saved reports...
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-[#111] p-10 text-center">
          <FileText className="w-10 h-10 text-gray-500 mx-auto mb-4" />
          <p className="text-white font-semibold">No saved reports yet</p>
          <p className="text-sm text-gray-400 mt-2">
            Generate a report from the analysis page and it will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[360px,1fr] gap-6">
          <div className="space-y-4">
            {reports.map((report) => {
              const active = selectedId === report.report_id;
              return (
                <button
                  key={report.report_id}
                  onClick={() => setSelectedId(report.report_id)}
                  className={`w-full text-left rounded-3xl border p-5 transition-all ${
                    active
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-[#111] border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${
                      report.verdict === "FAKE"
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : "bg-green-500/10 border-green-500/20 text-green-400"
                    }`}>
                      {report.verdict === "FAKE" ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{report.filename}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(report.issued_at)}</p>
                      <div className="flex gap-2 flex-wrap mt-3">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          report.verdict === "FAKE" ? "bg-red-500/15 text-red-300" : "bg-green-500/15 text-green-300"
                        }`}>
                          {report.verdict}
                        </span>
                        {report.has_heatmap && (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-300">
                            Heatmap
                          </span>
                        )}
                        {report.has_audio && (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300">
                            Audio
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-3 line-clamp-3">{report.summary}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#111] p-8 min-h-[480px]">
            {detailLoading || !selectedReport ? (
              <div className="h-full flex items-center justify-center gap-3 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading report details...
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedReport.analysis.filename}</h2>
                    <p className="text-sm text-gray-400 mt-2">{selectedReport.certificate.summary}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl border text-sm font-bold ${
                    selectedReport.analysis.verdict === "FAKE"
                      ? "bg-red-500/10 border-red-500/20 text-red-300"
                      : "bg-green-500/10 border-green-500/20 text-green-300"
                  }`}>
                    {selectedReport.analysis.verdict} · {selectedReport.analysis.confidence.toFixed(1)}%
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <MetricCard label="Truth Score" value={`${selectedReport.analysis.truth_score}/100`} icon={<ShieldCheck className="w-5 h-5" />} />
                  <MetricCard label="Generated" value={formatDate(selectedReport.certificate.issued_at)} icon={<Clock3 className="w-5 h-5" />} />
                  <MetricCard label="Certificate" value={selectedReport.certificate.certificate_id.slice(0, 12) + "..."} icon={<FileText className="w-5 h-5" />} />
                </div>

                {selectedReport.analysis.scores && selectedReport.analysis.scores.length > 0 && (
                  <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Activity className="w-5 h-5 text-green-400" />
                      <h3 className="text-lg font-bold text-white">Model Scores</h3>
                    </div>
                    <div className="space-y-4">
                      {selectedReport.analysis.scores.map((score) => (
                        <div key={score.label}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-300">{score.label}</span>
                            <span className="text-gray-400">{(score.score * 100).toFixed(1)}%</span>
                          </div>
                          <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${score.label === "FAKE" ? "bg-red-500" : "bg-green-500"}`}
                              style={{ width: `${score.score * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {selectedReport.heatmap && (
                  <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Waves className="w-5 h-5 text-orange-400" />
                      <h3 className="text-lg font-bold text-white">Heatmap Findings</h3>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <MetricCard label="Suspicious Frames" value={`${selectedReport.heatmap.suspicious_frame_count ?? 0}`} />
                      <MetricCard label="Frames Analyzed" value={`${selectedReport.heatmap.total_frames_analyzed ?? 0}`} />
                      <MetricCard label="Duration" value={formatTime(selectedReport.heatmap.duration_ms ?? 0)} />
                    </div>
                    {topHeatmap && topHeatmap.length > 0 && (
                      <div className="space-y-3">
                        {topHeatmap.map((entry, index) => (
                          <div key={`${entry.timestamp_ms}-${index}`} className="rounded-2xl border border-orange-500/15 bg-orange-500/5 p-4 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-white">Peak anomaly #{index + 1}</p>
                              <p className="text-xs text-gray-400 mt-1">Timestamp {formatTime(entry.timestamp_ms)}</p>
                            </div>
                            <div className="text-sm font-bold text-orange-300">
                              {(entry.fake_score * 100).toFixed(1)}% fake
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {selectedReport.audio && (
                  <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Activity className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-bold text-white">Audio Findings</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <MetricCard label="Audio Verdict" value={selectedReport.audio.verdict ?? "N/A"} />
                      <MetricCard label="Source Tool" value={selectedReport.audio.source_tool ?? "N/A"} />
                      <MetricCard label="Real Probability" value={`${((selectedReport.audio.real_prob ?? 0) * 100).toFixed(1)}%`} />
                      <MetricCard label="Fake Probability" value={`${((selectedReport.audio.fake_prob ?? 0) * 100).toFixed(1)}%`} />
                    </div>
                    {selectedReport.audio.warning && (
                      <p className="text-sm text-amber-300 mt-4">{selectedReport.audio.warning}</p>
                    )}
                  </section>
                )}

                <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Certificate</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <KeyValue label="Algorithm" value={selectedReport.certificate.algorithm} />
                    <KeyValue label="Issuer" value={selectedReport.certificate.issuer} />
                    <KeyValue label="File Hash" value={selectedReport.certificate.file_hash} mono />
                    <KeyValue label="Signature" value={selectedReport.certificate.signature} mono />
                  </div>
                </section>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-white font-semibold">{value}</p>
    </div>
  );
}

function KeyValue({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{label}</p>
      <p className={`text-gray-200 break-all ${mono ? "font-mono text-xs" : "text-sm"}`}>{value}</p>
    </div>
  );
}
