import React from "react";
import { Layers, Globe, Check, MessageSquare, BarChart2 } from "lucide-react";

const features = [
  {
    title: "Task Marketplace",
    desc: "Create backlink tasks & receive applications from pre-vetted, qualified publishers in any niche.",
    Icon: Layers,
  },
  {
    title: "Provider Directory",
    desc: "Sort by domain niche, DR, DA, organic traffic, and pricing to find the perfect publishing match.",
    Icon: Globe,
  },
  {
    title: "Live Delivery Tracking",
    desc: "Approve drafts, renew submissions, and track link indexation status in real-time.",
    Icon: Layers,
    highlight: true,
  },
  {
    title: "Credit-Based Billing",
    desc: "One-click payments. Buy credits and use them across all tasks with zero transaction friction.",
    Icon: Check,
  },
  {
    title: "Unified Messaging",
    desc: "Chat directly with publishers and manage feedback loops without leaving the dashboard.",
    Icon: MessageSquare,
  },
  {
    title: "Advanced Analytics",
    desc: "Monitor your domain health, completed link profiles, and ROI metrics with exportable reports.",
    Icon: BarChart2,
  },
];

const Features = () => {
  return (
    <section className="py-15 md:py-25 px-6 bg-[#fdfdff]" id="features">
      <div className="max-w-[1320px] mx-auto flex flex-col gap-20 items-center justify-center">
        {/* Heading */}
        <div className="flex flex-col gap-5 items-center text-center w-[741px] max-w-full">
          <h2 className="font-sora font-semibold text-3xl md:text-[48px] leading-10 md:leading-[60px] tracking-[-0.96px] text-gray-900">
            Built for elite SEO teams
          </h2>
          <p className="font-inter font-normal md:text-xl leading-[30px] text-gray-900">
            Everything you need to source, track, and scale your backlink
            strategy in one unified ecosystem
          </p>
        </div>

        {/* Cards Grid */}
        <div className="flex flex-col gap-6 items-center justify-center w-full">
          {/* Row 1 */}
          <div className="flex gap-6 items-center justify-center w-full flex-wrap">
            {features.slice(0, 3).map((feature, i) => (
              <FeatureCard key={i} {...feature} />
            ))}
          </div>
          {/* Row 2 */}
          <div className="flex gap-6 items-center justify-center w-full flex-wrap">
            {features.slice(3, 6).map((feature, i) => (
              <FeatureCard key={i + 3} {...feature} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

interface FeatureCardProps {
  title: string;
  desc: string;
  Icon: React.ElementType;
  highlight?: boolean;
}

const FeatureCard = ({ title, desc, Icon, highlight }: FeatureCardProps) => {
  return (
    <div
      className={`bg-white rounded-[10px] p-5 flex flex-col gap-5 items-start w-[424px] max-w-full ${
        highlight
          ? "shadow-[0_0_29px_0_#d9d5ff,0_0_10px_0_rgba(0,0,0,0.1)]"
          : "shadow-[0_0_10px_0_rgba(161,152,254,0.1)]"
      }`}
    >
      {/* Icon */}
      <div className="bg-accent  border border-secondary rounded-[10px] p-3 flex items-center">
        <Icon className="w-6 h-6 text-secondary" />
      </div>

      {/* Text */}
      <div className="flex flex-col gap-2.5 items-start w-full">
        <h3 className="font-inter font-semibold text-base leading-6 text-gray-900">
          {title}
        </h3>
        <p className="font-inter font-normal text-xs leading-4.5 text-gray-900">
          {desc}
        </p>
      </div>
    </div>
  );
};

export default Features;
