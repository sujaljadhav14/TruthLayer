"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Download,
  Shield,
  CheckCircle2,
  XCircle,
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
  const [error, setError] = useState<string | null>(null);

  const isFake = analysisData.verdict === "FAKE";

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
      a.download = `truthlens_report_${analysisData.filename?.split(".")[0] ?? "analysis"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF download failed");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="bg-[#111] border border-white/10 rounded-3xl p-8 mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
          <FileText className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Forensic Report & Certificate</h3>
          <p className="text-sm text-gray-400">Evidence summary plus cryptographically signed certificate</p>
        </div>

        <div className="ml-auto flex gap-3">
          {!cert && (
            <button
              onClick={generateReport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-500/20 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {loading ? "Generating..." : "Generate Certificate"}
            </button>
          )}

          <button
            onClick={downloadPDF}
            disabled={pdfLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-sm font-bold hover:bg-white/10 transition-all disabled:opacity-50"
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {evidencePoints.length > 0 && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Report Preview</p>
          <div className="space-y-2">
            {evidencePoints.map((point, index) => (
              <p key={index} className="text-sm text-gray-300 leading-relaxed">{point}</p>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {cert && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className={`rounded-2xl border p-5 ${
              isFake ? "bg-red-500/5 border-red-500/20" : "bg-green-500/5 border-green-500/20"
            }`}>
              <div className="flex items-start gap-3">
                {isFake
                  ? <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  : <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                }
                <p className="text-sm text-gray-300 leading-relaxed">{cert.summary}</p>
              </div>
            </div>

            <div className="bg-black/30 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-blue-400 uppercase tracking-wider">Digital Certificate</span>
                <span className="ml-auto text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <CertRow icon={<Hash className="w-3.5 h-3.5" />} label="Certificate ID" value={cert.certificate_id.split("-")[0] + "..."} mono />
                <CertRow icon={<Calendar className="w-3.5 h-3.5" />} label="Issued At" value={cert.issued_at.slice(0, 19).replace("T", " ") + " UTC"} />
                <CertRow icon={<Shield className="w-3.5 h-3.5" />} label="Algorithm" value={cert.algorithm} />
                <CertRow icon={<FileText className="w-3.5 h-3.5" />} label="File" value={cert.filename} />
                <CertRow
                  icon={<Hash className="w-3.5 h-3.5" />}
                  label="File Hash (SHA-256)"
                  value={cert.file_hash.slice(0, 24) + "..."}
                  mono
                  full
                />
                <CertRow
                  icon={<Lock className="w-3.5 h-3.5" />}
                  label="HMAC Signature"
                  value={cert.signature.slice(0, 24) + "..."}
                  mono
                  full
                />
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 text-xs text-gray-500">
                <p>Issuer: <span className="text-gray-400">{cert.issuer}</span></p>
                <p className="mt-1">
                  This certificate is tied to the stored analysis payload with an Ed25519 digital signature.
                  Any modification to the underlying analysis data invalidates the digital signature.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={generateReport}
                disabled={loading}
                className="flex-1 bg-white/5 border border-white/10 text-gray-400 py-2.5 rounded-xl text-sm hover:bg-white/10 transition-colors"
              >
                Regenerate Certificate
              </button>
              <button
                onClick={downloadPDF}
                disabled={pdfLoading}
                className="flex-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold py-2.5 rounded-xl text-sm hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2"
              >
                {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download PDF Report
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-gray-200 text-xs truncate ${mono ? "font-mono bg-black/20 px-2 py-1 rounded" : ""}`}>
        {value}
      </p>
    </div>
  );
}
