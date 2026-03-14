"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Mail,
  Send,
  ShieldAlert,
} from "lucide-react";

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
  report_record?: {
    report_id: string;
    share_token?: string | null;
  };
};

type ComplaintRecord = {
  complaint_id: string;
  report_id?: string | null;
  recipient_email: string;
  cc_email?: string | null;
  subject: string;
  status: string;
  created_at: string;
  submitted_at?: string | null;
  report_filename?: string | null;
  report_verdict?: string | null;
};

function formatDate(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function ComplaintPage() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const reportId = searchParams.get("reportId");

  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState("");
  const [suspectUrl, setSuspectUrl] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [incidentNotes, setIncidentNotes] = useState("");
  const [location, setLocation] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [activeComplaintId, setActiveComplaintId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const complainantEmail = user?.primaryEmailAddress?.emailAddress ?? "";

  useEffect(() => {
    if (!reportId) return;

    const loadReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/report/${reportId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load report");
        setReport(data as ReportPayload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    };

    void loadReport();
  }, [reportId]);

  useEffect(() => {
    const loadComplaints = async () => {
      try {
        const query = reportId ? `?reportId=${encodeURIComponent(reportId)}` : "";
        const res = await fetch(`/api/complaint${query}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load complaints");
        const items = (data.complaints ?? []) as ComplaintRecord[];
        setComplaints(items);
        if (items[0]?.complaint_id) {
          setActiveComplaintId(items[0].complaint_id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load complaints");
      }
    };

    void loadComplaints();
  }, [reportId]);

  const topHeatmap = report?.heatmap?.timeline
    ?.filter((entry) => entry.is_suspicious)
    .sort((a, b) => b.fake_score - a.fake_score)
    .slice(0, 3);

  const sharedReportLinks = useMemo(() => {
    if (typeof window === "undefined" || !report?.report_record?.share_token) {
      return { reportPage: "", pdfPage: "" };
    }
    const origin = window.location.origin;
    const shareToken = report.report_record.share_token;
    return {
      reportPage: `${origin}/report/share/${shareToken}`,
      pdfPage: `${origin}/api/report/share/${shareToken}/pdf`,
    };
  }, [report?.report_record?.share_token]);

  const complaintNarrative = useMemo(() => {
    const complainant = user?.fullName ?? "the complainant";
    const reportSummary = report
      ? `A forensic analysis report was generated on ${formatDate(report.certificate.issued_at)} for file ${report.analysis.filename}. The system classified the media as ${report.analysis.verdict} with ${report.analysis.confidence.toFixed(1)}% confidence.`
      : "A forensic analysis report is attached for the suspicious media.";

    const heatmapSummary = report?.heatmap
      ? `Heatmap review flagged ${report.heatmap.suspicious_frame_count ?? 0} suspicious frames out of ${report.heatmap.total_frames_analyzed ?? 0} analyzed frames.`
      : "";

    const peakSummary = topHeatmap && topHeatmap.length > 0
      ? `Peak suspicious timestamps include ${topHeatmap.map((entry) => formatTime(entry.timestamp_ms)).join(", ")}.`
      : "";

    const audioSummary = report?.audio
      ? `Audio findings indicate real probability ${((report.audio.real_prob ?? 0) * 100).toFixed(1)}% and fake probability ${((report.audio.fake_prob ?? 0) * 100).toFixed(1)}%.`
      : "";

    const locationLine = location ? `The complainant is located in ${location}.` : "";
    const platformLine = platform ? `The suspicious content was encountered on ${platform}.` : "";
    const urlLine = suspectUrl ? `Relevant source URL: ${suspectUrl}.` : "";
    const notesLine = incidentNotes ? `Additional incident notes: ${incidentNotes}` : "";

    return [
      `I, ${complainant}, am submitting a cybercrime complaint regarding suspected manipulated digital media.`,
      locationLine,
      platformLine,
      urlLine,
      reportSummary,
      heatmapSummary,
      peakSummary,
      audioSummary,
      report ? `Certificate ID: ${report.certificate.certificate_id}. File hash: ${report.certificate.file_hash}.` : "",
      report?.report_record?.share_token ? `Shared forensic report: ${sharedReportLinks.reportPage}. Shared PDF report: ${sharedReportLinks.pdfPage}.` : "",
      notesLine,
      "I request that the matter be reviewed and investigated by the relevant cybercrime authorities.",
    ]
      .filter(Boolean)
      .join(" ");
  }, [
    incidentNotes,
    location,
    platform,
    report,
    sharedReportLinks.pdfPage,
    sharedReportLinks.reportPage,
    suspectUrl,
    topHeatmap,
    user?.fullName,
  ]);

  const emailSubject = useMemo(() => {
    const verdict = report?.analysis.verdict ?? "Suspicious Media";
    const filename = report?.analysis.filename ?? "forensic_report";
    return `Cybercrime Complaint: ${verdict} media evidence for ${filename}`;
  }, [report?.analysis.filename, report?.analysis.verdict]);

  const mailBody = useMemo(() => {
    return [
      complaintNarrative,
      "",
      "Linked forensic evidence:",
      `Shared report page: ${sharedReportLinks.reportPage || "Unavailable"}`,
      `Shared PDF report: ${sharedReportLinks.pdfPage || "Unavailable"}`,
      "",
      `Certificate ID: ${report?.certificate.certificate_id ?? "Unavailable"}`,
      `File hash: ${report?.certificate.file_hash ?? "Unavailable"}`,
    ].join("\n");
  }, [complaintNarrative, report?.certificate.certificate_id, report?.certificate.file_hash, sharedReportLinks.pdfPage, sharedReportLinks.reportPage]);

  const recipientList = recipientEmail
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
    .join(",");

  const downloadText = () => {
    const blob = new Blob([complaintNarrative], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `complaint_${report?.analysis.filename?.split(".")[0] ?? "draft"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const refreshComplaints = async () => {
    const query = reportId ? `?reportId=${encodeURIComponent(reportId)}` : "";
    const res = await fetch(`/api/complaint${query}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load complaints");
    const items = (data.complaints ?? []) as ComplaintRecord[];
    setComplaints(items);
    if (items[0]?.complaint_id) {
      setActiveComplaintId(items[0].complaint_id);
    }
  };

  const createComplaintRecord = async (status: "draft" | "email_prepared" | "submitted") => {
    if (!reportId || !report) return null;

    const payload = {
      report_id: reportId,
      recipient_email: recipientEmail,
      cc_email: complainantEmail || null,
      subject: emailSubject,
      narrative: complaintNarrative,
      incident: {
        platform,
        suspect_url: suspectUrl,
        incident_date: incidentDate,
        location,
        notes: incidentNotes,
      },
      report_context: {
        filename: report.analysis.filename,
        verdict: report.analysis.verdict,
        confidence: report.analysis.confidence,
        certificate_id: report.certificate.certificate_id,
        share_token: report.report_record?.share_token ?? null,
        shared_report_url: sharedReportLinks.reportPage,
        shared_pdf_url: sharedReportLinks.pdfPage,
      },
      status,
    };

    const res = await fetch("/api/complaint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save complaint");
    await refreshComplaints();
    setActiveComplaintId(data.complaint_record?.complaint_id ?? null);
    return data.complaint_record as ComplaintRecord;
  };

  const openEmailDraft = async () => {
    if (!recipientEmail) {
      setError("Enter the authority email address before preparing the complaint email.");
      return;
    }

    try {
      setSubmitting(true);
      await createComplaintRecord("email_prepared");
      const params = new URLSearchParams({
        subject: emailSubject,
        body: mailBody,
      });
      if (complainantEmail) {
        params.set("cc", complainantEmail);
      }
      const mailto = `mailto:${recipientList}?${params.toString()}`;
      window.location.href = mailto;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to prepare complaint email");
    } finally {
      setSubmitting(false);
    }
  };

  const markComplaintSent = async () => {
    if (!activeComplaintId) {
      setError("Prepare an email draft first so the complaint can be tracked.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`/api/complaint/${activeComplaintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "submitted" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update complaint");
      await refreshComplaints();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update complaint");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Complaint Assistant</h1>
        <p className="text-sm text-gray-400 mt-2">
          Prepare a cybercrime complaint email using your forensic report, share the linked evidence, and track complaint status.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-6">
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-[#111] p-6">
            <div className="flex items-center gap-3 mb-5">
              <FileText className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Incident Details</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Your Name" value={user?.fullName ?? ""} readOnly />
              <Field label="Your Email" value={complainantEmail} readOnly />
              <Field label="Platform / App" value={platform} onChange={setPlatform} placeholder="WhatsApp, Instagram, YouTube..." />
              <Field label="Incident Date" value={incidentDate} onChange={setIncidentDate} placeholder="YYYY-MM-DD" />
              <Field label="City / State" value={location} onChange={setLocation} placeholder="Your city and state" />
              <Field label="Suspicious URL" value={suspectUrl} onChange={setSuspectUrl} placeholder="https://..." />
              <Field label="Authority Email" value={recipientEmail} onChange={setRecipientEmail} placeholder="cybercell@..., police@..., legal@..." />
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Enter one or more authority email addresses separated by commas. Your signed-in email is copied automatically on the draft.
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Additional Notes</label>
              <textarea
                value={incidentNotes}
                onChange={(e) => setIncidentNotes(e.target.value)}
                placeholder="Describe how you received the content, why it is harmful, and any threats or impersonation involved."
                className="w-full min-h-36 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-green-500/40"
              />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#111] p-6">
            <div className="flex items-center gap-3 mb-5">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-bold text-white">Complaint Narrative</h2>
            </div>
            {loading ? (
              <div className="flex items-center gap-3 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading linked report...
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-gray-200 leading-7">{complaintNarrative}</p>
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    type="button"
                    onClick={downloadText}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download TXT
                  </button>
                  <button
                    type="button"
                    onClick={openEmailDraft}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/15 transition-colors disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Prepare Email Draft
                  </button>
                  <button
                    type="button"
                    onClick={markComplaintSent}
                    disabled={submitting || !activeComplaintId}
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/15 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Mark Complaint Sent
                  </button>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-[#111] p-6">
            <h2 className="text-lg font-bold text-white mb-5">Linked Forensic Report</h2>
            {!reportId ? (
              <p className="text-sm text-gray-400">
                Open this page from a saved report to prefill the complaint with forensic evidence.
              </p>
            ) : loading ? (
              <div className="flex items-center gap-3 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading report evidence...
              </div>
            ) : report ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <InfoRow label="File" value={report.analysis.filename} />
                <InfoRow label="Verdict" value={`${report.analysis.verdict} (${report.analysis.confidence.toFixed(1)}%)`} />
                <InfoRow label="Certificate ID" value={report.certificate.certificate_id} mono />
                <InfoRow label="Generated" value={formatDate(report.certificate.issued_at)} />
                <InfoRow label="File Hash" value={report.certificate.file_hash} mono />
                {sharedReportLinks.reportPage && (
                  <InfoRow label="Shared Report Link" value={sharedReportLinks.reportPage} mono />
                )}
                {sharedReportLinks.pdfPage && (
                  <InfoRow label="Shared PDF Link" value={sharedReportLinks.pdfPage} mono />
                )}
                {report.heatmap && (
                  <InfoRow
                    label="Heatmap"
                    value={`${report.heatmap.suspicious_frame_count ?? 0} suspicious frames / ${report.heatmap.total_frames_analyzed ?? 0} analyzed`}
                  />
                )}
                {topHeatmap && topHeatmap.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Peak Timestamps</p>
                    <div className="space-y-2">
                      {topHeatmap.map((entry, index) => (
                        <div key={`${entry.timestamp_ms}-${index}`} className="rounded-xl border border-orange-500/15 bg-orange-500/5 px-3 py-2 text-sm text-orange-200">
                          {formatTime(entry.timestamp_ms)} - {(entry.fake_score * 100).toFixed(1)}% fake
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#111] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Complaint Tracker</h2>
            {complaints.length === 0 ? (
              <p className="text-sm text-gray-400">
                No complaint draft has been prepared yet for this report.
              </p>
            ) : (
              <div className="space-y-3">
                {complaints.map((complaint) => (
                  <div
                    key={complaint.complaint_id}
                    className={`rounded-2xl border p-4 ${
                      complaint.complaint_id === activeComplaintId
                        ? "border-green-500/20 bg-green-500/5"
                        : "border-white/10 bg-black/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{complaint.subject}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(complaint.created_at)}</p>
                        <p className="text-xs text-gray-400 mt-1">Recipient: {complaint.recipient_email}</p>
                        {complaint.cc_email && (
                          <p className="text-xs text-gray-400 mt-1">CC: {complaint.cc_email}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        complaint.status === "submitted"
                          ? "bg-green-500/15 text-green-300"
                          : complaint.status === "email_prepared"
                            ? "bg-blue-500/15 text-blue-300"
                            : "bg-amber-500/15 text-amber-300"
                      }`}>
                        {complaint.status === "submitted" ? <CheckCircle2 className="w-3 h-3" /> : null}
                        {complaint.status}
                      </span>
                    </div>
                    {complaint.submitted_at && (
                      <p className="text-xs text-green-300 mt-3">Marked sent: {formatDate(complaint.submitted_at)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-green-500/40 read-only:text-gray-400"
      />
    </div>
  );
}

function InfoRow({
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
      <p className={`text-gray-200 ${mono ? "font-mono text-xs break-all" : "text-sm"}`}>{value}</p>
    </div>
  );
}
