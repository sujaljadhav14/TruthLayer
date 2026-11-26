"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import ScannerArt from "./ScannerArt";

/*
 * Hero + "how it works" as one scroll story (inspired by getvigil.in):
 * text blocks scroll on the left while the exhibit illustration stays pinned
 * on the right and changes stage with the block in view.
 */

type Step = { n: string; label: string; title: ReactNode; body: ReactNode; stage: number };

const STEPS: Step[] = [
  {
    n: "02",
    label: "Upload",
    stage: 1,
    title: <>Drop in the clip.</>,
    body: <>A video (MP4, MOV, AVI) or a voice recording (MP3, WAV, FLAC, OGG, M4A). The file is deleted from our server as soon as the analysis finishes.</>,
  },
  {
    n: "03",
    label: "Inspect",
    stage: 2,
    title: <>We look where <em>people</em> can&apos;t.</>,
    body: (
      <>
        <b>Audio:</b> two wav2vec2 deepfake models listen to the speech, and eight frequency checks look for the
        fingerprints voice cloners leave behind. <b>Video:</b> a ResNeXt50 + LSTM network reads 20 frames of the face,
        and Grad-CAM heatmaps show which pixels drove the call.
      </>
    ),
  },
  {
    n: "04",
    label: "Explain",
    stage: 3,
    title: <>A verdict, with <em>reasons</em>.</>,
    body: <>Not just a score. You get a plain-English verdict, the evidence behind it, and a timeline of where in the clip it was found.</>,
  },
  {
    n: "05",
    label: "Prove",
    stage: 4,
    title: <>A report you can <em>hand over</em>.</>,
    body: <>Every report is hashed (SHA-256) and signed (Ed25519), with a PDF, a share link and a QR code. The signature shows the report hasn&apos;t been changed since it was issued.</>,
  },
];

function StoryBlock({ onEnter, children, className = "" }: { onEnter: () => void; children: ReactNode; className?: string }) {
  return (
    <motion.div onViewportEnter={onEnter} viewport={{ amount: 0.6 }} className={className}>
      {children}
    </motion.div>
  );
}

export default function Story() {
  const [stage, setStage] = useState(0);

  return (
    <section className="relative bg-signal text-ink halftone [--dot:rgb(12_15_13/0.16)]">
      <div className="mx-auto grid max-w-7xl gap-x-10 px-5 sm:px-8 lg:grid-cols-[1.05fr_1fr]">
        {/* Left: scrolling text */}
        <div>
          <StoryBlock onEnter={() => setStage(0)} className="flex flex-col justify-center pt-28 pb-12 lg:min-h-[100svh] lg:pt-24">
            <p className="eyebrow mb-6">01&nbsp;&nbsp;Deepfake forensics for video &amp; voice</p>
            <h1 className="display text-[3.3rem] sm:text-7xl xl:text-[5.6rem]">
              Know if it&apos;s <em className="font-black">real</em>, before you share it.
            </h1>
            <p className="mt-6 max-w-md text-lg font-medium text-ink/80">
              Upload a video or a voice clip. TruthLayer checks it for AI manipulation, shows you where and why, and gives you a signed report.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/dashboard/analyze" className="btn-chunky bg-ink text-paper">
                Check a file <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a href="#sample" className="btn-chunky bg-paper text-ink">
                See a sample report
              </a>
            </div>
            <a href="#how" className="eyebrow mt-14 inline-flex items-center gap-2 hover:underline underline-offset-4">
              <ArrowDown className="h-4 w-4" /> Scroll
            </a>
            {/* Mobile: art inline (desktop gets the sticky version) */}
            <ScannerArt stage={3} className="mx-auto mt-10 w-full max-w-sm lg:hidden" />
          </StoryBlock>

          <div id="how" className="scroll-mt-16">
            {STEPS.map((s) => (
              <StoryBlock key={s.n} onEnter={() => setStage(s.stage)} className="flex flex-col justify-center py-14 lg:min-h-[100svh] lg:py-16">
                <p className="eyebrow mb-5">
                  {s.n}&nbsp;&nbsp;{s.label}
                </p>
                <h2 className="display text-5xl sm:text-6xl">{s.title}</h2>
                <p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-ink/80">{s.body}</p>
              </StoryBlock>
            ))}
          </div>
        </div>

        {/* Right: pinned illustration */}
        <div className="hidden lg:block">
          <div className="sticky top-0 flex h-[100svh] items-center justify-center pt-16">
            <ScannerArt stage={stage} className="w-full max-w-[470px] drop-shadow-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
