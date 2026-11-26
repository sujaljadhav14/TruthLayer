"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
      report ? `Certificate ID: ${report.certificate.certificate_id}. Report hash (SHA-256): ${report.certificate.file_hash}.` : "",
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
    const baseContent = [
      complaintNarrative,
    ];

    if (incidentDate || platform || location || suspectUrl || incidentNotes) {
      baseContent.push("");
      baseContent.push("Incident Details:");
      if (incidentDate) baseContent.push(`Date: ${incidentDate}`);
      if (platform) baseContent.push(`Platform: ${platform}`);
      if (location) baseContent.push(`Location: ${location}`);
      if (suspectUrl) baseContent.push(`Suspicious URL: ${suspectUrl}`);
      if (incidentNotes) baseContent.push(`Notes: ${incidentNotes}`);
    }

    if (reportId) {
      baseContent.push("");
      baseContent.push("Linked forensic evidence:");
      baseContent.push(`Shared report page: ${sharedReportLinks.reportPage || "Pending Submission"}`);
      baseContent.push(`Shared PDF report: ${sharedReportLinks.pdfPage || "Pending Submission"}`);
      baseContent.push("");
      baseContent.push(`Certificate ID: ${report?.certificate.certificate_id ?? "Loading..."}`);
      baseContent.push(`Report hash (SHA-256): ${report?.certificate.file_hash ?? "Loading..."}`);
    }

    return baseContent.join("\n");
  }, [complaintNarrative, incidentDate, platform, location, suspectUrl, incidentNotes, reportId, report?.certificate.certificate_id, report?.certificate.file_hash, sharedReportLinks.pdfPage, sharedReportLinks.reportPage]);

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

  const createComplaintRecord = async (status: "draft" | "email_prepared" | "submitted", emailOverride?: string) => {
    if (!reportId || !report) return null;

    const payload = {
      report_id: reportId,
      recipient_email: emailOverride || recipientEmail,
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
    const targetEmail = recipientList;
    if (!targetEmail) {
      setError("Add at least one authority email before preparing the draft.");
      return;
    }

    try {
      setSubmitting(true);
      await createComplaintRecord("email_prepared", targetEmail);
      
      let mailto = `mailto:${targetEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(mailBody)}`;
      if (complainantEmail) {
        mailto += `&cc=${encodeURIComponent(complainantEmail)}`;
      }
      
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
    <div className="mx-auto max-w-6xl">
      <p className="eyebrow mb-3 text-signal">Complaint assistant</p>
      <h1 className="display text-4xl text-paper sm:text-5xl">Report it to the right people.</h1>
      <p className="mt-3 max-w-2xl text-paper/60">
        Turn a saved forensic report into a complaint email for a cyber cell, platform or lawyer, then track what you sent.
      </p>

      {error && (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-alert/30 bg-alert/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-alert" />
          <p className="text-sm text-paper/80">{error}</p>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card step="01" title="Incident details">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Your name" value={user?.fullName ?? ""} readOnly />
              <Field label="Your email" value={complainantEmail} readOnly />
              <Field label="Platform / app" value={platform} onChange={setPlatform} placeholder="WhatsApp, Instagram, YouTube…" />
              <Field label="Incident date" type="date" value={incidentDate} onChange={setIncidentDate} />
              <Field label="City / state" value={location} onChange={setLocation} placeholder="Your city and state" />
              <Field label="Suspicious URL" value={suspectUrl} onChange={setSuspectUrl} placeholder="https://…" />
            </div>

            <div className="mt-4">
              <Field
                label="Send to (authority email)"
                value={recipientEmail}
                onChange={setRecipientEmail}
                placeholder="cybercell@…, legal@…"
              />
              <p className="mt-2 text-xs text-paper/45">
                Separate several addresses with commas. Your own email is CC&apos;d on the draft.
              </p>
            </div>

            <div className="mt-4">
              <label htmlFor="incident-notes" className="eyebrow mb-2 block text-[0.65rem] text-paper/55">Additional notes</label>
              <textarea
                id="incident-notes"
                value={incidentNotes}
                onChange={(e) => setIncidentNotes(e.target.value)}
                placeholder="How you received the content, why it is harmful, any threats or impersonation."
                className="min-h-36 w-full rounded-xl border border-white/15 bg-ink px-4 py-3 text-sm text-paper outline-none placeholder:text-paper/35 focus:border-signal"
              />
            </div>
          </Card>

          <Card step="02" title="Complaint text">
            {loading ? (
              <p className="flex items-center gap-3 text-paper/60">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading linked report…
              </p>
            ) : (
              <>
                <div className="rounded-xl border-[1.5px] border-ink bg-paper p-5 text-ink">
                  <p className="text-sm leading-7">{complaintNarrative}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={openEmailDraft}
                    disabled={submitting || !recipientList}
                    title={recipientList ? undefined : "Add an authority email first"}
                    className="btn-chunky bg-signal text-ink !py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Prepare email draft
                  </button>
                  <button
                    type="button"
                    onClick={downloadText}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-paper hover:bg-white/5"
                  >
                    <Download className="h-4 w-4" /> Download .txt
                  </button>
                  <button
                    type="button"
                    onClick={markComplaintSent}
                    disabled={submitting || !activeComplaintId}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-paper hover:bg-white/5 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" /> Mark as sent
                  </button>
                </div>
                {!recipientList && (
                  <p className="mt-3 text-xs text-caution">Add at least one authority email above to prepare the draft.</p>
                )}
              </>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Linked report" icon={<FileText className="h-4 w-4" />}>
            {!reportId ? (
              <p className="text-sm text-paper/60">
                Open this page from a saved report (Reports → File a complaint) to attach its evidence.
              </p>
            ) : loading ? (
              <p className="flex items-center gap-3 text-paper/60">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading report evidence…
              </p>
            ) : report ? (
              <motion.dl initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <InfoRow label="File" value={report.analysis.filename} />
                <InfoRow label="Verdict" value={`${report.analysis.verdict} (${report.analysis.confidence.toFixed(1)}%)`} />
                <InfoRow label="Generated" value={formatDate(report.certificate.issued_at)} />
                <InfoRow label="Certificate ID" value={report.certificate.certificate_id} mono />
                <InfoRow label="Report hash (SHA-256)" value={report.certificate.file_hash} mono />
                {sharedReportLinks.reportPage && <InfoRow label="Shared report link" value={sharedReportLinks.reportPage} mono />}
                {sharedReportLinks.pdfPage && <InfoRow label="Shared PDF link" value={sharedReportLinks.pdfPage} mono />}
                {report.heatmap && (
                  <InfoRow
                    label="Heatmap"
                    value={`${report.heatmap.suspicious_frame_count ?? 0} of ${report.heatmap.total_frames_analyzed ?? 0} frames suspicious`}
                  />
                )}
                {topHeatmap && topHeatmap.length > 0 && (
                  <div>
                    <dt className="eyebrow mb-2 text-[0.62rem] text-paper/45">Peak timestamps</dt>
                    <dd className="space-y-1.5">
                      {topHeatmap.map((entry, index) => (
                        <p key={`${entry.timestamp_ms}-${index}`} className="rounded-lg bg-alert/10 px-3 py-2 font-mono text-xs text-paper">
                          {formatTime(entry.timestamp_ms)} · <span className="text-alert">{(entry.fake_score * 100).toFixed(1)}% fake</span>
                        </p>
                      ))}
                    </dd>
                  </div>
                )}
              </motion.dl>
            ) : null}
          </Card>

          <Card title="Complaint tracker" icon={<ShieldAlert className="h-4 w-4" />}>
            {complaints.length === 0 ? (
              <p className="text-sm text-paper/60">No complaint drafted for this report yet.</p>
            ) : (
              <ul className="space-y-3">
                {complaints.map((complaint) => {
                  const status = STATUS[complaint.status] ?? { label: complaint.status, cls: "bg-white/10 text-paper/70" };
                  return (
                    <li
                      key={complaint.complaint_id}
                      className={`rounded-xl border p-4 ${
                        complaint.complaint_id === activeComplaintId ? "border-signal/40 bg-signal/5" : "border-white/10 bg-ink"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-paper">{complaint.subject}</p>
                          <p className="mt-1 text-xs text-paper/45">{formatDate(complaint.created_at)}</p>
                          <p className="mt-1 break-all text-xs text-paper/60">To: {complaint.recipient_email}</p>
                          {complaint.cc_email && <p className="mt-0.5 break-all text-xs text-paper/60">CC: {complaint.cc_email}</p>}
                        </div>
                        <span className={`eyebrow inline-flex flex-none items-center gap-1 rounded px-2 py-1 text-[0.6rem] ${status.cls}`}>
                          {complaint.status === "submitted" && <CheckCircle2 className="h-3 w-3" />}
                          {status.label}
                        </span>
                      </div>
                      {complaint.submitted_at && <p className="mt-3 text-xs text-signal">Marked sent {formatDate(complaint.submitted_at)}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-caution/15 text-caution" },
  email_prepared: { label: "Email drafted", cls: "bg-white/10 text-paper/80" },
  submitted: { label: "Sent", cls: "bg-signal/15 text-signal" },
};

function Card({ step, title, icon, children }: { step?: string; title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-ink-2 p-5 sm:p-6">
      <h2 className="mb-5 flex items-center gap-2 font-display text-xl font-extrabold text-paper">
        {step && <span className="font-mono text-xs font-semibold text-signal">{step}</span>}
        {icon && <span className="text-paper/50">{icon}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 block text-[0.65rem] text-paper/55">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full rounded-xl border border-white/15 bg-ink px-4 py-3 text-sm text-paper outline-none [color-scheme:dark] placeholder:text-paper/35 focus:border-signal read-only:text-paper/50"
      />
    </label>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="eyebrow mb-1 text-[0.62rem] text-paper/45">{label}</dt>
      <dd className={`text-paper/85 ${mono ? "break-all font-mono text-xs" : "text-sm"}`}>{value}</dd>
    </div>
  );
}
