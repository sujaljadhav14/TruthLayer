"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  FileText,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Waves,
} from "lucide-react";

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

  return (
    <div className="min-h-screen bg-[#050505] text-white px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-green-400 mb-3">TruthLens Shared Report</p>
          <h1 className="text-3xl font-bold">Forensic Report Preview</h1>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-[#111] p-10 flex items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading shared report...
          </div>
        ) : error || !report ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
            <p className="text-red-300 text-sm">{error ?? "Shared report not found."}</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-[#111] p-8">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-2xl font-bold">{report.analysis.filename}</h2>
                  <p className="text-sm text-gray-400 mt-2">{report.certificate.summary}</p>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold ${
                  report.analysis.verdict === "FAKE"
                    ? "bg-red-500/10 border-red-500/20 text-red-300"
                    : "bg-green-500/10 border-green-500/20 text-green-300"
                }`}>
                  {report.analysis.verdict === "FAKE" ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  {report.analysis.verdict} · {report.analysis.confidence.toFixed(1)}%
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <Metric label="Truth Score" value={`${report.analysis.truth_score}/100`} />
                <Metric label="Issued" value={formatDate(report.certificate.issued_at)} />
                <Metric label="Certificate" value={report.certificate.certificate_id.slice(0, 12) + "..."} />
              </div>
            </section>

            {report.analysis.scores && report.analysis.scores.length > 0 && (
              <section className="rounded-3xl border border-white/10 bg-[#111] p-8">
                <div className="flex items-center gap-3 mb-5">
                  <Activity className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-bold">Model Scores</h3>
                </div>
                <div className="space-y-4">
                  {report.analysis.scores.map((score) => (
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

            {report.heatmap && (
              <section className="rounded-3xl border border-white/10 bg-[#111] p-8">
                <div className="flex items-center gap-3 mb-5">
                  <Waves className="w-5 h-5 text-orange-400" />
                  <h3 className="text-lg font-bold">Heatmap Findings</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <Metric label="Suspicious Frames" value={`${report.heatmap.suspicious_frame_count ?? 0}`} />
                  <Metric label="Frames Analyzed" value={`${report.heatmap.total_frames_analyzed ?? 0}`} />
                  <Metric label="Duration" value={formatTime(report.heatmap.duration_ms ?? 0)} />
                </div>
                {topHeatmap && topHeatmap.length > 0 && (
                  <div className="space-y-3">
                    {topHeatmap.map((entry, index) => (
                      <div key={`${entry.timestamp_ms}-${index}`} className="rounded-2xl border border-orange-500/15 bg-orange-500/5 px-4 py-3 text-sm text-orange-200">
                        Peak anomaly #{index + 1}: {formatTime(entry.timestamp_ms)} - {(entry.fake_score * 100).toFixed(1)}% fake
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="rounded-3xl border border-white/10 bg-[#111] p-8">
              <div className="flex items-center gap-3 mb-5">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">Certificate</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <Metric label="Algorithm" value={report.certificate.algorithm} />
                <Metric label="Issuer" value={report.certificate.issuer} />
                <Metric label="File Hash" value={report.certificate.file_hash} mono />
                <Metric label="Signature" value={report.certificate.signature} mono />
              </div>
            </section>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{label}</p>
      <p className={`text-white ${mono ? "font-mono text-xs break-all" : "font-semibold"}`}>{value}</p>
    </div>
  );
}
