"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
  FileText,
  Download,
  Shield,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  Hash,
  Lock,
  Calendar,
  AlertTriangle,
} from "lucide-react";

type Certificate = {
  certificate_id: string;
  issued_at: string;
  filename: string;
  verdict: string;
  confidence: number;
  truth_score: number;
  file_hash: string;
  signature: string;
  algorithm: string;
  summary: string;
  issuer: string;
  suspicious_frame_count?: number | null;
  total_frames_analyzed?: number | null;
  audio_label?: string | null;
  audio_fake_prob?: number | null;
  audio_real_prob?: number | null;
};

type Score = { label: string; score: number };
type HeatmapEntry = { is_suspicious?: boolean; fake_score?: number; timestamp_ms?: number };
type HeatmapData = {
  suspicious_frame_count?: number;
  total_frames_analyzed?: number;
  timeline?: HeatmapEntry[];
};
type AudioData = {
  real_prob?: number;
  fake_prob?: number;
  source_tool?: string;
  warning?: string;
};

type Props = {
  analysisData: {
    verdict: string;
    confidence: number;
    truth_score: number;
    filename: string;
    scores?: Score[];
  };
  audioData?: Record<string, unknown> | null;
  heatmapData?: Record<string, unknown> | null;
};

function formatPeakTimestamp(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function ForensicReport({ analysisData, audioData, heatmapData }: Props) {
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [cert, setCert] = useState<Certificate | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isFake = analysisData.verdict === "FAKE";
  const isUncertain = analysisData.verdict !== "FAKE" && analysisData.verdict !== "REAL";

  const evidencePoints = useMemo(() => {
    const items: string[] = [];

    if (Array.isArray(analysisData.scores) && analysisData.scores.length > 0) {
      items.push(
        analysisData.scores
          .map((score) => `${score.label}: ${(score.score * 100).toFixed(1)}%`)
          .join(" | ")
      );
    }

    const heatmap = heatmapData as HeatmapData | null;
    if (heatmap?.total_frames_analyzed) {
      items.push(
        `Heatmap flagged ${heatmap.suspicious_frame_count ?? 0} of ${heatmap.total_frames_analyzed} analyzed frames as suspicious.`
      );
      const topEntry = heatmap.timeline
        ?.filter((entry) => entry.is_suspicious)
        .sort((a, b) => (b.fake_score ?? 0) - (a.fake_score ?? 0))[0];
      if (topEntry) {
        items.push(
          `Peak visual anomaly at ${formatPeakTimestamp(topEntry.timestamp_ms ?? 0)} with ${((topEntry.fake_score ?? 0) * 100).toFixed(1)}% fake probability.`
        );
      }
    }

    const audio = audioData as AudioData | null;
    if (audio) {
      items.push(
        `Audio probabilities: real ${((audio.real_prob ?? 0) * 100).toFixed(1)}%, fake ${((audio.fake_prob ?? 0) * 100).toFixed(1)}%.`
      );
      if (audio.source_tool) items.push(`Predicted audio source/tool: ${audio.source_tool}.`);
      if (audio.warning) items.push(String(audio.warning));
    }

    return items;
  }, [analysisData.scores, audioData, heatmapData]);

  const buildPayload = () => ({
    analysis_data: analysisData,
    audio_data: audioData ?? null,
    heatmap_data: heatmapData
      ? {
          verdict: (heatmapData as Record<string, unknown>).verdict,
          confidence: (heatmapData as Record<string, unknown>).confidence,
          truth_score: (heatmapData as Record<string, unknown>).truth_score,
          filename: (heatmapData as Record<string, unknown>).filename,
          duration_ms: (heatmapData as Record<string, unknown>).duration_ms,
          total_frames_analyzed: (heatmapData as Record<string, unknown>).total_frames_analyzed,
          suspicious_frame_count: (heatmapData as Record<string, unknown>).suspicious_frame_count,
          timeline: (heatmapData as Record<string, unknown>).timeline,
        }
      : null,
  });

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const data = await res.json();
      setCert(data.certificate);
      setReportId(data.report_record?.report_id ?? data.certificate?.certificate_id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report generation failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    setPdfLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/report/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "PDF generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `truthlayer_report_${analysisData.filename?.split(".")[0] ?? "analysis"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF download failed");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-ink-2 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-signal">Evidence report</p>
          <h3 className="mt-2 font-display text-2xl font-extrabold text-paper">Save a signed report</h3>
          <p className="mt-1 max-w-md text-sm text-paper/60">
            Hashed with SHA-256 and signed with Ed25519, so any later edit breaks the signature.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {!cert && (
            <button onClick={generateReport} disabled={loading} className="btn-chunky bg-signal text-ink !py-2.5 text-sm disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {loading ? "Saving…" : "Generate & save"}
            </button>
          )}
          <button onClick={downloadPDF} disabled={pdfLoading} className="btn-chunky bg-paper text-ink !py-2.5 text-sm disabled:opacity-60">
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {pdfLoading ? "Building PDF…" : "Download PDF"}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-5 flex items-center gap-3 rounded-xl border border-alert/30 bg-alert/10 p-4">
          <AlertTriangle className="h-4 w-4 flex-none text-alert" />
          <p className="text-sm text-paper/80">{error}</p>
        </div>
      )}

      {evidencePoints.length > 0 && (
        <div className="mt-5 rounded-xl border border-white/10 bg-ink p-5">
          <p className="eyebrow mb-3 text-paper/45">What goes in the report</p>
          <ul className="space-y-2">
            {evidencePoints.map((point, index) => (
              <li key={index} className="flex gap-2 text-sm leading-relaxed text-paper/75">
                <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-paper/40" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      <AnimatePresence>
        {cert && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-4">
            <div
              className={`rounded-xl border p-5 ${
                isFake ? "border-alert/30 bg-alert/10" : isUncertain ? "border-caution/30 bg-caution/10" : "border-signal/30 bg-signal/10"
              }`}
            >
              <div className="flex items-start gap-3">
                {isFake ? (
                  <XCircle className="mt-0.5 h-5 w-5 flex-none text-alert" />
                ) : isUncertain ? (
                  <HelpCircle className="mt-0.5 h-5 w-5 flex-none text-caution" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-signal" />
                )}
                <p className="text-sm leading-relaxed text-paper/85">{cert.summary}</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-ink p-5">
              <div className="mb-4 flex items-center gap-2">
                <Lock className="h-4 w-4 text-paper/60" />
                <span className="eyebrow text-paper/70">Digital certificate</span>
                <span className="eyebrow ml-auto rounded bg-signal/15 px-2 py-1 text-[0.62rem] text-signal">Signed</span>
              </div>

              <div className="grid gap-3 text-sm md:grid-cols-2">
                <CertRow icon={<Hash className="h-3.5 w-3.5" />} label="Certificate ID" value={cert.certificate_id.split("-")[0] + "…"} mono />
                <CertRow icon={<Calendar className="h-3.5 w-3.5" />} label="Issued" value={cert.issued_at.slice(0, 19).replace("T", " ") + " UTC"} />
                <CertRow icon={<Shield className="h-3.5 w-3.5" />} label="Algorithm" value={cert.algorithm} />
                <CertRow icon={<FileText className="h-3.5 w-3.5" />} label="File" value={cert.filename} />
                <CertRow icon={<Hash className="h-3.5 w-3.5" />} label="Report hash (SHA-256)" value={cert.file_hash.slice(0, 24) + "…"} mono full />
                <CertRow icon={<Lock className="h-3.5 w-3.5" />} label="Signature" value={cert.signature.slice(0, 24) + "…"} mono full />
              </div>

              <p className="mt-4 border-t border-white/5 pt-4 text-xs text-paper/45">
                Issued by <span className="text-paper/70">{cert.issuer}</span>. The signature covers the saved analysis results;
                changing any of them invalidates it.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={generateReport} disabled={loading} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-paper/70 hover:bg-white/5">
                Regenerate
              </button>
              {reportId && (
                <>
                  <Link href={`/dashboard/history?reportId=${reportId}`} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-paper hover:bg-white/5">
                    Open in reports
                  </Link>
                  <Link href={`/dashboard/complaint?reportId=${reportId}`} className="rounded-xl border border-alert/30 bg-alert/10 px-4 py-2.5 text-sm font-semibold text-alert hover:bg-alert/15">
                    Use for a complaint
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function CertRow({
  icon,
  label,
  value,
  mono = false,
  full = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <div className="mb-1 flex items-center gap-1.5 text-paper/45">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`truncate text-xs text-paper/85 ${mono ? "rounded bg-white/5 px-2 py-1 font-mono" : ""}`}>{value}</p>
    </div>
  );
}
