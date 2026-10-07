import React from "react";
import { Card } from "@/components/ui/Card";
import { Clock, type LucideIcon } from "lucide-react";

interface StatItem {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
}

interface MetricStatsProps {
  stats: StatItem[];
}

const MetricStats: React.FC<MetricStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, i) => (
        <Card
          key={i}
          className="p-8 border border-gray-100 bg-white rounded-4xl shadow-sm hover:shadow-xl hover:shadow-gray-900/5 transition-all duration-500 group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-indigo/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
          <div className="flex flex-col gap-6 relative z-10">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 group-hover:bg-brand-indigo-soft group-hover:text-brand-indigo transition-all duration-500">
              <stat.icon size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
                {stat.label}
              </p>
              <h3 className="text-3xl font-black font-sora text-gray-900 tracking-tight">
                {stat.value}
              </h3>
              <p className="text-[10px] font-bold text-gray-300 mt-2 flex items-center gap-2">
                <Clock size={12} /> {stat.sub}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default MetricStats;
