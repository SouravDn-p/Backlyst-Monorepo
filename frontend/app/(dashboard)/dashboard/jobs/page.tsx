"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import ProviderTasksBoard from "@/components/dashboard/provider/delivery/ProviderTasksBoard";
import ProviderDirectTasksTable from "@/components/dashboard/provider/delivery/ProviderDirectTasksTable";
import { useGetReceivedDirectTasksQuery } from "@/redux/features/api/directTask/directTaskApi";

function JobsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabFromUrl = searchParams.get("tab") || "active";
  
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  const { data } = useGetReceivedDirectTasksQuery({ limit: 1, status: "PENDING" });
  const pendingCount = data?.data?.meta?.totalItems || 0;

  useEffect(() => {
    if (searchParams.get("tab")) {
      setActiveTab(searchParams.get("tab") as string);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-6 font-inter w-full max-w-[90vw] lg:max-w-[65vw] xl:max-w-[85vw] 2xl:max-w-[90vw] md:mx-auto lg:mx-0">
      <div className="flex items-center gap-1 border-b border-[#e5e7eb] pb-0">
        <button
          onClick={() => handleTabChange("active")}
          className={`relative px-6 py-4 text-sm font-semibold tracking-wide transition-colors ${
            activeTab === "active" ? "text-primary" : "text-[#6b7280] hover:text-[#374151]"
          }`}
        >
          Active Jobs & Deliveries
          {activeTab === "active" && (
            <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-t-full bg-primary" />
          )}
        </button>
        <button
          onClick={() => handleTabChange("direct-tasks")}
          className={`relative flex items-center gap-2 px-6 py-4 text-sm font-semibold tracking-wide transition-colors ${
            activeTab === "direct-tasks" ? "text-primary" : "text-[#6b7280] hover:text-[#374151]"
          }`}
        >
          Received Direct Tasks
          {pendingCount > 0 && (
            <span className="flex h-5 items-center justify-center rounded-full bg-red-500 px-2 text-[10px] font-bold text-white">
              {pendingCount}
            </span>
          )}
          {activeTab === "direct-tasks" && (
            <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-t-full bg-primary" />
          )}
        </button>
      </div>

      <div className="mt-2">
        {activeTab === "active" ? (
          <ProviderTasksBoard />
        ) : (
          <ProviderDirectTasksTable />
        )}
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
      <JobsView />
    </Suspense>
  );
}
