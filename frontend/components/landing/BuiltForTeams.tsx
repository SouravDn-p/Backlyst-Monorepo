import React from "react";
import { motion } from "framer-motion";
import {
  Zap,
  ShieldCheck,
  BarChart3,
  Users,
  Globe,
  Target,
  Layers,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const BuiltForTeams = () => {
  const features = [
    {
      title: "Peer Marketshare",
      desc: "Identify where your competitors are winning and close the gap instantly.",
      icon: ShieldCheck,
      color: "text-brand-orange",
      bg: "bg-primary",
    },
    {
      title: "Leaderboard Tracking",
      desc: "Maximize your ROI by focusing on high-authority, low-competition assets.",
      icon: Zap,
      color: "text-brand-indigo",
      bg: "bg-brand-indigo-soft",
    },
    {
      title: "Benchmark Analytics",
      desc: "Real-time monitoring of your rankings across global and local markets.",
      icon: Globe,
      color: "text-brand-green-dark",
      bg: "bg-brand-green-soft",
    },
    {
      title: "Smart Focus Hiring",
      desc: "Automate recruiter outreach for niche link-building specialists.",
      icon: Users,
      color: "text-brand-orange",
      bg: "bg-primary",
    },
    {
      title: "Affiliate Marketing",
      desc: "Secure high-converting link placements on verified review platforms.",
      icon: Layers,
      color: "text-brand-indigo",
      bg: "bg-brand-indigo-soft",
    },
    {
      title: "Benchmark Analytics",
      desc: "Measure your link profile against industry standards and top performers.",
      icon: Target,
      color: "text-brand-green-dark",
      bg: "bg-brand-green-soft",
    },
  ];

  return (
    <section className="py-40 px-4 bg-gray-25/30 overflow-hidden">
      <div className="max-w-[1440px] mx-auto">
        <div className="text-center mb-28">
          <h2 className="text-3xl md:text-[56px] font-sora font-black tracking-[-0.05em] leading-none text-gray-900 mb-6">
            Built for elite SEO teams
          </h2>
          <p className="text-lg md:text-xl text-gray-400 font-medium font-inter max-w-2xl mx-auto">
            Everything you need to source, track, and scale your backlink
            strategy in one unified ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{
                delay: i * 0.1,
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
              }}
              viewport={{ once: true }}
              className="group"
            >
              <Card className="h-full bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_48px_100px_rgba(51,31,253,0.08)] hover:border-brand-indigo/10 transition-all duration-700 rounded-[40px] overflow-hidden p-2">
                <CardHeader className="p-10 pb-6">
                  <div
                    className={`w-16 h-16 rounded-[24px] ${feature.bg} flex items-center justify-center ${feature.color} shadow-sm border border-white/50 mb-8 transform transition-all duration-700 group-hover:bg-white group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-xl`}
                  >
                    <feature.icon size={28} />
                  </div>
                  <CardTitle className="text-2xl font-sora font-black tracking-tight pt-2 text-gray-900">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-10 pb-12">
                  <p className="text-gray-400 leading-relaxed font-medium font-inter text-base">
                    {feature.desc}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BuiltForTeams;
