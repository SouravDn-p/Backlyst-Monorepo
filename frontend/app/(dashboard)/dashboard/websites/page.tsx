"use client";

import { useState } from "react";
import {
  Search,
  Eye,
  SquarePen,
  Shield,
  Info,
  Plus,
  EarthIcon,
} from "lucide-react";
import WebsiteWorkspaceModal from "@/components/dashboard/website/Websiteworkspacemodal";
import VerifyWebsiteModal from "@/components/dashboard/website/VerifyWebsiteModal";
import EditWebsiteModal from "@/components/dashboard/website/EditWebsiteModal";
import { Button } from "@/components/ui/Button";
import {
  useGetMyWebsitesQuery,
  useLazyGetWebsiteQuery,
} from "@/redux/features/api/website/websiteApi";
import {
  Website as ApiWebsite,
  WebsiteVerificationStatus,
  WebsiteVerification,
} from "@/types/website/websiteTypes";
import ConnectWebsiteModal from "@/components/dashboard/website/Connectwebsitemodal";

export type LifecycleStatus =
  | "VERIFIED"
  | "PENDING VERIFICATION"
  | "REVIEW REQUIRED"
  | "REJECTED";

export type FilterTab =
  | "ALL"
  | "VERIFIED"
  | "PENDING"
  | "REVIEW REQUIRED"
  | "REJECTED";

export interface Website {
  id: string;
  domain: string;
  host: string;
  status: LifecycleStatus;
  dr: number;
  category: string;
  connectedSince: string;
}

const STATUS_STYLES: Record<LifecycleStatus, string> = {
  VERIFIED: "bg-[#ECFDF3] text-[#027A48]",
  "PENDING VERIFICATION": "bg-[#FFF6ED] text-[#B54708]",
  "REVIEW REQUIRED": "bg-[#f2f4f7] text-[#535862]",
  REJECTED: "bg-[#FEF3F2] text-[#B42318]",
};

const FILTER_TABS: FilterTab[] = [
  "ALL",
  "VERIFIED",
  "PENDING",
  "REVIEW REQUIRED",
  "REJECTED",
];

function matchesFilter(status: LifecycleStatus, tab: FilterTab): boolean {
  if (tab === "ALL") return true;
  if (tab === "VERIFIED") return status === "VERIFIED";
  if (tab === "PENDING") return status === "PENDING VERIFICATION";
  if (tab === "REVIEW REQUIRED") return status === "REVIEW REQUIRED";
  if (tab === "REJECTED") return status === "REJECTED";
  return true;
}

function getVerificationStatusParam(
  tab: FilterTab,
): WebsiteVerificationStatus | undefined {
  if (tab === "VERIFIED") return WebsiteVerificationStatus.VERIFIED;
  if (tab === "PENDING") return WebsiteVerificationStatus.PENDING;
  if (tab === "REVIEW REQUIRED") {
    return WebsiteVerificationStatus.REQUESTED_FOR_MANUAL_REVIEW;
  }
  if (tab === "REJECTED") return WebsiteVerificationStatus.REJECTED;
  return undefined;
}

function getLifecycleStatus(
  status: WebsiteVerificationStatus,
  verifications?: WebsiteVerification[],
): LifecycleStatus {
  if (status === WebsiteVerificationStatus.VERIFIED) return "VERIFIED";

  if (verifications && verifications.length > 0) {
    const latest = verifications[0];
    if (
      latest.status === WebsiteVerificationStatus.REQUESTED_FOR_MANUAL_REVIEW
    ) {
      return "REVIEW REQUIRED";
    }
    if (
      latest.status === WebsiteVerificationStatus.REJECTED ||
      latest.status === WebsiteVerificationStatus.VERIFICATION_FAILED
    ) {
      return "REJECTED";
    }
  }

  if (
    status === WebsiteVerificationStatus.REJECTED ||
    status === WebsiteVerificationStatus.VERIFICATION_FAILED
  ) {
    return "REJECTED";
  }
  if (status === WebsiteVerificationStatus.REQUESTED_FOR_MANUAL_REVIEW) {
    return "REVIEW REQUIRED";
  }
  return "PENDING VERIFICATION";
}

function getDisplayDomain(websiteUrl: string) {
  try {
    return new URL(websiteUrl).hostname;
  } catch {
    return websiteUrl;
  }
}

function getDisplayDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function mapWebsite(website: ApiWebsite): Website {
  return {
    id: website.id,
    domain: getDisplayDomain(website.websiteUrl),
    host: website.name || "MANAGED HOST",
    status: getLifecycleStatus(
      website.verificationStatus,
      website.websiteVerifications,
    ),
    dr: 0,
    category: website.industry?.toUpperCase() || "UNKNOWN",
    connectedSince: getDisplayDate(website.createdAt),
  };
}

export default function YourWebsitesPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [connectOpen, setConnectOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [selectedApiWebsite, setSelectedApiWebsite] =
    useState<ApiWebsite | null>(null);
  const [editApiWebsite, setEditApiWebsite] = useState<ApiWebsite | null>(null);
  const verificationStatus = getVerificationStatusParam(activeTab);
  const {
    data,
    isLoading,
    isFetching: isFetchingWebsites,
    isError,
    refetch: refetchWebsites,
  } = useGetMyWebsitesQuery(
    {
      page: currentPage,
      limit: 10,
      ...(verificationStatus ? { verificationStatus } : {}),
    },
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );
  const [getWebsite, { isFetching: isFetchingWebsite }] =
    useLazyGetWebsiteQuery();
  const websites = data?.data?.data?.map(mapWebsite) ?? [];
  const meta = data?.data?.meta;

  const filtered = websites.filter(
    (w) =>
      matchesFilter(w.status, activeTab) &&
      w.domain.toLowerCase().includes(search.toLowerCase()),
  );

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const openWorkspace = async (website: Website) => {
    try {
      const response = await getWebsite(website.id).unwrap();
      const apiWebsite = response.data;
      const listWebsite = data?.data?.data?.find((w) => w.id === website.id);
      const mergedWebsite = {
        ...apiWebsite,
        websiteVerifications:
          apiWebsite.websiteVerifications || listWebsite?.websiteVerifications,
      };
      setSelectedApiWebsite(mergedWebsite);
      setSelectedWebsite(mapWebsite(mergedWebsite));

      if (
        website.status === "PENDING VERIFICATION" ||
        website.status === "REJECTED" ||
        website.status === "REVIEW REQUIRED"
      ) {
        setVerifyOpen(true);
      } else {
        setWorkspaceOpen(true);
      }
    } catch (error) {
      console.error("Failed to load website details:", error);
    }
  };

  return (
    <>
      <ConnectWebsiteModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onWebsiteCreated={() => {
          setActiveTab("ALL");
          setSearch("");
          setCurrentPage(1);
          void refetchWebsites();
        }}
      />

      <WebsiteWorkspaceModal
        website={selectedWebsite}
        apiWebsite={selectedApiWebsite}
        open={workspaceOpen}
        onClose={() => {
          setWorkspaceOpen(false);
          setSelectedWebsite(null);
          setSelectedApiWebsite(null);
        }}
      />

      <VerifyWebsiteModal
        open={verifyOpen}
        onClose={() => {
          setVerifyOpen(false);
          setSelectedApiWebsite(null);
        }}
        existingWebsite={selectedApiWebsite}
      />

      <EditWebsiteModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditApiWebsite(null);
        }}
        website={editApiWebsite}
      />

      <div className="flex flex-col gap-6 font-inter w-full max-w-[90vw] lg:max-w-[65vw] xl:max-w-[85vw] 2xl:max-w-[90vw] md:mx-auto lg:mx-0">
        <div className="flex flex-col md:flex-row space-y-2 items-start justify-between">
          <div>
            <h1 className="text-xl md:text-[30px] font-semibold font-sora text-[#181d27] leading-none">
              Your Websites
            </h1>
            <p className="text-sm font-medium text-[#535862] mt-1">
              Manage verified domains for backlink fulfillment and authority
              projects.
            </p>
          </div>

          <Button variant="secondary" onClick={() => setConnectOpen(true)}>
            <Plus className="w-4 h-4" />
            CONNECT WEBSITE
          </Button>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9DA4AE]" />
            <input
              type="text"
              placeholder="Search domains..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-[#e2e2e2] rounded-full text-sm text-[#535862] focus:outline-none focus:border-secondary placeholder:text-[#9DA4AE] bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full overflow-x-scroll ">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-4 py-2 rounded-full text-xs cursor-pointer font-semibold border transition-colors whitespace-nowrap ${activeTab === tab
                  ? "bg-secondary text-white border-secondary"
                  : "bg-white text-[#535862] border-[#e2e2e2] hover:border-secondary hover:text-secondary"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-[#e9eaeb] rounded-xl bg-white overflow-hidden overflow-x-scroll">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e9eaeb]">
                {[
                  "Domain",
                  "Lifecycle Status",
                  "DR",
                  "Category",
                  "Connected Since",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-[#535862]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#e9eaeb]">
              {isLoading ||
              (isFetchingWebsites && websites.length === 0) ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-16 text-center text-sm text-[#9DA4AE]"
                  >
                    Loading websites...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-16 text-center text-sm text-red-600"
                  >
                    Failed to load websites.
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((w) => (
                  <tr
                    key={w.id}
                    className="hover:bg-[#fafafa] transition-colors"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-[#e9eaeb] flex items-center justify-center bg-[#f9fafb] shrink-0">
                          <EarthIcon className="w-4 h-4 text-[#535862]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#181d27]">
                            {w.domain}
                          </p>
                          <p className="text-[10px] font-semibold text-[#9DA4AE] tracking-wide mt-0.5">
                            {w.host}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-block text-[10px] font-bold px-3 py-1.5 rounded-full tracking-wide ${STATUS_STYLES[w.status]}`}
                      >
                        {w.status}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-[#181d27]">{w.dr}</p>
                      <p className="text-[10px] font-semibold text-[#9DA4AE] tracking-wide mt-0.5">
                        AUTHORITY
                      </p>
                    </td>

                    <td className="px-6 py-5">
                      <span className="text-[10px] font-semibold text-[#535862] bg-[#f2f4f7] px-3 py-1.5 rounded-full tracking-wide">
                        {w.category}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-sm text-[#535862]">
                      {w.connectedSince}
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => openWorkspace(w)}
                          disabled={isFetchingWebsite}
                          className="text-[#2AB516]  cursor-pointer hover:text-[#22a010] transition-colors"
                          aria-label={`View workspace for ${w.domain}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                     
                        <button
                          onClick={async () => {
                            try {
                              const response = await getWebsite(w.id).unwrap();
                              setEditApiWebsite(response.data);
                              setEditOpen(true);
                            } catch (err) {
                              console.error(
                                "Failed to load website for editing:",
                                err,
                              );
                            }
                          }}
                          disabled={isFetchingWebsite}
                          className="text-[#9DA4AE] hover:text-[#535862] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <SquarePen className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="py-16 text-center text-sm text-[#9DA4AE]"
                  >
                    No websites found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-[#535862]">
            <span>
              Page {meta.page} of {meta.totalPages} • {meta.totalItems} websites
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={!meta.hasPreviousPage}
                className="px-4 py-2 bg-white border border-[#e2e2e2] rounded-lg hover:bg-gray-50 text-[#535862] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((page) => Math.min(meta.totalPages, page + 1))
                }
                disabled={!meta.hasNextPage}
                className="px-4 py-2 bg-white border border-[#e2e2e2] rounded-lg hover:bg-gray-50 text-[#535862] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-[#FFF4ED] border border-[#FDCFBE] rounded-xl p-5 space-y-2">
            <Shield className="w-5 h-5 text-secondary" />
            <p className="text-sm font-bold text-secondary">
              Domain Trust Index
            </p>
            <p className="text-xs text-[#B54708] leading-relaxed">
              Verified websites receive an automatic Trust Score based on
              backlink profile, spam history, and site age. Higher scores unlock
              lower service fees.
            </p>
          </div>

          <div className="bg-white border border-[#e9eaeb] rounded-xl p-5 space-y-2">
            <Info className="w-5 h-5 text-[#535862]" />
            <p className="text-sm font-bold text-[#181d27]">
              Need Manual Review?
            </p>
            <p className="text-xs text-[#535862] leading-relaxed">
              If your site was flagged but you believe it meets our quality
              standards, you can request a manual audit from our editorial team.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
