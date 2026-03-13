"use client";

import { motion } from "motion/react";

export default function ValueProp() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-3xl md:text-5xl font-medium leading-tight text-gray-400"
        >
          <span className="text-white">Security shouldn't feel like a chore.</span> With automated checks and adaptive defense, your systems stay protected, even while you sleep.
        </motion.h2>
      </div>
    </section>
  );
}
