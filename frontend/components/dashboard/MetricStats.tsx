import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  trend: "up" | "down";
  icon: LucideIcon;
  color: string;
}

const MetricCard = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  color,
}: MetricCardProps) => (
  <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
    <Card className="border-none shadow-md hover:shadow-xl transition-shadow bg-white overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div
            className="p-3 rounded-xl transition-transform group-hover:scale-110 duration-300"
            style={{ backgroundColor: `${color}10`, color }}
          >
            <Icon size={24} />
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              trend === "up"
                ? "bg-brand-green-soft text-brand-green"
                : "bg-brand-orange-soft text-brand-orange"
            }`}
          >
            {trend === "up" ? (
              <ArrowUpRight size={14} />
            ) : (
              <ArrowDownRight size={14} />
            )}
            {change}%
          </div>
        </div>
        <div>
          <p className="text-gray-500 text-sm font-semibold font-inter uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-3xl mt-2 font-bold font-sora tracking-tight text-gray-900">
            {value}
          </h3>
        </div>
        <div className="mt-4 h-1 w-full bg-gray-50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, change * 5 + 40)}%` }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

interface MetricStatsProps {
  stats: MetricCardProps[];
}

const MetricStats = ({ stats }: MetricStatsProps) => (
  <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
    {stats.map((stat, i) => (
      <MetricCard key={i} {...stat} />
    ))}
  </section>
);

export default MetricStats;
