"use client";

import { motion } from "motion/react";
import { ShieldAlert, FileSearch, CheckCircle2, UploadCloud } from "lucide-react";
import Link from "next/link";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16">
        <div className="lg:w-1/3 sticky top-32 h-fit">
          <div className="text-xs font-bold tracking-widest text-green-500 uppercase mb-4 border border-green-500/30 inline-block px-2 py-1 rounded">How it works</div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Forensic analysis in three steps</h2>
          <p className="text-gray-400 mb-8">
            Upload any suspicious media and let our AI agents uncover the truth.
          </p>
          <Link href="/dashboard" className="btn-green inline-block px-6 py-3 rounded bg-green-500/10 border border-green-500 text-green-500 font-medium hover:bg-green-500 hover:text-black transition-all">
            Start Analysis
          </Link>
        </div>

        <div className="lg:w-2/3 flex flex-col gap-12">
          {/* Step 1 */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="bg-[#111] border border-white/5 rounded-2xl p-8"
          >
            <h3 className="text-2xl font-bold mb-4">1. Upload Media or Paste Link</h3>
            <p className="text-gray-400 text-sm mb-8">
              Upload a video, audio file, or image. You can also paste a link from YouTube, Instagram, or X, and we'll download it for analysis.
            </p>
            <div className="bg-black rounded-xl p-8 border border-white/5 flex flex-col items-center justify-center text-gray-500 border-dashed">
              <UploadCloud className="w-10 h-10 mb-4 text-green-500/70" />
              <div className="text-sm">Drag and drop files here</div>
              <div className="text-xs mt-2">MP4, MP3, WAV, JPG, PNG</div>
            </div>
          </motion.div>

          {/* Step 2 */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="bg-[#111] border border-white/5 rounded-2xl p-8"
          >
            <h3 className="text-2xl font-bold mb-4">2. Deepfake Forensic Pipeline</h3>
            <p className="text-gray-400 text-sm mb-8">
              Our system splits the media into 5-second chunks, analyzing face authenticity, eye blink patterns, lip sync, and audio frequency irregularities.
            </p>
            <div className="flex items-center justify-center gap-4 py-8">
              <FileSearch className="w-12 h-12 text-yellow-500" />
              <div className="w-16 h-px bg-gradient-to-r from-yellow-500 to-green-500" />
              <ShieldAlert className="w-12 h-12 text-green-500" />
            </div>
          </motion.div>

          {/* Step 3 */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="bg-[#111] border border-white/5 rounded-2xl p-8"
          >
            <h3 className="text-2xl font-bold mb-4">3. Verdict & Evidence Report</h3>
            <p className="text-gray-400 text-sm mb-8">
              Two AI agents debate the findings to produce a final Truth Score. View the interactive timeline and download a forensic PDF report.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-4 bg-black p-3 rounded-lg border border-white/5">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div className="text-sm">Truth Score: 98/100 (Authentic)</div>
              </div>
              <div className="flex items-center gap-4 bg-black p-3 rounded-lg border border-white/5">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <div className="text-sm">Truth Score: 12/100 (Fake)</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
