"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    desc: "Ideal for early-stage builders who want to launch fast with enterprise-grade protection.",
    price: "$180",
    features: ["Basic protection", "1 project", "Email alerts", "Manual scans", "Community support"]
  },
  {
    name: "Growth",
    desc: "Built for startups that need reliable, scalable security without slowing down growth.",
    price: "$470",
    highlight: true,
    features: ["Everything Starter, plus:", "Advanced protection", "Up to 10 projects", "Email + slack alerts", "Auto scans", "Standard support"]
  },
  {
    name: "Enterprise",
    desc: "Designed for teams that prioritize robust security, compliance, and resilience.",
    price: "$950",
    features: ["Everything Growth, plus:", "Full-scale coverage", "Unlimited projects", "Custom integrations", "Dedicated support", "Priority SLA support"]
  }
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`bg-[#111] border rounded-2xl p-8 flex flex-col ${plan.highlight ? 'border-green-500/50 relative' : 'border-white/5'}`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-gray-400 text-sm mb-6 h-10">{plan.desc}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-gray-500 text-sm"> /year</span>
                <div className="text-xs text-green-500 mt-1">(save 20%)</div>
              </div>
              <button className={`w-full py-3 rounded font-medium mb-8 transition-colors ${plan.highlight ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-white/5 hover:bg-white/10'}`}>
                Get started
              </button>
              <ul className="space-y-3 flex-grow">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-gray-300">
                    <Check className="w-5 h-5 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
