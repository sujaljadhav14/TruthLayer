import Link from "next/link";
import { ArrowUpRight, ScanEye } from "lucide-react";

export default function FinalCta() {
  return (
    <>
      <section className="bg-signal text-ink halftone [--dot:rgb(12_15_13/0.16)]">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
          <p className="eyebrow mb-5">09&nbsp;&nbsp;Got a suspicious clip?</p>
          <h2 className="display text-6xl sm:text-8xl">
            Don&apos;t share it.
            <br />
            <em>Check it.</em>
          </h2>
          <p className="mt-6 max-w-md text-lg font-medium text-ink/80">
            Free to use. Sign in, upload, and get a verdict with reasons.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/dashboard/analyze" className="btn-chunky bg-ink text-paper">
              Check a file <ArrowUpRight className="h-4 w-4" />
            </Link>
            <a href="#sample" className="btn-chunky bg-paper text-ink">
              See a sample report
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-ink text-paper/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-paper">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal text-ink">
                <ScanEye className="h-5 w-5" />
              </span>
              <span className="font-display text-xl font-extrabold">TruthLayer</span>
            </div>
            <p className="mt-3 max-w-xs text-sm">Deepfake forensics for video and voice. A verdict, the reasons, and a signed report.</p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link href="/dashboard" className="hover:text-paper">Dashboard</Link>
            <Link href="/dashboard/analyze" className="hover:text-paper">New analysis</Link>
            <Link href="/dashboard/history" className="hover:text-paper">Reports</Link>
          </nav>
          <p className="text-xs">
            Built by Byte Devs for Hackverse 2026
            <br />
            Sujal · Samiksha · Rutuja · Bhoomi
          </p>
        </div>
      </footer>
    </>
  );
}
