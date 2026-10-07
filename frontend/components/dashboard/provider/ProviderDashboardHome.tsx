"use client";

import { useState } from "react";
import {
  PlayCircle,
  ChevronRight,
  Award,
  Zap,
  Star,
} from "lucide-react";
import ActionLink from "@/components/ui/ActionLink";
import { Button } from "@/components/ui/Button";
import ActiveDeliveries from "@/components/dashboard/provider/delivery/ActiveDeliveries";
import BuyVisibilityCreditModal from "@/components/dashboard/provider/visivility/Buyvisibilitycreditmodal";
import ProviderDashbordStatsHome from "./ProviderDashbordStatsHome";
import PendingDirectTasksBanner from "./PendingDirectTasksBanner";
import { useGetCreditsMeQuery } from "@/redux/features/api/credit/creditApi";
import { useGetMeQuery } from "@/redux/features/api/auth/authApi";

const ProviderDashboardHome = () => {
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const { data: creditsData, isLoading: creditsLoading } = useGetCreditsMeQuery();
  const { data : usersData } = useGetMeQuery();

  return (
    <>
      <BuyVisibilityCreditModal
        open={buyModalOpen}
        onClose={() => setBuyModalOpen(false)}
      />

      <div className="flex flex-col gap-6 font-inter max-w-[90vw] lg:max-w-[65vw] xl:max-w-[85vw] 2xl:max-w-[90vw] md:mx-auto lg:mx-0">
        {/* Header Section */}
        <div className="md:flex items-end justify-between">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#e2e2e2] rounded-full w-fit">
                <Award className="w-5 h-5 text-[#6366f1]" />
                <span className="text-xs font-semibold text-[#0f0f0f]">
                  LEVEL - 2
                </span>
              </div>
              <div className="md:flex md:items-center gap-5">
                <h1 className="pb-2 text-2xl md:text-[30px] font-semibold font-sora text-[#181d27] md:leading-9.5">
                  Welcome back, {usersData?.data?.name || "Provider"}
                </h1>
                <span className="px-5 py-2.5 bg-indigo text-primary rounded-full text-sm font-medium">
                  Provider
                </span>
              </div>
            </div>
            <p className="text-sm font-medium text-[#535862] leading-5">
              Manage your Backlyst projects, connected domains, and assigned
              placement providers from your command center.
            </p>
          </div>
          <div className="flex flex-col gap-5 items-end">
            <ActionLink
              label="REFER A FRIEND"
              href="/dashboard/referrals"
              className="px-5 py-3 bg-indigo text-primary rounded-full text-sm font-medium hover:bg-[#ddd8ff] transition-colors w-fit justify-end"
            />
            <div className="md:flex items-center gap-5 w-full space-y-2">
              <ActionLink
                variant="outline"
                href="/how-it-works"
                label="HOW IT WORKS"
                icon={<PlayCircle className="w-6 h-6" />}
                iconPosition="left"
                className="w-full"
              />
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => setBuyModalOpen(true)}
              >
                BUY VISIBILITY CREDIT
              </Button>
            </div>
          </div>
        </div>

        {/* Pending Direct Tasks Banner */}
        <PendingDirectTasksBanner />

        {/* Stats Grid */}
        <ProviderDashbordStatsHome />

        {/* Recent Activity Table */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
          <div className="xl:col-span-3 flex flex-col gap-6 h-full">
            <div className="border border-[#e9eaeb] rounded-xl p-6 shadow-sm bg-white">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-linear-to-br from-[#6366f1] to-[#a78bfa] flex items-center justify-center text-white text-2xl font-bold">
                  S
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-green-500 fill-green-500" />
                    <h3 className="font-semibold text-[#181d27] text-lg">
                      Sisyphus
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs font-medium text-gray-600">
                      LEVEL - 2
                    </span>
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-semibold text-[#181d27]">
                      4.9
                    </span>
                    <span className="text-xs text-gray-500">(124)</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-[#e9eaeb] space-y-3">
                <div>
                  <p className="text-sm text-[#535862]">Total Credits Earned</p>
                  {creditsLoading ? (
                    <div className="h-6 w-24 bg-gray-200 animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-xl font-semibold text-[#181d27]">
                      {creditsData?.earnedTaskCredits ?? 0}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-[#535862]">This Month</p>
                  {creditsLoading ? (
                    <div className="h-5 w-28 bg-gray-200 animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-lg font-medium text-[#181d27]">
                      {creditsData?.thisMonthTotalCredits ?? 0} Credits
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#e9eaeb]">
                <button className="w-full flex items-center justify-between text-sm font-medium text-[#535862] hover:text-primary">
                  <span>BADGES & LEVEL</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Active Deliveries */}
          <div className="xl:col-span-9 flex flex-col h-full gap-5 bg-white p-4 rounded-2xl">
            <ActiveDeliveries />
          </div>
        </div>
      </div>
    </>
  );
};

export default ProviderDashboardHome;
