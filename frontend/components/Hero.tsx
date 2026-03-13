"use client";

import { motion } from "motion/react";
import { ScanEye } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-[#050505]">
      {/* Background Grid Animation — GPU-accelerated with will-change */}
      <div className="absolute inset-0 z-0 flex items-center justify-center will-change-transform">
        {/* Static base grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00ff002a_2px,transparent_2px),linear-gradient(to_bottom,#00ff002a_2px,transparent_2px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50" />

        {/* Scaling grid rings — use CSS transform only (GPU composited) */}
        <motion.div
          animate={{ scale: [0.5, 3], opacity: [0, 0.5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-[linear-gradient(to_right,#00ff004a_2px,transparent_2px),linear-gradient(to_bottom,#00ff004a_2px,transparent_2px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] will-change-transform"
          style={{ willChange: 'transform, opacity' }}
        />
        <motion.div
          animate={{ scale: [0.5, 3], opacity: [0, 0.5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 2.5 }}
          className="absolute inset-0 bg-[linear-gradient(to_right,#00ff004a_2px,transparent_2px),linear-gradient(to_bottom,#00ff004a_2px,transparent_2px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] will-change-transform"
          style={{ willChange: 'transform, opacity' }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 mb-8"
        >
          <ScanEye className="w-4 h-4 text-green-500" />
          Digital Media Trust Platform
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-6xl md:text-8xl font-extrabold tracking-tight leading-[1.1] mb-6"
        >
          Uncover the truth <br className="hidden md:block" />
          <span className="text-gray-400">behind digital media</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto"
        >
          Detect deepfakes in video, audio, and images. Explain where manipulation occurs, and generate forensic evidence reports.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/dashboard" className="btn-green px-8 py-3 rounded bg-green-500 text-black font-medium hover:bg-green-400 transition-all">
            Go to Dashboard
          </Link>
          <a href="#how-it-works" className="btn-outline px-8 py-3 rounded text-white font-medium hover:bg-white/5 transition-all border border-white/10">
            How it works
          </a>
        </motion.div>
      </div>
      
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent z-10" />
    </section>
  );
}
