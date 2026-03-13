"use client";

import { motion } from "motion/react";
import { CheckCircle2, Plus } from "lucide-react";

export default function Contact() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16">
        <div className="lg:w-1/2">
          <div className="text-xs font-bold tracking-widest text-green-500 uppercase mb-4 border border-green-500/30 inline-block px-2 py-1 rounded">Contact</div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Stay aheads of threats</h2>
          <p className="text-gray-400 mb-8">Deploy in one click. No setup. No stress.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-12">
            {["SOC 2 Ready", "No credit card needed", "EU-hosted", "Cancel anytime", "GDPR Compliant", "Setup in minutes"].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-300 border border-white/10 rounded-full px-4 py-2 w-fit">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {item}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {["Do I need to install anything?", "Can I try it without a credit card?", "Is my data stored in the EU?"].map((q, i) => (
              <div key={i} className="border border-white/10 rounded-lg p-4 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors">
                <span className="font-medium">{q}</span>
                <Plus className="w-5 h-5 text-gray-500" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:w-1/2">
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#111] border border-white/5 rounded-2xl p-8 flex flex-col gap-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
              <input type="text" className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
              <input type="email" className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Message</label>
              <textarea rows={4} className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors resize-none" placeholder="Type your message..." />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="terms" className="w-4 h-4 accent-green-500" />
              <label htmlFor="terms" className="text-sm text-gray-400">I accept the Terms & conditions.</label>
            </div>
            <button type="button" className="w-full py-3 rounded bg-green-500/10 border border-green-500 text-green-500 font-medium hover:bg-green-500 hover:text-black transition-all">
              Submit
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
