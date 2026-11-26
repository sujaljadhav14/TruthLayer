/*
 * The landing page's "evidence exhibit" illustration. One SVG whose state
 * changes with the scroll story:
 *   0 idle scan · 1 file arrives · 2 suspicious region found · 3 verdict stamp · 4 signed report
 * Animated with CSS transitions on transforms/opacity (cheap, no JS per frame).
 */

import { useId, type CSSProperties } from "react";

const INK = "#0c0f0d";
const PAPER = "#fffdf8";
const ALERT = "#ff4b3e";
const SIGNAL = "#2bd46b";

const BARS = 34;
const X0 = 58;
const STEP = 9.4;
const SUSPECT = [19, 27]; // bar index range that turns red
const TL_X = 44;
const TL_W = 324;

// Deterministic, speech-like bar heights
const HEIGHTS = Array.from({ length: BARS }, (_, i) => {
  const env = 0.35 + 0.65 * Math.abs(Math.sin(i * 0.33) * Math.cos(i * 0.11));
  const jitter = (Math.sin(i * 12.9898) * 43758.5453) % 1;
  return 18 + Math.round(env * 92 + Math.abs(jitter) * 26);
});

const LENS = [
  { x: 150, y: 252 },
  { x: 300, y: 190 },
  { x: X0 + 23 * STEP, y: 252 },
  { x: 318, y: 330 },
  { x: 318, y: 318 },
];

const EASE = "cubic-bezier(.2,.8,.2,1)";
const move = (x: number, y: number): CSSProperties => ({
  transform: `translate(${x}px, ${y}px)`,
  transition: `transform 900ms ${EASE}`,
});
const fade = (on: boolean, delay = 0): CSSProperties => ({
  opacity: on ? 1 : 0,
  transition: `opacity 400ms ease ${delay}ms`,
});

function Bars({ s, zoom = 1 }: { s: number; zoom?: number }) {
  return (
    <>
      {HEIGHTS.map((h, i) => {
        const suspect = s >= 2 && i >= SUSPECT[0] && i <= SUSPECT[1];
        const hh = h * zoom;
        return (
          <rect
            key={i}
            x={X0 + i * STEP - (zoom - 1) * 4}
            y={252 - hh / 2}
            width={5.4 * zoom + (zoom - 1) * 2}
            height={hh}
            rx={2.7 * zoom}
            style={{ fill: suspect ? ALERT : INK, transition: `fill 500ms ease ${(i - SUSPECT[0]) * 30}ms` }}
          />
        );
      })}
    </>
  );
}

export default function ScannerArt({ stage = 0, className = "" }: { stage?: number; className?: string }) {
  const s = Math.max(0, Math.min(4, stage));
  const lens = LENS[s];
  const mono = "var(--font-jetbrains), monospace";
  // Unique ids per instance: the page renders a mobile and a desktop copy, and a
  // duplicate clipPath id would resolve to the hidden copy (breaking the clip).
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const dots = `tl-dots-${uid}`;
  const dotsGreen = `tl-dots-green-${uid}`;
  const clip = `tl-lens-clip-${uid}`;

  return (
    <svg viewBox="0 0 420 520" className={className} role="img" aria-label="Illustration: a magnifying lens inspecting an audio waveform">
      <defs>
        <pattern id={dots} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.25" fill={INK} />
        </pattern>
        <pattern id={dotsGreen} width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="1.1" fill={SIGNAL} />
        </pattern>
        {/* Circle at the origin; the lens group is translated, so this follows it */}
        <clipPath id={clip}>
          <circle cx="0" cy="0" r="56" />
        </clipPath>
      </defs>

      {/* Exhibit card with hard shadow */}
      <rect x="30" y="34" width="372" height="468" rx="20" fill={INK} />
      <rect x="20" y="22" width="372" height="468" rx="20" fill={PAPER} stroke={INK} strokeWidth="3" />

      {/* Card header */}
      <line x1="20" y1="72" x2="392" y2="72" stroke={INK} strokeWidth="3" />
      <text x="42" y="54" fontFamily={mono} fontSize="12" fontWeight="600" letterSpacing="2" fill={INK}>
        EXHIBIT A
      </text>
      <text x="372" y="54" textAnchor="end" fontFamily={mono} fontSize="12" fill={INK} style={fade(s >= 1)}>
        voice_note.m4a · 0:24
      </text>

      {/* Halftone panel behind waveform */}
      <rect x="42" y="150" width="328" height="204" rx="12" fill={`url(#${dots})`} opacity="0.12" />

      <Bars s={s} />

      {/* Scan line (CSS keyframes in globals.css) */}
      <line x1="50" x2="50" y1="150" y2="354" stroke={SIGNAL} strokeWidth="3" className="tl-scan" style={fade(s === 0 || s === 2)} />

      {/* Timeline strip */}
      <rect x="42" y="384" width="328" height="16" rx="8" fill={PAPER} stroke={INK} strokeWidth="2.5" />
      <rect
        x={TL_X} y="386" width={TL_W} height="12" rx="6" fill={SIGNAL}
        style={{ transform: `scaleX(${s >= 1 ? 1 : 0})`, transformOrigin: `${TL_X}px 0`, transformBox: "view-box", transition: `transform 800ms ${EASE}` }}
      />
      <rect
        x={TL_X + (SUSPECT[0] / BARS) * TL_W} y="386" height="12"
        width={((SUSPECT[1] - SUSPECT[0] + 1) / BARS) * TL_W} fill={ALERT}
        style={fade(s >= 2, 200)}
      />
      <text x="42" y="420" fontFamily={mono} fontSize="11" fill={INK} opacity="0.6">0:00</text>
      <text x="370" y="420" textAnchor="end" fontFamily={mono} fontSize="11" fill={INK} opacity="0.6">0:24</text>

      {/* Signed-report strip */}
      <g style={fade(s >= 4, 150)}>
        <rect x="42" y="438" width="328" height="34" rx="8" fill={INK} />
        <circle cx="62" cy="455" r="8" fill={SIGNAL} />
        <path d="M58 455 l3 3 l5 -6" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <text x="80" y="459" fontFamily={mono} fontSize="11" fill={PAPER} letterSpacing="1">
          SIGNED · ED25519 · SHA-256 3f9a…c21e
        </text>
      </g>

      {/* Magnifying lens: zoomed halftone view inside, thick ink ring, handle */}
      <g style={move(lens.x, lens.y)}>
        <g clipPath={`url(#${clip})`}>
          <g style={move(-lens.x, -lens.y)}>
            <rect x="0" y="0" width="420" height="520" fill={PAPER} />
            <rect x="0" y="0" width="420" height="520" fill={`url(#${dotsGreen})`} opacity="0.55" />
            <Bars s={s} zoom={1.15} />
          </g>
        </g>
        <line x1="40" y1="40" x2="84" y2="84" stroke={INK} strokeWidth="16" strokeLinecap="round" />
        <circle r="56" fill="none" stroke={INK} strokeWidth="11" />
      </g>

      {/* Verdict stamp */}
      <g
        style={{
          opacity: s >= 3 ? 1 : 0,
          transform: s >= 3 ? "scale(1)" : "scale(1.7)",
          transformOrigin: "200px 118px",
          transformBox: "view-box",
          transition: `opacity 250ms ease, transform 450ms cubic-bezier(.3,1.6,.5,1)`,
        }}
      >
        <g transform="rotate(-7 200 118)">
          <rect x="70" y="88" width="260" height="62" rx="8" fill={PAPER} stroke={ALERT} strokeWidth="4" />
          <rect x="77" y="95" width="246" height="48" rx="5" fill="none" stroke={ALERT} strokeWidth="1.5" />
          <text x="200" y="125" textAnchor="middle" fontFamily="var(--font-archivo), sans-serif" fontWeight="900" fontSize="23" letterSpacing="1.5" fill={ALERT}>
            AI-GENERATED
          </text>
          <text x="200" y="139" textAnchor="middle" fontFamily={mono} fontSize="9.5" letterSpacing="1.5" fill={ALERT}>
            87% LIKELY · 3 REASONS
          </text>
        </g>
      </g>
    </svg>
  );
}
