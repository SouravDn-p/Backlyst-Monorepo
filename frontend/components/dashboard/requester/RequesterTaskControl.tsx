"use client";

import { useGetRequesterDashboardSummaryQuery } from "@/redux/features/api/requester/dashboard/requesterDashboardStatsApi";

const RequesterTaskControl = () => {
  const { data, isLoading } = useGetRequesterDashboardSummaryQuery({
    range: "30d",
  });

  const tasks = data?.data?.tasks;

  const allTasks = tasks?.created ?? 0;

  const activeTasks =
    (tasks?.open ?? 0) +
    (tasks?.assigned ?? 0) +
    (tasks?.inProgress ?? 0);

  const submittedTasks = tasks?.submitted ?? 0;

  const reviewTasks = tasks?.revisionRequested ?? 0;

  const taskControls = [
    {
      label: "All",
      count: allTasks,
      active: true,
    },
    {
      label: "Active",
      count: activeTasks,
    },
    {
      label: "Submitted",
      count: submittedTasks,
    },
    {
      label: "Review",
      count: reviewTasks,
    },
  ];

  return (
    <div className="bg-white border border-[#e2e2e2] rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-[#181d27]">
          Task Control
        </h3>
      </div>

      <div className="space-y-1">
        {taskControls.map((item) => (
          <div
            key={item.label}
            className={`flex items-center justify-between px-4 py-1 rounded-sm ${
              item.active ? "bg-gray-100" : ""
            }`}
          >
            <span
              className={`text-sm font-medium ${
                item.active ? "text-primary" : "text-[#535862]"
              }`}
            >
              {item.label}
            </span>

            {isLoading ? (
              <div className="h-6 w-10 rounded-full bg-gray-200 animate-pulse" />
            ) : (
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  item.active
                    ? "bg-primary text-white"
                    : "bg-gray-300 text-[#535862]"
                }`}
              >
                {item.count}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RequesterTaskControl;