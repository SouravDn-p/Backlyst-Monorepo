"use client";

import { useState } from "react";
import {
  Star,
  Globe,
  Shield,
  AlertCircle,
  List,
  Activity,
  Plus,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import DirectTaskModal from "@/components/dashboard/provider/profile/DirectTaskModal";
import PublisherCapabilitiesModal from "./PublisherCapabilitiesModal";
import ModalShell from "../delivery/modals/ModalShell";
import ProfileOverviewTab from "./profileTabs/ProfileOverviewTab";
import ProfilePaymentTab from "./profileTabs/ProfilePaymentTab";
import ProfileVerifiedTab from "./profileTabs/ProfileVerifiedTab";
import ProfileAuthorityTab from "./profileTabs/ProfileAuthorityTab";
import ProfileWebsite from "./profileTabs/ProfileWebsite";
import { useGetCompanyDetailQuery } from "@/redux/features/api/company/companyDirectoryApi";
import {
  getCompanySpecializationLabel,
} from "./companyProfileHelpers";
interface ProfileModalProvider {
  id: string | number;
  name: string;
  avatar?: string;
  avatarBg?: string;
  verified?: boolean;
  rating?: number;
  reviews?: number;
}

interface ProviderProfileModalProps {
  open: boolean;
  provider?: ProfileModalProvider | null;
  onClose: () => void;
  showFooterActions?: boolean;
}

const TABS: string[] = [
  "OVERVIEW",
  "PLACEMENT FORMATS",
  "VERIFIED SAMPLES",
  "AUTHORITY",
  "WEBSITE LIST",
];

export default function ProviderProfileModal({
  open,
  provider,
  onClose,
  showFooterActions = true,
}: ProviderProfileModalProps) {
  const [activeTab, setActiveTab] = useState<string>("OVERVIEW");
  const [showCapabilities, setShowCapabilities] = useState<boolean>(false);
  const [showCreateTask, setShowCreateTask] = useState<boolean>(false);
  const providerId = provider?.id ? String(provider.id) : "";

  const { data: companyDetailResponse } = useGetCompanyDetailQuery(
    providerId,
    {
      skip: !open || !providerId,
    },
  );

  if (!provider) return null;

  const detail = companyDetailResponse?.data;
  const providerName = detail?.companyName || provider.name;
  const providerVerified = detail?.publisher?.isVerified ?? provider?.verified;
  const providerRating = detail?.ratingSummary?.averageRating ?? provider?.rating;
  const providerReviews = detail?.ratingSummary?.totalReviews ?? provider?.reviews;
  const specializationLabel = getCompanySpecializationLabel(detail);

  const tabIcons: Record<string, React.ReactNode> = {
    OVERVIEW: <Activity className="w-4 h-4" />,
    "PLACEMENT FORMATS": <List className="w-4 h-4" />,
    "VERIFIED SAMPLES": <Eye className="w-4 h-4" />,
    AUTHORITY: <Shield className="w-4 h-4" />,
    "WEBSITE LIST": <Globe className="w-4 h-4" />,
  };

  const handleCreateTask = () => {
    setShowCreateTask(true);
    // onClose();
  };
  const handleApproveTask = () => {
    setShowCreateTask(false);
    onClose();
  };
  const handleExplore = () => {
    // onClose();
    setShowCreateTask(false);
    setShowCapabilities(true);
  };

  return (
    <>
      <ModalShell open={open} onClose={onClose}>
        <div
          className="bg-white rounded-2xl w-full max-w-sm md:max-w-5xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 md:px-6 pt-4 md:pt-5 pb-0 border-b border-[#f0f0f0]">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 py-3 md:py-4">
                <div
                  className="w-10 md:w-12 h-10 md:h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm md:text-base shrink-0"
                  style={{ backgroundColor: provider.avatarBg || "#6366f1" }}
                >
                  {provider.avatar || providerName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base md:text-lg font-bold text-[#181d27]">
                      {providerName}
                    </p>
                    {providerVerified && (
                      <span className="px-2 py-0.5 bg-[#f0fdf4] text-[#15803d] text-[10px] font-bold rounded-full border border-[#bbf7d0] uppercase tracking-wide">
                        ✓ Verified Publisher
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-[#fbbf24] fill-[#fbbf24]" />
                      <span className="text-md font-semibold text-[#181d27]">
                        {providerRating}
                      </span>
                    </div>
                    <span className="text-sm text-[#717680]">
                      ({providerReviews} Reviews)
                    </span>
                    <span className="text-[#e9eaeb]">•</span>
                    <span className="text-sm text-[#717680]">
                      {specializationLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center cursor-pointer gap-1 md:gap-1.5 px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-semibold whitespace-nowrap border-b-3 transition-colors ${activeTab === tab ? "border-primary text-[#181d27]" : "border-transparent text-[#717680] hover:text-[#414651]"}`}
                >
                  {tabIcons[tab]} {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-100 max-h-100">
            {activeTab === "OVERVIEW" && <ProfileOverviewTab detail={detail} />}

            {activeTab === "PLACEMENT FORMATS" && (
              <ProfilePaymentTab detail={detail} />
            )}
            {activeTab === "VERIFIED SAMPLES" && (
              <ProfileVerifiedTab detail={detail} />
            )}

            {activeTab === "AUTHORITY" && (
              <ProfileAuthorityTab detail={detail} />
            )}

            {activeTab === "WEBSITE LIST" && <ProfileWebsite detail={detail} />}
          </div>

          {showFooterActions && (
            <div className="px-4 md:px-6 py-3 md:py-4 border-t border-[#f0f0f0] flex flex-col md:flex-row items-center justify-between bg-[#fafafa] rounded-b-2xl gap-3">
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 w-full md:w-auto">
                <button className="flex items-center gap-1.5 text-xs md:text-sm font-semibold text-[#535862] hover:text-[#181d27] transition-colors whitespace-nowrap">
                  <AlertCircle className="w-3.5 md:w-4 h-3.5 md:h-4 shrink-0" />{" "}
                  ASK A QUESTION
                </button>
                <button
                  onClick={handleExplore}
                  className="flex cursor-pointer items-center gap-1.5 text-xs md:text-sm font-semibold text-[#535862] hover:text-[#181d27] transition-colors whitespace-nowrap"
                >
                  <Eye className="w-3.5 md:w-4 h-3.5 md:h-4 shrink-0" /> EXPLORE
                  CAPABILITY
                </button>
              </div>
              <Button
                variant="secondary"
                onClick={handleCreateTask}
                className="w-full md:w-auto h-10 md:h-11 text-xs md:text-sm"
              >
                <Plus className="w-3.5 md:w-4 h-3.5 md:h-4" /> CREATE TASK TO
                INVITE
              </Button>
            </div>
          )}
        </div>
      </ModalShell>

      {showFooterActions && showCapabilities && (
        <PublisherCapabilitiesModal
          onClose={() => setShowCapabilities(false)}
          handleApproveTask={handleApproveTask}
          onCreateTask={() => {
            setShowCapabilities(false);
            setShowCreateTask(true);
          }}
        />
      )}
      {showFooterActions && showCreateTask && (
        <DirectTaskModal
          onClose={handleApproveTask}
          targetProviderId={providerId}
        />
      )}
    </>
  );
}
