import React from "react";
import { NextBadge } from "@/types/rewards/rewardsTypes";
import { Shield, Lock, CheckCircle2, Star } from "lucide-react";
import { format } from "date-fns";

interface BadgeCardProps {
  badge: NextBadge;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({ badge }) => {
  const isLocked = badge.status === "LOCKED";
  const isEarned = badge.status === "EARNED" || badge.status === "ACTIVE";

  const getStatusColor = () => {
    switch (badge.status) {
      case "ACTIVE":
      case "EARNED":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "LOCKED":
        return "bg-gray-100 text-gray-600 border-gray-200";
      case "INACTIVE":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const getCategoryIcon = () => {
    switch (badge.category) {
      case "MARKETPLACE":
        return <Shield className={`w-10 h-10 ${isLocked ? 'text-gray-300' : 'text-blue-500'}`} />;
      case "KICKSTARTER":
        return <Star className={`w-10 h-10 ${isLocked ? 'text-gray-300' : 'text-purple-500'}`} />;
      case "HALL_OF_FAME":
        return <Star className={`w-10 h-10 ${isLocked ? 'text-gray-300' : 'text-amber-500'}`} fill="currentColor" />;
      default:
        return <Shield className={`w-10 h-10 ${isLocked ? 'text-gray-300' : 'text-indigo-500'}`} />;
    }
  };

  return (
    <div className={`relative bg-white rounded-xl p-6 border ${isEarned ? 'border-emerald-200 shadow-sm' : 'border-gray-200'} transition-all hover:shadow-md flex flex-col h-full`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm flex items-center justify-center flex-shrink-0">
            {badge.iconUrl ? (
              <img src={badge.iconUrl} alt={badge.name} className="w-10 h-10 object-contain" />
            ) : (
              getCategoryIcon()
            )}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-lg leading-tight">{badge.name}</h4>
            <span className={`inline-block mt-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${getStatusColor()}`}>
              {badge.status}
            </span>
          </div>
        </div>

        {isEarned && (
          <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
        )}
        {isLocked && (
          <Lock className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </div>

      {/* Description & Requirement */}
      <div className="mb-5 flex-1">
        {badge.description && (
          <p className="text-sm text-gray-600 mb-2">{badge.description}</p>
        )}
        <p className="text-sm text-gray-800 font-medium line-clamp-3">
          {badge.requirementText || "Achievement details hidden until closer to unlocking."}
        </p>
      </div>

      {/* Progress */}
      {badge.progress && badge.progress.target !== null && !isEarned && (
        <div className="mb-5">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-medium text-gray-500">Progress</span>
            <span className="font-semibold text-gray-900">{badge.progressLabel || `${badge.progress.current || 0} / ${badge.progress.target}`}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, badge.progress.percentage || 0))}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Footer / Benefit */}
      <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-end gap-2">
        <div className="flex-1">
          {badge.benefitText ? (
            <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1.5 line-clamp-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"></span>
              {badge.benefitText}
            </p>
          ) : (
            <p className="text-xs text-gray-400 font-medium">Recognition Badge</p>
          )}
        </div>

        {badge.earnedAt && (
          <div className="text-[10px] text-gray-400 text-right font-medium whitespace-nowrap">
            Earned {format(new Date(badge.earnedAt), "MMM d, yyyy")}
          </div>
        )}
      </div>
    </div>
  );
};
