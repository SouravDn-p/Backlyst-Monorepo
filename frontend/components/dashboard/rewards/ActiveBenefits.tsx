import React from "react";
import { CheckCircle, Clock } from "lucide-react";

interface ActiveBenefitsProps {
  benefits: any[];
}

export const ActiveBenefits: React.FC<ActiveBenefitsProps> = ({ benefits }) => {
  if (!benefits || benefits.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm h-full">
        <div className="flex flex-col items-center justify-center text-center h-full min-h-[160px]">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No Active Benefits</h3>
          <p className="text-sm text-gray-500 mt-1">Unlock badges to earn active benefits for your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm h-full">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-emerald-500" />
        Active Benefits
      </h3>
      <div className="space-y-4">
        {benefits.map((benefit, index) => (
          <div key={index} className="flex items-start gap-3 p-3 rounded-lg border border-emerald-100 bg-emerald-50/30">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{benefit.title}</p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-1">{benefit.sourceBadge}</p>
              {benefit.expiresAt && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expires in {benefit.remainingDays} days
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
