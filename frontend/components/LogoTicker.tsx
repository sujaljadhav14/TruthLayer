"use client";

import { motion } from "motion/react";

const logos = [
  "Flowbyte", "CipherCloud", "Novastack", "Zunapulse", "Flowbyte", "CipherCloud"
];

export default function LogoTicker() {
  return (
    <section className="py-20 border-b border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-8 text-center">
        <p className="text-sm text-gray-500 font-medium uppercase tracking-widest">
          Securing the World's Fastest-Growing Companies
        </p>
      </div>
      <div className="flex whitespace-nowrap relative">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
          className="flex gap-16 px-8 items-center"
        >
          {[...logos, ...logos, ...logos].map((logo, i) => (
            <div key={i} className="flex items-center gap-2 text-xl font-bold text-gray-600">
              <div className="w-6 h-6 rounded bg-gray-800" /> {/* Placeholder for logo icon */}
              {logo}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
