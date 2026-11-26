const ROWS: { what: string; how: string }[] = [
  { what: "Face-swap & reenacted video", how: "ResNeXt50 + LSTM over 20 frames" },
  { what: "Where in the frame", how: "Grad-CAM heatmap per frame" },
  { what: "Cloned & text-to-speech voices", how: "2 wav2vec2 models, speech only" },
  { what: "Synthesis artifacts", how: "8 frequency checks" },
  { what: "Human cues", how: "Breathing, voice activity" },
  { what: "Likely source tool", how: "Best guess, e.g. ElevenLabs, XTTS" },
  { what: "Evidence report", how: "PDF · SHA-256 · Ed25519 · share link" },
];

export default function WhatWeCheck() {
  return (
    <section id="checks" className="scroll-mt-16 border-t-[1.5px] border-ink bg-paper text-ink">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:py-32">
        <div>
          <p className="eyebrow mb-5 text-alert">07&nbsp;&nbsp;A clear view of the checks</p>
          <h2 className="display text-5xl sm:text-6xl">
            Know what&apos;s
            <br />
            being checked.
          </h2>
          <p className="mt-6 max-w-sm text-ink/75">
            No black box. Here is every check TruthLayer runs today, and what it uses to run it.
          </p>
        </div>

        <div>
          <p className="eyebrow mb-3 text-ink/60">Included in every analysis</p>
          <dl className="divide-y-[1.5px] divide-ink border-y-[1.5px] border-ink">
            {ROWS.map((r) => (
              <div key={r.what} className="flex items-baseline justify-between gap-6 py-4">
                <dt className="font-semibold">{r.what}</dt>
                <dd className="text-right text-sm text-ink/70">{r.how}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-6 py-4 text-ink/50">
              <dt className="font-semibold">Images, social media links</dt>
              <dd className="text-right text-sm">Not yet</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-ink/55">
            Results depend on clip quality. Very short, heavily compressed or noisy clips give weaker evidence.
          </p>
        </div>
      </div>
    </section>
  );
}
