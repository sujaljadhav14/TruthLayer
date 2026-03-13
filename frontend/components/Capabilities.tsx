"use client";

import { motion } from "motion/react";
import { Activity, Settings, Shield, Globe, Zap } from "lucide-react";

export default function Capabilities() {
  return (
    <section id="capabilities" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="text-xs font-bold tracking-widest text-green-500 uppercase mb-4 border border-green-500/30 inline-block px-2 py-1 rounded">Advanced Capabilities</div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Automate protection.<br/>Customize everything.</h2>
          <p className="text-gray-400">
            These advanced capabilities give you the automation, flexibility, and resilience needed to stay ahead of evolving threats.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Large card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-2 bg-[#111] border border-white/5 rounded-2xl p-8 overflow-hidden relative"
          >
            <div className="relative z-10 max-w-md">
              <div className="text-xs text-gray-500 mb-2">Adaptive security layers</div>
              <h3 className="text-2xl font-bold mb-3">Built to grow with you</h3>
              <p className="text-gray-400 text-sm">
                Whether you're scaling from 5 to 500 endpoints, Protex adapts its architecture dynamically, from cloud-native microservices to enterprise-grade defense policies.
              </p>
            </div>
            {/* Abstract visual */}
            <div className="absolute right-0 bottom-0 opacity-50 pointer-events-none">
              <div className="w-64 h-64 border border-green-500/20 rounded-full absolute -right-10 -bottom-10" />
              <div className="w-48 h-48 border border-green-500/40 rounded-full absolute right-0 bottom-0" />
            </div>
          </motion.div>

          {/* Small card 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-[#111] border border-white/5 rounded-2xl p-8"
          >
            <Activity className="w-6 h-6 text-green-500 mb-6" />
            <h3 className="text-lg font-bold mb-2">Behavioral anomaly detection</h3>
            <p className="text-gray-400 text-sm">Detects subtle deviations in user and system behavior.</p>
          </motion.div>

          {/* Small card 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-[#111] border border-white/5 rounded-2xl p-8"
          >
            <Settings className="w-6 h-6 text-green-500 mb-6" />
            <h3 className="text-lg font-bold mb-2">Modular rule engine</h3>
            <p className="text-gray-400 text-sm">Customize how your system reacts — with building blocks for threat response logic.</p>
          </motion.div>

          {/* Small card 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-[#111] border border-white/5 rounded-2xl p-8"
          >
            <Globe className="w-6 h-6 text-green-500 mb-6" />
            <div className="text-xs text-gray-500 mb-1">Unified visibility. Global protection.</div>
            <h3 className="text-lg font-bold mb-2">Multi-region awareness</h3>
            <p className="text-gray-400 text-sm">Stay protected across locations, clouds and teams.</p>
          </motion.div>

          {/* Small card 4 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="md:col-span-2 bg-[#111] border border-white/5 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8"
          >
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">Always up to date. Always secure.</div>
              <h3 className="text-2xl font-bold mb-3">Zero config maintenance</h3>
              <p className="text-gray-400 text-sm">
                Forget manual patching or policy tuning. Our pro tier keeps everything current and resilient. Without your team lifting a finger.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="px-4 py-2 rounded-full border border-green-500/30 text-green-500 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" /> Self-heal
              </div>
              <div className="px-4 py-2 rounded-full border border-green-500/30 text-green-500 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" /> Auto-fix
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
