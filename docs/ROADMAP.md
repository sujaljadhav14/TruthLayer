# TruthLayer roadmap

Single source of truth for **what's done, what's in progress, and what to do next**.
Every session (human or AI) that changes code must update this file before finishing:
move items between sections and add a dated line to the changelog at the bottom.
Project context and rules live in [`../CLAUDE.md`](../CLAUDE.md).

---

## Status snapshot (2026-11-26)

- Backend: FastAPI app with video (ResNeXt50+LSTM + Grad-CAM), 8-step audio pipeline, signed reports,
  share links, complaints. AI debate exists but isn't shown in the UI.
- Frontend: Next.js + Clerk. Landing, dashboard home, analyze (video/audio), history, complaint, shared report.
- Tests: 12 backend tests (`backend/tests`), no frontend tests. CI runs backend tests + TypeScript check.
- **Accuracy has not been measured on a real labelled dataset yet** — thresholds were calibrated on a
  handful of clips. This is the biggest open risk.

## In progress

- [ ] **Check the app end-to-end with a real session.** All pages were type-checked, linted and looked at
  with mocked data, but not yet with a signed-in user and the backend + models running.
- [ ] Claim the Clerk keys and set the app name to "TruthLayer" in the Clerk dashboard (keyless mode shows
  "Sign in to My Application").

## Next up (priority order)

1. **Measure accuracy.** Collect ~50 real + ~50 fake clips (e.g. ASVspoof / In-the-Wild / own recordings +
   ElevenLabs/PlayHT samples), run `python backend/scripts/evaluate_audio.py --data <dir>`, record results here.
   Then tune `TRUTHLENS_*` thresholds and the `W_*` weights from data, not by eye.
2. **"Try a sample" button** on the analyze page with one real + one fake clip we have rights to ship
   (record our own; generate the fake with a TTS tool whose terms allow it). Lets judges test instantly.
3. **Real progress during analysis.** Today the bar is simulated. Option: background job + `GET /jobs/{id}`
   polling that reports the current pipeline step.
4. Split `frontend/app/dashboard/analyze/page.tsx` further (upload flow vs. results) and add a component test.
5. Image deepfake detection — only if there is time; until then never claim it in copy.
6. Bring the AI debate back into the UI (needs Ollama fallback/mocks so it doesn't break without a local LLM).
7. Docker: `backend/Dockerfile` + `docker-compose.yml` with a `model_cache` volume; `scripts/prefetch_models.py`
   already downloads the video weights.
8. Production hardening: move the Ed25519 signing key out of `backend/generated_reports/` into a secret
   store; rate-limit uploads; validate file size server-side.

## Known issues / notes

- `resemblyzer` (speaker consistency) is optional and not in `requirements.txt` — on Windows it needs C++
  build tools because it depends on source-only `webrtcvad`. Without it, speaker weight is redistributed to ML.
- The HF+CPP override (`freq_combined`) forces FAKE when two signals are high. It was calibrated on very few
  clips; it now also lifts the displayed fake % to ≥ 80% so the number matches the label. Re-check it in the
  accuracy run (item 1).
- WebRTC VAD pads speech regions by ~0.3 s on each side; that's expected.

## Done

- [x] **Redesign finished on the remaining views** (2026-11-26): reports history, complaint assistant,
      shared report (now a printed-style evidence document), sign-in / sign-up (shared `AuthShell`),
      heatmap panel and the save-report panel. Removed ~360 lines of old auth CSS, including a global
      `button:active` rule that overrode button styles everywhere.
- [x] Complaint emails no longer fall back to a hard-coded personal inbox when no authority email is
      entered; the draft button stays disabled until one is added. (2026-11-26)
- [x] Fixed two-column layouts on reports + complaint pages (`grid-cols-[a,b]` is invalid Tailwind,
      needs `_`). Uncertain reports get their own amber state everywhere. "File hash" relabelled
      "Report hash" (it hashes the report payload, not the media). Removed false claims from the auth
      pages (99.2% accuracy, court-admissible, end-to-end encrypted, image scans). (2026-11-26)
- [x] **UI redesign, Vigil-inspired** (reference https://getvigil.in) (2026-11-26):
      design tokens + fonts (Archivo / Inter / JetBrains Mono); landing rebuilt as a scroll story with a
      pinned "evidence exhibit" illustration (`components/landing/*`), honest sample report, "what we check"
      table, limits + FAQ; removed the blocking full-screen loader.
- [x] Results lead with a plain-English `VerdictSummary` (one number: chance it's AI-generated + top 3
      reasons); technical detail behind a toggle (`components/analysis/*`). Audio timeline + speech regions
      are positioned by real time (`ClipTimeline`). Fake random progress bar replaced by real elapsed time.
- [x] Dashboard shell + home restyled; home lists real recent reports from `/api/report/history`;
      removed fake notification bell, dead "Documentation" link and false "models updated weekly" tip.
- [x] Reports: audio confidence was saved on a 0-1 scale (PDF showed "0.9%"); "uncertain" audio was
      printed as "AUTHENTIC MEDIA VERIFIED" — now an amber "INCONCLUSIVE" state. TruthLens → TruthLayer
      branding in PDF/certificate/API titles; year fixed to 2026. (2026-11-26)
- [x] Audio: ML models score all detected speech (joined into one track) instead of skipping short phrases
      and capping at 8 segments; both models kept; timeline mapped back to real file times. (2026-11-26)
- [x] Audio: frequency signals run on the full file again (noise-floor needs silence). (2026-11-26)
- [x] Verdict can no longer contradict the score; user-facing verdict text (`AI-GENERATED` / `AUTHENTIC` /
      `UNCERTAIN`) plus `verdict_reason`. (2026-11-26)
- [x] Tests: end-to-end `detect()` with a fake model + helper tests (`backend/tests/test_audio_pipeline.py`). (2026-11-26)
- [x] CI: Python 3.12, light deps, no model downloads; frontend type check. (2026-11-26)
- [x] `webrtcvad-wheels` added to backend requirements. (2026-11-26)
- [x] Removed leftover template components from another product (Protex testimonials/pricing etc.),
      unused `AudioPanel.tsx`, `replace_port.py`; `SKILL.md` folded into `CLAUDE.md` + this file. (2026-11-26)
- [x] Speech-region summary + adjustable thresholds (VS Code agent, 2026-05-03).

---

## Changelog

- **2026-11-26** — Reviewed VS Code agent's audio branch; fixed 5 confirmed bugs (ML skipped on short
  speech, 8-segment cap, Model B dropped, unordered timeline, noise-floor on speech-only audio) and the
  verdict/score contradiction. Added CLAUDE.md + ROADMAP.md, new tests, CI rewrite, .gitignore cleanup.
  Then the Vigil-inspired UI redesign: new landing page, verdict summary on results, dashboard restyle,
  report fixes (confidence scale, uncertain state, branding). Merged both into `main`, then rebuilt the
  history as 12 medium-sized commits. Restyled the remaining views on `feature/dashboard-restyle`.
- **2026-05-03** — VS Code agent: speech-focused audio mode, speech regions UI, scripts, CI, SKILL.md.
- **2026-03-14** — README rewrite + screenshots.
