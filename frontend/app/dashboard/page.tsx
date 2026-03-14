"use client";

import { useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { ArrowRight, FileSearch, History, Zap, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

const emptySubscribe = () => () => {};

export default function DashboardHome() {
  const { user } = useUser();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const getGreeting = () => {
    if (!mounted) return "Welcome";
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Greeting Section */}
      <div className="text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2"
        >
          {getGreeting()}, {mounted ? (user?.firstName ?? "User") : "User"}!
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-gray-400"
        >
          How can TruthLayer help you today?
        </motion.p>
      </div>

      {/* Main Action Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link 
            href="/dashboard/analyze"
            className="block h-full bg-[#111] border border-white/10 rounded-3xl p-8 text-white hover:border-green-500/50 hover:bg-[#151515] transition-all group relative overflow-hidden"
          >
            {/* Decorative circles */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-500/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-green-500/5 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 border border-green-500/20">
                <FileSearch className="w-7 h-7 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Start Forensic Analysis</h2>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Upload video, audio, or images to detect deepfakes and generate a comprehensive forensic report.
              </p>
              <div className="flex items-center gap-2 text-sm font-bold text-green-500 tracking-wide group-hover:gap-4 transition-all">
                Start Now <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link 
            href="/dashboard/history"
            className="block h-full bg-[#111] border border-white/10 rounded-3xl p-8 hover:border-white/20 hover:bg-[#151515] transition-all group relative overflow-hidden"
          >
            {/* Decorative circle */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                <History className="w-7 h-7 text-gray-300" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">View Previous Reports</h2>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Access saved forensic history, inspect heatmap findings, and download PDF reports.
              </p>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-300 tracking-wide group-hover:gap-4 transition-all">
                View All <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Insights Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[#111] border border-white/10 rounded-3xl p-8"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
            <Zap className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Platform Insights</h3>
            <p className="text-sm text-gray-400">Latest updates and security tips</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
            <ShieldCheck className="w-5 h-5 text-amber-500 mb-4" />
            <p className="text-sm text-gray-400 leading-relaxed">
              Always verify the source of the media before running forensic analysis.
            </p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
            <AlertCircle className="w-5 h-5 text-amber-500 mb-4" />
            <p className="text-sm text-gray-400 leading-relaxed">
              Deepfake detection models are updated weekly to counter new generation techniques.
            </p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
            <FileSearch className="w-5 h-5 text-amber-500 mb-4" />
            <p className="text-sm text-gray-400 leading-relaxed">
              Use the timeline view in reports to pinpoint exactly where manipulation occurs.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
