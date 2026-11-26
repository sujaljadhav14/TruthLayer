"use client";

import { useState } from "react";
import VerdictSummary from "@/components/analysis/VerdictSummary";
import ClipTimeline from "@/components/analysis/ClipTimeline";
import { summarizeAudio, summarizeVideo } from "@/components/analysis/summary";
import { SAMPLE_AUDIO, SAMPLE_HEATMAP, SAMPLE_VIDEO } from "./sampleData";

const TABS = [
  { id: "audio", label: "Voice clip" },
  { id: "video", label: "Video" },
] as const;

export default function SampleReport() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("audio");

  return (
    <section id="sample" className="scroll-mt-16 bg-paper text-ink">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="eyebrow mb-5 text-alert">06&nbsp;&nbsp;Less guessing. More context.</p>
            <h2 className="display text-5xl sm:text-7xl">
              Here&apos;s what
              <br />
              you get.
            </h2>
          </div>
          <p className="max-w-md text-lg text-ink/75 lg:justify-self-end">
            A verdict you can read in five seconds, the reasons behind it, and the evidence if you want to dig in.
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
          <div>
            <div role="tablist" aria-label="Sample type" className="mb-5 inline-flex rounded-xl border-[1.5px] border-ink bg-white p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${tab === t.id ? "bg-ink text-paper" : "text-ink/70 hover:text-ink"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "audio" ? (
              <VerdictSummary key="a" summary={summarizeAudio(SAMPLE_AUDIO)} media="audio" filename="voice_note.m4a" tag="Illustrative example">
                <div className="border-t-[1.5px] border-ink px-5 py-5 sm:px-7">
                  <p className="eyebrow mb-3 text-ink/70">Where in the clip</p>
                  <ClipTimeline duration={SAMPLE_AUDIO.duration} chunks={SAMPLE_AUDIO.timeline} speech={SAMPLE_AUDIO.vad.speech_segments} />
                </div>
              </VerdictSummary>
            ) : (
              <VerdictSummary key="v" summary={summarizeVideo(SAMPLE_VIDEO, SAMPLE_HEATMAP)} media="video" filename={SAMPLE_VIDEO.filename} tag="Illustrative example" />
            )}
            <p className="mt-5 font-mono text-xs text-ink/55">
              Illustrative example with made-up files and numbers. Not a real analysis.
            </p>
          </div>

          <div className="lg:pt-16">
            <p className="eyebrow mb-4 text-alert">A closer look</p>
            <p className="display text-3xl sm:text-4xl">
              The verdict.
              <br />
              The reasons.
              <br />
              The evidence.
            </p>
            <p className="mt-6 max-w-sm text-ink/75">
              Every result leads with one number: the chance the clip is AI-generated. Below it, the strongest reasons
              in plain English, then the timeline, heatmaps and raw signals for anyone who needs them.
            </p>
            <p className="mt-6 max-w-sm text-sm text-ink/60">Switch between a voice clip and a video to see both kinds of report.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
