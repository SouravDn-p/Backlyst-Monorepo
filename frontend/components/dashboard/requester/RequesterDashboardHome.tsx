"use client";

import {
  Layers,
  CheckCircle,
  Database,
  PlayCircle,
  Award,
  Shield,
  Globe,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import ActionLink from "@/components/ui/ActionLink";
import { Button } from "@/components/ui/Button";
import BuyVisibilityCreditModal from "@/components/dashboard/provider/visivility/Buyvisibilitycreditmodal";
import RequesterTasksTable from "@/components/dashboard/requester/orders/RequesterTasksTable";
import RequesterDashbordStatsHome from "./RequesterDashbordStatsHome";
import RequesterTaskControl from "./RequesterTaskControl";
import { useRouter } from "next/navigation";
import WebsiteOverview from "./WebsiteOverview";
import { useGetMeQuery } from "@/redux/features/api/auth/authApi";
const RequesterDashboardHome = () => {
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const { data : usersData , isLoading } = useGetMeQuery();
  const router = useRouter();

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
            <div className="flex flex-col gap-3 w-full  ">
              <div className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#e2e2e2] rounded-full w-fit">
                <Award className="w-5 h-5 text-[#6366f1] " />
                <span className="text-xs font-semibold text-[#0f0f0f]">
                  LEVEL - 2
                </span>
              </div>
              <div className="md:flex md:items-center gap-5 ">
                <h1 className="pb-2 text-2xl  md:text-[30px] font-semibold font-sora text-[#181d27] md:leading-9.5">
                  Welcome back, {usersData?.data?.name || "Requester"}
                </h1>
                <span className="px-5 py-2.5 bg-indigo text-primary rounded-full text-sm font-medium">
                  Requester
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
              href={`/dashboard/referrals`}
              className="px-5 py-3 bg-indigo text-primary rounded-full text-sm font-medium hover:bg-[#ddd8ff] transition-colors "
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
                variant="secondary"
                onClick={() => setBuyModalOpen(true)}
                className="w-full"
              >
                BUY VISIBILITY CREDIT
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <RequesterDashbordStatsHome />

        <div className="lg:col-span-9 flex flex-col h-full gap-5 bg-white p-4 rounded-2xl">
          <RequesterTasksTable
            title="Recent Activity"
            role="REQUESTER"
            limit={5}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-6">
          {/* Website Overview */}
         <WebsiteOverview />

          {/* Task Control */}
          <RequesterTaskControl />

          {/* BRACKLYST PRO Promotion */}
          <div className="bg-[#FFF1E9] border border-[#fd751f]! rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute -top-20 -right-15 w-40 h-40 rounded-full border border-white/20 pointer-events-none bg-[#FED4BA]" />

            <div className="relative z-10">
              <div className="inline-block px-4 bg-secondary text-white text-xs font-normal tracking-wide rounded-md py-2 mb-4">
                BACKLYST PRO
              </div>

              <h3 className="text-xl font-semibold text-[#181d27] mb-3">
                Elevate Your Strategy
              </h3>

              <p className="text-md max-w-xs text-black mb-6 leading-relaxed">
                Unlock high-authority domains and dedicated account managers.
              </p>

              <Button
                variant="secondary"
                onClick={() => router.push("/dashboard/subscription")}
                className="w-full  text-white font-medium py-3 rounded-xl shadow-md"
              >
                Go Platinum
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RequesterDashboardHome;
