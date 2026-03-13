"use client";

import { motion } from "motion/react";
import { Radar, Eye, Puzzle } from "lucide-react";

const features = [
  {
    icon: <Radar className="w-8 h-8 text-green-500" />,
    label: "Instant visibility. Instant action.",
    title: "Real-time threat detection",
    description: "Suspicious behavior gets flagged the second it appears. No lag. No noise.",
  },
  {
    icon: <Eye className="w-8 h-8 text-green-500" />,
    label: "See everything. Miss nothing.",
    title: "Zero blind spots",
    description: "Full visibility into every endpoint, request, and action. If it moves, we see it.",
  },
  {
    icon: <Puzzle className="w-8 h-8 text-green-500" />,
    label: "Plug into your stack. Fast.",
    title: "Seamless integration",
    description: "Connect in minutes. Works with the tools you already use, right out of the box.",
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-6 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <div className="text-xs font-bold tracking-widest text-green-500 uppercase mb-4 border border-green-500/30 inline-block px-2 py-1 rounded">Features</div>
            <h2 className="text-4xl md:text-5xl font-bold">Build to protect every layer</h2>
          </div>
          <p className="text-gray-400 max-w-sm">
            From backend to browser, every part of your stack stays locked down.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-[#111] border border-white/5 rounded-2xl p-8 hover:border-green-500/30 transition-colors group"
            >
              <div className="w-16 h-16 rounded-xl bg-green-500/10 flex items-center justify-center mb-12 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <div className="text-xs text-gray-500 mb-2">{feature.label}</div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
