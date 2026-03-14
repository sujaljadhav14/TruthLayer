"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldAlert,
  ShieldCheck,
  Loader2,
  FileSearch,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle,
  FileText,
  Copy,
  Check,
} from "lucide-react";

type DebateRound = {
  round_number: number;
  prosecutor_argument: string;
  defender_argument: string;
};

type DebateResult = {
  analysis_id: string;
  provider: string;
  duration_ms: number;
  rounds: DebateRound[];
  total_rounds: number;
  verdict: string;
  confidence: number;
  truth_score: number;
  reasoning: string;
  prosecutor_strength: number;
  defender_strength: number;
  key_evidence: string[];
  error?: string;
};

type AnalysisData = {
  verdict: string;
  confidence: number;
  truth_score: number;
  scores: { label: string; score: number }[];
  filename: string;
};

// Strip markdown bold/italic markers from LLM output
function cleanText(text: string): string {
  return text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/__/g, "").replace(/_/g, " ").trim();
}

export default function DebatePanel({
  analysisData,
}: {
  analysisData: AnalysisData;
}) {
  const [debateResult, setDebateResult] = useState<DebateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (analysisData && !hasTriggered.current) {
      hasTriggered.current = true;
      triggerDebate();
    }
  }, [analysisData]);

  const triggerDebate = async () => {
    setLoading(true);
    setError(null);
    setDebateResult(null);

    try {
      const response = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_data: analysisData,
          rounds: 3,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Debate failed");
      }

      const result: DebateResult = await response.json();
      setDebateResult(result);
      if (result.rounds?.length > 0) setExpandedRound(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const toggleRound = (roundNum: number) => {
    setExpandedRound(expandedRound === roundNum ? null : roundNum);
  };

  const buildReportSummary = (): string => {
    if (!debateResult) return "";
    const l: string[] = [];
    l.push("AI FORENSIC DEBATE REPORT");
    l.push("=".repeat(40));
    l.push(`File: ${analysisData.filename}`);
    l.push(`ML Verdict: ${analysisData.verdict} (${analysisData.confidence}% confidence)`);
    l.push(`Debate Verdict: ${debateResult.verdict}`);
    l.push(`Truth Score: ${debateResult.truth_score}/100`);
    l.push(`Duration: ${(debateResult.duration_ms / 1000).toFixed(1)}s`);
    l.push("");
    l.push(`Reasoning: ${cleanText(debateResult.reasoning)}`);
    l.push(`Prosecutor: ${Math.round(debateResult.prosecutor_strength * 100)}%`);
    l.push(`Defender: ${Math.round(debateResult.defender_strength * 100)}%`);

    if (debateResult.key_evidence?.length > 0) {
      l.push("");
      l.push("Key Evidence:");
      debateResult.key_evidence.forEach((e, i) => l.push(`  ${i + 1}. ${cleanText(e)}`));
    }

    debateResult.rounds?.forEach((r) => {
      l.push("");
      l.push(`Round ${r.round_number}:`);
      l.push(`  Prosecutor: ${cleanText(r.prosecutor_argument)}`);
      l.push(`  Defender: ${cleanText(r.defender_argument)}`);
    });

    return l.join("\n");
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(buildReportSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111] border border-purple-500/20 rounded-3xl p-8"
      >
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">AI Debate in Progress</p>
            <p className="text-gray-400 text-sm mt-1">
              Prosecutor and Defender analyzing evidence...
            </p>
          </div>
          <div className="w-full max-w-sm mt-4 space-y-3">
            {[1, 2, 3].map((round) => (
              <div key={round} className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full bg-purple-500"
                  style={{ animation: `pulse 1.5s infinite ${round * 0.3}s` }}
                />
                <div className="h-2 flex-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-500/50 via-purple-500/50 to-green-500/50 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 4, delay: round * 2, ease: "easeInOut" }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-14">Round {round}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (error && !debateResult) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111] border border-red-500/20 rounded-3xl p-8"
      >
        <div className="flex items-start gap-4 mb-6">
          <AlertTriangle className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-400 font-bold">AI Debate Failed</p>
            <p className="text-red-400/70 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={() => { hasTriggered.current = false; triggerDebate(); }}
          className="w-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold py-3 rounded-2xl hover:bg-purple-500/20 transition-all"
        >
          Retry Debate
        </button>
      </motion.div>
    );
  }

  if (!debateResult) return null;

  const isSkipped = debateResult.provider === "skipped";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Verdict Card */}
      <div
        className={`relative overflow-hidden rounded-3xl border p-6 ${
          debateResult.verdict === "FAKE"
            ? "bg-red-500/5 border-red-500/20"
            : debateResult.verdict === "REAL"
              ? "bg-green-500/5 border-green-500/20"
              : "bg-yellow-500/5 border-yellow-500/20"
        }`}
      >
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl bg-purple-500/5" />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
              <ShieldCheck className="w-6 h-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  Judge&apos;s Verdict
                </h3>
                {!isSkipped && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 uppercase tracking-wider">
                    ollama
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {isSkipped
                  ? "AI debate skipped"
                  : `${debateResult.total_rounds} rounds in ${(debateResult.duration_ms / 1000).toFixed(1)}s`}
              </p>
            </div>

            <div
              className={`text-2xl font-black px-4 py-2 rounded-xl ${
                debateResult.verdict === "FAKE"
                  ? "bg-red-500/10 text-red-500 border border-red-500/30"
                  : debateResult.verdict === "REAL"
                    ? "bg-green-500/10 text-green-500 border border-green-500/30"
                    : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30"
              }`}
            >
              {debateResult.verdict}
            </div>
          </div>

          {/* Reasoning */}
          <p className="text-gray-300 text-sm leading-relaxed mb-4 bg-black/30 rounded-xl p-4 border border-white/5">
            {cleanText(debateResult.reasoning)}
          </p>

          {/* Strength meters */}
          {!isSkipped && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-red-400 font-medium flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Prosecutor
                  </span>
                  <span className="text-gray-400">
                    {Math.round(debateResult.prosecutor_strength * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${debateResult.prosecutor_strength * 100}%` }}
                    transition={{ duration: 1 }}
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-green-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Defender
                  </span>
                  <span className="text-gray-400">
                    {Math.round(debateResult.defender_strength * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${debateResult.defender_strength * 100}%` }}
                    transition={{ duration: 1 }}
                    className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Key Evidence — short points */}
          {debateResult.key_evidence?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Key Evidence
              </p>
              <div className="space-y-1.5">
                {debateResult.key_evidence.map((evidence, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                    <Zap className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                    {cleanText(evidence)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Copy Report */}
      {!isSkipped && (
        <button
          onClick={copyReport}
          className="w-full flex items-center justify-center gap-2 bg-[#111] border border-white/10 text-gray-300 font-medium py-3 rounded-2xl hover:bg-white/5 hover:text-white transition-all text-sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-green-400">Copied to Clipboard</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Forensic Report
            </>
          )}
        </button>
      )}

      {/* Debate Rounds — collapsed */}
      {!isSkipped && debateResult.rounds?.length > 0 && (
        <div className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <FileSearch className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-bold text-white">Debate Transcript</h3>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {debateResult.rounds.map((round) => (
              <div key={round.round_number}>
                <button
                  onClick={() => toggleRound(round.round_number)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-sm font-bold text-white">
                    Round {round.round_number}
                  </span>
                  {expandedRound === round.round_number ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                <AnimatePresence>
                  {expandedRound === round.round_number && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 grid md:grid-cols-2 gap-4">
                        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <ShieldAlert className="w-4 h-4 text-red-500" />
                            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                              Prosecutor
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {cleanText(round.prosecutor_argument)}
                          </p>
                        </div>

                        <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <ShieldCheck className="w-4 h-4 text-green-500" />
                            <span className="text-xs font-bold text-green-400 uppercase tracking-wider">
                              Defender
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {cleanText(round.defender_argument)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
