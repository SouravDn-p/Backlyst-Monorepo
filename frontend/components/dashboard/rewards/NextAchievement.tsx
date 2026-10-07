import React from "react";
import { Target, Trophy } from "lucide-react";
import { NextBadge } from "@/types/rewards/rewardsTypes";

interface NextAchievementProps {
  nextBadge: NextBadge | null;
}

export const NextAchievement: React.FC<NextAchievementProps> = ({ nextBadge }) => {
  if (!nextBadge) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[200px]">
        <Trophy className="w-12 h-12 text-gray-300 mb-3" />
        <h3 className="text-lg font-semibold text-gray-900">You've unlocked everything!</h3>
        <p className="text-sm text-gray-500 mt-1">There are no next achievements available at this time.</p>
      </div>
    );
  }

  const { progress } = nextBadge;
  const percentage = progress.percentage || 0;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100 shadow-sm h-full">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-indigo-900">Next Achievement</h3>
      </div>

      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Trophy className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-gray-900">{nextBadge.name}</h4>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{nextBadge.requirementText}</p>
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex justify-between items-center text-sm mb-2">
          <span className="font-medium text-indigo-800">Progress</span>
          <span className="font-semibold text-indigo-900">{progress.label || `${percentage}%`}</span>
        </div>
        <div className="w-full bg-indigo-200/50 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          ></div>
        </div>
        {nextBadge.benefitText && (
          <p className="text-xs text-indigo-700 mt-3 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Reward: {nextBadge.benefitText}
          </p>
        )}
      </div>
    </div>
  );
};
