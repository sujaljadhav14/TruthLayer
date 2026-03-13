"use client";

import { motion } from "motion/react";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Markus Lenz",
    role: "Head of Security",
    company: "Ledgerly",
    content: "We switched from a bloated enterprise solution to Protex, and got better visibility with half the complexity.",
  },
  {
    name: "Jason Mehta",
    role: "DevOps Lead",
    company: "Flowbyte",
    content: "The setup was almost too easy. Our team had real-time protection running before the coffee machine even booted.",
  },
  {
    name: "Thomas Karl",
    role: "Founder",
    company: "Zunapulse",
    content: "I'm not a security expert, but with Protex I don't have to be. It just works — and keeps working.",
  },
  {
    name: "Lina Rodriguez",
    role: "CTO",
    company: "Novastack",
    content: "Protex flagged a critical misconfig in our staging server within minutes. That alone saved us from a potential breach.",
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 px-6 border-y border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs font-bold tracking-widest text-green-500 uppercase mb-4 border border-green-500/30 inline-block px-2 py-1 rounded">Testimonials</div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Trusted by teams<br/>that move fast</h2>
          <p className="text-gray-400">Tech teams rely on our platform to stay protected while they scale.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#111] border border-white/5 rounded-2xl p-6 flex flex-col"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-green-500 text-green-500" />
                ))}
              </div>
              <p className="text-gray-300 text-sm flex-grow mb-6">"{t.content}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-800" />
                <div>
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.role}, {t.company}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
