import React, { useState } from "react";
import { useGetRewardsBadgesQuery } from "@/redux/features/api/rewards/rewardsApi";
import { BadgeCard } from "./BadgeCard";
import { Loader2, SearchX } from "lucide-react";

interface BadgeTabsProps {}

const TABS = [
  { id: "ALL", label: "All Badges" },
  { id: "EARNED", label: "Earned", queryParams: { status: "EARNED" } },
  { id: "ACTIVE", label: "Active", queryParams: { status: "ACTIVE" } },
  { id: "LOCKED", label: "Locked", queryParams: { status: "LOCKED" } },
  { id: "INACTIVE", label: "Inactive", queryParams: { status: "INACTIVE" } },
  { id: "KICKSTARTER", label: "Kickstarter", queryParams: { category: "KICKSTARTER" } },
  { id: "HALL_OF_FAME", label: "Hall of Fame", queryParams: { category: "HALL_OF_FAME" } },
];

export const BadgeTabs: React.FC<BadgeTabsProps> = () => {
  const [activeTab, setActiveTab] = useState(TABS[0]);

  const { data: response, isLoading, isError } = useGetRewardsBadgesQuery(
    activeTab.queryParams || {},
    { refetchOnMountOrArgChange: true }
  );

  const getBadgesList = () => {
    if (!response?.data) return [];
    
    if (activeTab.id === "ALL") {
       // Just flatten everything from all if available, or groups
       return response.data.all || [];
    }

    if (activeTab.id === "EARNED") return response.data.earned || response.data.all || [];
    if (activeTab.id === "ACTIVE") return response.data.active || response.data.all || [];
    if (activeTab.id === "LOCKED") return response.data.locked || response.data.all || [];
    if (activeTab.id === "INACTIVE") return response.data.inactive || response.data.all || [];
    if (activeTab.id === "KICKSTARTER") return response.data.kickstarter || response.data.all || [];
    if (activeTab.id === "HALL_OF_FAME") return response.data.hallOfFame || response.data.all || [];
    
    return [];
  };

  const badges = getBadgesList();

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
      {/* Tabs Header */}
      <div className="border-b border-gray-200 overflow-x-auto custom-scrollbar">
        <div className="flex items-center min-w-max px-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-4 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeTab.id === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 bg-gray-50/50 min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Loading badges...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-64 text-red-500">
            <p>Failed to load badges. Please try again later.</p>
          </div>
        ) : badges.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <SearchX className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No badges found</h3>
            <p className="text-gray-500 mt-1 max-w-md">
              There are currently no badges available in the "{activeTab.label}" category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {badges.map((badge) => (
              <BadgeCard key={badge.badgeId || badge.code} badge={badge} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
