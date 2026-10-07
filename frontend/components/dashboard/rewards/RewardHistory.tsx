import React, { useState } from "react";
import { useGetRewardsLedgerQuery } from "@/redux/features/api/rewards/rewardsApi";
import { format } from "date-fns";
import { History, ChevronLeft, ChevronRight, Loader2, Info } from "lucide-react";

interface RewardHistoryProps {}

export const RewardHistory: React.FC<RewardHistoryProps> = () => {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: response, isLoading, isError } = useGetRewardsLedgerQuery({
    page,
    limit,
  });

  const ledgerItems = response?.items || [];
  const pagination = response?.pagination;
  const totalPages = pagination?.totalPages || 1;

  if (isLoading && page === 1) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm mt-6 flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading history...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm mt-6 text-center">
        <p className="text-red-500">Failed to load reward history.</p>
      </div>
    );
  }

  if (ledgerItems.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm mt-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-gray-400" />
          Reward History
        </h3>
        <div className="flex flex-col items-center justify-center text-center py-10">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Info className="w-8 h-8 text-gray-300" />
          </div>
          <h4 className="text-gray-900 font-semibold mb-1">No History Yet</h4>
          <p className="text-gray-500 text-sm max-w-sm">
            Your reward and badge history will appear here once you start earning achievements.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm mt-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
        <History className="w-5 h-5 text-indigo-500" />
        Recent Reward History
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-3 text-sm font-semibold text-gray-500 pl-4">Date</th>
              <th className="pb-3 text-sm font-semibold text-gray-500">Activity</th>
              <th className="pb-3 text-sm font-semibold text-gray-500">Badge / Reward</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ledgerItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 pl-4 text-sm text-gray-600 whitespace-nowrap">
                  {format(new Date(item.createdAt), "MMM d, yyyy h:mm a")}
                </td>
                <td className="py-4 text-sm">
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{item.description}</p>
                </td>
                <td className="py-4 text-sm">
                  {item.badge ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
                      {item.badge.name}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Showing page <span className="font-semibold text-gray-900">{page}</span> of{" "}
            <span className="font-semibold text-gray-900">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
              className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
