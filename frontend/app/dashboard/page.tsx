"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowUpRight, FileAudio, FileVideo, Loader2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";

const emptySubscribe = () => () => {};

type ReportRecord = {
  report_id: string;
  filename: string;
  issued_at: string;
  verdict: string;
  truth_score: number;
  has_audio: boolean;
};

type LoadState = "loading" | "ready" | "error";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function VerdictPill({ verdict }: { verdict: string }) {
  const fake = verdict?.toUpperCase().includes("FAKE") || verdict?.toUpperCase().includes("AI");
  return (
    <span className={`eyebrow rounded px-2 py-1 text-[0.62rem] ${fake ? "bg-alert/15 text-alert" : "bg-signal/15 text-signal"}`}>
      {fake ? "AI-generated" : "Authentic"}
    </span>
  );
}

export default function DashboardHome() {
  const { user } = useUser();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/report/history", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (cancelled) return;
        setReports((data.reports as ReportRecord[]) ?? []);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow mb-3 text-signal">Dashboard</p>
      <h1 className="display text-4xl text-paper sm:text-5xl">
        {mounted ? greeting() : "Welcome"}, {mounted ? (user?.firstName ?? "there") : "there"}.
      </h1>
      <p className="mt-3 max-w-lg text-paper/60">Got a clip you&apos;re not sure about? Check it before you share it.</p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <Link
          href="/dashboard/analyze"
          className="group relative overflow-hidden rounded-2xl border-2 border-ink bg-signal p-7 text-ink shadow-[6px_6px_0_0_#000] transition-transform hover:-translate-y-0.5"
        >
          <div className="halftone pointer-events-none absolute inset-0 [--dot:rgb(12_15_13/0.14)]" />
          <div className="relative">
            <p className="eyebrow">Start here</p>
            <h2 className="display mt-3 text-3xl">Check a video or voice clip</h2>
            <p className="mt-2 max-w-xs text-sm font-medium text-ink/75">Get a verdict, the reasons behind it, and a signed report.</p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold">
              New analysis <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </Link>

        <Link
          href="/dashboard/history"
          className="group rounded-2xl border-2 border-ink bg-paper p-7 text-ink shadow-[6px_6px_0_0_#000] transition-transform hover:-translate-y-0.5"
        >
          <p className="eyebrow">Your evidence</p>
          <h2 className="display mt-3 text-3xl">Saved reports</h2>
          <p className="mt-2 max-w-xs text-sm text-ink/70">Download signed PDFs, share a link, or file a complaint from a report.</p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold">
            View all <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </Link>
      </div>

      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-extrabold text-paper">Recent reports</h2>
          {reports.length > 0 && (
            <Link href="/dashboard/history" className="text-sm font-semibold text-paper/60 hover:text-paper">
              See all
            </Link>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-2">
          {state === "loading" && (
            <p className="flex items-center gap-2 px-6 py-8 text-sm text-paper/50">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your reports…
            </p>
          )}
          {state === "error" && (
            <p className="px-6 py-8 text-sm text-paper/50">Couldn&apos;t load reports. Is the backend running on port 8001?</p>
          )}
          {state === "ready" && reports.length === 0 && (
            <div className="px-6 py-10 text-center">
              <p className="font-semibold text-paper">No reports yet</p>
              <p className="mt-1 text-sm text-paper/50">Run an analysis and generate a report. It will show up here.</p>
            </div>
          )}
          {state === "ready" &&
            reports.slice(0, 5).map((r) => (
              <Link
                key={r.report_id}
                href={`/dashboard/history?reportId=${encodeURIComponent(r.report_id)}`}
                className="flex items-center gap-4 border-b border-white/5 px-5 py-4 last:border-b-0 hover:bg-white/[0.03]"
              >
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-white/5 text-paper/60">
                  {r.has_audio ? <FileAudio className="h-5 w-5" /> : <FileVideo className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-paper">{r.filename}</p>
                  <p className="text-xs text-paper/45">{r.issued_at ? new Date(r.issued_at).toLocaleString() : ""}</p>
                </div>
                <VerdictPill verdict={r.verdict} />
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
