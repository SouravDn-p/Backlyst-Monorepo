import React from "react";
import { Award, Gift, Zap, Star } from "lucide-react";
import { RewardSummary } from "@/types/rewards/rewardsTypes";
import { StatCard } from "@/components/ui/common/StatCard";

interface RewardsSummaryCardsProps {
  summary: RewardSummary;
}

export const RewardsSummaryCards: React.FC<RewardsSummaryCardsProps> = ({ summary }) => {
  const cards = [
    {
      title: "Badges Earned",
      value: summary.badgesEarned,
      icon: Award,
    },
    {
      title: "Active Rewards",
      value: summary.activeBenefits,
      icon: Gift,
    },
    {
      title: "Hall of Fame",
      value: summary.hallOfFameBadges,
      icon: Star,
    },
    {
      title: "Kickstarter Badges",
      value: summary.kickstarterBadges,
      icon: Zap,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (

        <StatCard
          key={index}
          icon={card.icon}
          label={card.title}
          value={card.value.toString()}
          // subtext="Updated real-time"
        />
        // <div key={index} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
        //   <div className={`p-3 rounded-lg ${card.bgColor}`}>
        //     {card.icon}
        //   </div>
        //   <div>
        //     <p className="text-sm text-gray-500 font-medium">{card.title}</p>
        //     <p className="text-2xl font-bold text-gray-900">{card.value}</p>
        //   </div>
        // </div>
      ))}
    </div>
  );
};
