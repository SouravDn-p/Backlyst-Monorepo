"use client";

import ActionLink from "@/components/ui/ActionLink";
import { Button } from "@/components/ui/Button";
import { useGetMyWebsitesQuery } from "@/redux/features/api/website/websiteApi";
import { WebsiteVerificationStatus } from "@/types/website/websiteTypes";
import { ChevronRight, Globe, ShieldCheck } from "lucide-react";

const WebsiteOverview = () => {
  const { data, isLoading } = useGetMyWebsitesQuery({});

  const websites = data?.data?.data ?? [];

  const totalWebsites = websites.length;

  const verifiedWebsites = websites.filter(
    (website) =>
      website.verificationStatus === WebsiteVerificationStatus.VERIFIED
  ).length;

  const allVerified =
    totalWebsites > 0 && verifiedWebsites === totalWebsites;

  return (
    <div className="bg-white border border-[#e2e2e2] rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-[#181d27]">
          Website Overview
        </h3>
        <Globe className="w-5 h-5 text-indigo-600" />
      </div>

      <div className="space-y-4">
        {/* Websites Connected */}
        <div className="flex items-center justify-between bg-gray-100 px-2 rounded-sm">
          <span className="text-sm font-medium text-[#535862] py-2">
            Websites Connected
          </span>

          {isLoading ? (
            <div className="h-6 w-10 bg-gray-200 animate-pulse rounded" />
          ) : (
            <span className="text-lg font-semibold text-[#181d27]">
              {totalWebsites}
            </span>
          )}
        </div>

        {/* Verification Status */}
        <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-sm px-2">
          <div className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-secondary">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Verified
          </div>

          {isLoading ? (
            <div className="h-5 w-24 bg-gray-200 animate-pulse rounded" />
          ) : (
            <span className="font-semibold text-secondary text-sm">
              {allVerified
                ? "ALL ACTIVE"
                : `${verifiedWebsites}/${totalWebsites} VERIFIED`}
            </span>
          )}
        </div>

        <Button variant="white" className="rounded-md w-full">
          <ActionLink
            label="Manage Websites"
            href="/dashboard/websites"
            className="text-sm font-medium flex items-center gap-1"
            icon={<ChevronRight className="w-4 h-4" />}
            iconPosition="right"
          />
        </Button>
      </div>
    </div>
  );
};

export default WebsiteOverview;