import React from "react";
import { motion } from "framer-motion";

const StepProcess = () => {
  const steps = [
    {
      id: "01",
      title: "Choose a hub",
      desc: "Select from our verified network of 5,000+ niche-relevant publishers.",
      color: "bg-brand-indigo",
    },
    {
      id: "02",
      title: "Select a publisher",
      desc: "Review metrics, traffic, and audience data to find your perfect match.",
      color: "bg-brand-green",
    },
    {
      id: "03",
      title: "Verify & Go Live",
      desc: "Our automated sequences handle the rest. Track your link go live in real-time.",
      color: "bg-brand-indigo",
    },
  ];

  return (
    <section className="py-40 px-4 bg-gray-900 text-white relative overflow-hidden">
      {/* Visual Accents - Parity with Figma Dark Theme */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(51,31,253,0.2)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(36,232,28,0.15)_0%,transparent_50%)]" />

      <div className="max-w-[1440px] mx-auto relative z-10">
        <div className="text-center mb-40">
          <h2 className="text-[44px] md:text-[64px] font-sora font-black tracking-[-0.05em] leading-[1] mb-6">
            The 3-Step Process
          </h2>
          <p className="text-xl text-white/40 font-medium font-inter max-w-xl mx-auto">
            Simplified procurement. Enhanced results. Zero stress.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-24 relative">
          {/* High Fidelity Connector Line */}
          <div className="hidden md:block absolute top-[65px] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: i * 0.2,
                duration: 1,
                ease: [0.16, 1, 0.3, 1],
              }}
              viewport={{ once: true }}
              className="flex flex-col items-center text-center group"
            >
              <div className="relative mb-16">
                <div
                  className={`w-[130px] h-[130px] rounded-full ${step.color} flex flex-col items-center justify-center shadow-[0_0_80px_-10px_rgba(51,31,253,0.5)] group-hover:scale-110 transition-transform duration-700 ring-[12px] ring-white/5 relative z-10`}
                >
                  <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/50 mb-1 font-inter">
                    Step
                  </span>
                  <span className="text-[52px] font-black font-sora tracking-[-0.05em] leading-[1]">
                    {step.id}
                  </span>
                </div>
                {/* Orbital Geometric Decoration */}
                <div className="absolute -inset-6 border border-white/5 rounded-full animate-[spin_30s_linear_infinite]" />
                <div className="absolute -inset-10 border border-white/5 rounded-full animate-[spin_45s_linear_infinite_reverse]" />
              </div>

              <h3 className="text-3xl font-sora font-black mb-6 tracking-tight group-hover:text-brand-green transition-colors duration-500">
                {step.title}
              </h3>
              <p className="text-white/40 leading-relaxed font-medium font-inter text-base max-w-xs">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StepProcess;
