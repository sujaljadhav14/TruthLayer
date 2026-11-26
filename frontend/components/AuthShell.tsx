import Link from "next/link";
import type { ReactNode } from "react";
import { ScanEye } from "lucide-react";

const POINTS = [
  { n: "01", title: "Video and voice checks", body: "Face-swap video and cloned or text-to-speech voices." },
  { n: "02", title: "Reasons, not just a score", body: "A plain-English verdict with the evidence behind it." },
  { n: "03", title: "Signed reports", body: "PDF + share link, signed with Ed25519 so edits are detectable." },
];

/** Shared layout for the Clerk sign-in / sign-up pages. */
export default function AuthShell({ title, subtitle, children }: { title: ReactNode; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-ink lg:grid-cols-[1.05fr_1fr]">
      <aside className="halftone relative hidden flex-col justify-between bg-signal p-12 text-ink [--dot:rgb(12_15_13/0.16)] lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-signal">
            <ScanEye className="h-5 w-5" />
          </span>
          <span className="font-display text-2xl font-extrabold tracking-tight">TruthLayer</span>
        </Link>

        <div>
          <h1 className="display text-6xl">{title}</h1>
          <ul className="mt-10 max-w-md space-y-5">
            {POINTS.map((p) => (
              <li key={p.n} className="flex gap-4">
                <span className="font-mono text-sm font-semibold">{p.n}</span>
                <div>
                  <p className="font-bold">{p.title}</p>
                  <p className="text-sm text-ink/70">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="font-mono text-xs text-ink/60">Built by Byte Devs · Hackverse 2026</p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal text-ink">
              <ScanEye className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-extrabold text-paper">TruthLayer</span>
          </Link>
          <p className="eyebrow text-signal">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** Clerk appearance tuned to the TruthLayer tokens. */
export const clerkAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full bg-transparent shadow-none p-0",
    headerTitle: "font-display text-paper",
    headerSubtitle: "text-paper/60",
    socialButtonsBlockButton: "clerk-google-btn",
    formButtonPrimary: "clerk-continue-btn",
    footerActionLink: "text-signal hover:text-signal",
    formFieldInput: "clerk-input",
    dividerLine: "bg-white/[0.08]",
    dividerText: "text-paper/45",
    formFieldLabel: "text-paper/70",
    footer: "bg-transparent",
  },
};
