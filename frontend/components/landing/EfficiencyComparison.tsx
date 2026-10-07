import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Zap } from "lucide-react";
import { Card } from "@/components/ui/Card";

const EfficiencyComparison = () => {
  return (
    <section className="py-40 px-4 bg-white relative overflow-hidden">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-between mb-32 gap-10">
          <h2 className="text-[44px] md:text-[60px] font-sora font-black tracking-[-0.05em] leading-[1.1] text-gray-900 max-w-2xl text-balance">
            Why build links manually <br />
            when you can{" "}
            <span className="text-brand-indigo font-sora">Backlyst?</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-400 font-medium font-inter max-w-md leading-relaxed lg:text-right">
            Stop wasting time on spreadsheets and manual outreach. Scale your
            authority intelligently.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          {/* THE OLD WAY */}
          <Card className="lg:col-span-5 border-none bg-gray-50/70 p-12 md:p-16 rounded-[48px] shadow-sm relative overflow-hidden group">
            <div className="relative z-10 flex flex-col h-full">
              <div className="inline-flex items-center gap-2 mb-12 text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">
                THE OLD WAY
              </div>

              <h3 className="text-[32px] md:text-[40px] font-sora font-black mb-12 tracking-[-0.03em] leading-[1.2] text-gray-900">
                Why waste time and money when you can{" "}
                <span className="text-brand-green">Backlyst?</span>
              </h3>

              <div className="space-y-12 flex-1">
                {[
                  {
                    label: "MANUAL OUTREACH",
                    val: "24 Hours/Link",
                    percent: "90%",
                  },
                  { label: "BROKEN LINKS", val: "15% Failure", percent: "75%" },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      <span>{item.label}</span>
                      <span className="text-gray-900">{item.val}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: item.percent }}
                        transition={{
                          duration: 1.5,
                          ease: "circOut",
                          delay: i * 0.2,
                        }}
                        className="h-full bg-gray-300 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-20 p-8 rounded-[32px] bg-white border border-gray-100 shadow-[0_24px_48px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row items-center gap-6 transform transition-all duration-700 group-hover:scale-[1.03] group-hover:shadow-2xl group-hover:shadow-gray-900/5">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 border-[3px] border-white shadow-lg shrink-0">
                  <img
                    src="/ca269fff9961afb9c6a84bffddcb988a6fad7166.png"
                    alt="User"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-lg font-bold text-gray-900 font-sora tracking-tight leading-snug">
                    &quot;Manual outreach is killing our efficiency and bottom
                    line.&quot;
                  </p>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2">
                    NATALI CRAIG, SEO LEAD
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* WITH BACKLYST */}
          <Card className="lg:col-span-7 border-none bg-brand-indigo p-12 md:p-20 rounded-[48px] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-[100px] -z-10" />

            <div className="relative z-10 flex flex-col h-full text-white">
              <div className="inline-flex items-center gap-2 mb-14 text-white/50 font-black uppercase tracking-[0.2em] text-[10px]">
                WITH BACKLYST
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-14">
                {[
                  "Verified Publishers",
                  "Automated Outreach",
                  "Success Track",
                  "Live ROI Performance",
                  "Link Replacement",
                  "Fast-Track Growth",
                  "Unlimited Access",
                  "Priority Support",
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-default"
                  >
                    <CheckCircle2
                      size={20}
                      className="text-brand-green shrink-0"
                    />
                    <span className="text-base font-bold tracking-tight">
                      {item}
                    </span>
                  </motion.div>
                ))}
              </div>

              <p className="mb-20 text-white/40 text-lg font-medium font-inter leading-relaxed max-w-xl">
                Experience the power of intelligence. We don&apos;t just build
                links; we scale your digital authority with data-driven
                precision and full automation.
              </p>

              <div className="p-8 rounded-[32px] bg-white/10 border border-white/10 backdrop-blur-3xl flex flex-col sm:flex-row items-center gap-6 mt-auto transform transition-all duration-700 hover:bg-white/15 hover:scale-[1.02]">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/10 border-[3px] border-white/20 shadow-2xl shrink-0">
                  <img
                    src="/67da9fddd372b1b5b44ffef41eed6ceb810ddf8a.png"
                    alt="User"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xl font-bold font-sora tracking-tight leading-snug text-white">
                    &quot;Performance boosted by 300% since switching to
                    Backlyst.&quot;
                  </p>
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mt-3 italic">
                    OLIVIA RHYE, ELITE SEO EXPERT
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default EfficiencyComparison;
