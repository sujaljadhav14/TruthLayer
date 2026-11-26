import { Plus } from "lucide-react";

const LIMITS = [
  { title: "It can be wrong.", body: "New voice and video generators appear every month. A tool we weren't trained on can slip past. Treat a verdict as one piece of evidence." },
  { title: "Quality matters.", body: "Clear speech and a visible face give the strongest results. Short, compressed or noisy clips give weaker evidence." },
  { title: "Not images, yet.", body: "TruthLayer checks video and audio today. Image detection is on the roadmap, not in the product." },
];

const FAQ = [
  {
    q: "Is a FAKE verdict proof?",
    a: "No. It means the models and signals found strong signs of synthesis. Use it alongside other checks: the source, the context, and who shared it first.",
  },
  {
    q: "What happens to my files?",
    a: "The uploaded file is deleted from the server as soon as the analysis finishes. If you generate a report, the results (not the media) are saved to your history so you can download it again.",
  },
  {
    q: "What does the signed report prove?",
    a: "The report is hashed with SHA-256 and signed with an Ed25519 key. If anyone edits the report afterwards, the signature no longer matches.",
  },
  {
    q: "Which files can I upload?",
    a: "Video: MP4, MOV, AVI. Audio: MP3, WAV, FLAC, OGG, M4A, AAC, WMA, WEBM.",
  },
];

export default function Faq() {
  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
        <p className="eyebrow mb-5 text-signal">08&nbsp;&nbsp;Before you rely on it</p>
        <h2 className="display text-5xl sm:text-6xl">
          What TruthLayer
          <br />
          <em>can&apos;t</em> do.
        </h2>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {LIMITS.map((l) => (
            <div key={l.title} className="rounded-2xl border-[1.5px] border-white/20 p-6">
              <p className="font-display text-xl font-extrabold">{l.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-paper/70">{l.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <p className="eyebrow text-signal">Questions</p>
          <div className="divide-y divide-white/15 border-y border-white/15">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                  {f.q}
                  <Plus className="h-5 w-5 flex-none transition-transform group-open:rotate-45" />
                </summary>
                <p className="mt-3 max-w-2xl text-paper/70">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
