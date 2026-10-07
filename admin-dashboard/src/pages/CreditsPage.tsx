import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, X, Lock, Unlock, Search, Globe, Loader2 } from "lucide-react";
import {
  useGetCreditGovernanceSummaryQuery,
  useLockWebsiteWalletMutation,
  useGetWebsiteCreditDetailsQuery,
} from "@/redux/feature/credit/creditApi";
import {
  useGetWebsitesQuery,
  type WebsiteListItem,
} from "@/redux/feature/website/websiteApi";
import { usePermissions } from "../utils/usePermissions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const displayCreditValue = (value?: string) => value ?? "...";

const getStoredAccessToken = () => {
  const sessionToken = sessionStorage.getItem("accessToken");
  if (sessionToken) return sessionToken;
  const storedToken = localStorage.getItem("accessToken");
  const expiry = localStorage.getItem("accessTokenExpiry");
  if (storedToken && (!expiry || Number(expiry) >= Date.now())) {
    return storedToken;
  }
  return null;
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 2 });

const TIER_COLORS: Record<string, string> = {
  FREE: "#6B7280",
  BASIC: "#00A63E",
  PRO: "#155DFC",
  GOLD: "#F59E0B",
  ENTERPRISE: "#8B5CF6",
};
const getTierColor = (tier?: string) =>
  tier ? (TIER_COLORS[tier.toUpperCase()] ?? "#155DFC") : "#155DFC";

const WALLET_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#00A63E",
  LOCKED: "#FB2C36",
  SUSPENDED: "#F59E0B",
};
const getWalletStatusColor = (status?: string) =>
  status ? (WALLET_STATUS_COLORS[status.toUpperCase()] ?? "#6B7280") : "#6B7280";

// ─── Page ─────────────────────────────────────────────────────────────────────
const PAGE_LIMIT = 10;

const CreditsPage = () => {
  // ── Governance summary ────────────────────────────────────────────────────
  const {
    data: governanceSummaryResponse,
    isFetching,
    isError,
    refetch,
  } = useGetCreditGovernanceSummaryQuery();
  const governanceSummary = governanceSummaryResponse?.data;

  const { can } = usePermissions();
  const canUpdate = can("CREDITS", "canUpdate");

  // ── Website picker state ──────────────────────────────────────────────────
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pickerPage, setPickerPage] = useState(1);
  const [allWebsites, setAllWebsites] = useState<WebsiteListItem[]>([]);
  const [hasMoreWebsites, setHasMoreWebsites] = useState(true);
  const [selectedWebsite, setSelectedWebsite] = useState<WebsiteListItem | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: websitesResponse, isFetching: isFetchingWebsites } =
    useGetWebsitesQuery(
      { page: pickerPage, limit: PAGE_LIMIT },
      { skip: !pickerOpen && pickerPage === 1 }
    );

  // seed / accumulate pages
  useEffect(() => {
    if (!websitesResponse?.data?.data) return;
    const newItems = websitesResponse.data.data;
    setAllWebsites((prev) => {
      if (pickerPage === 1) {
        // Always replace page-1 results (handles reopen with cached data)
        return newItems;
      }
      const existingIds = new Set(prev.map((w) => w.id));
      return [...prev, ...newItems.filter((w) => !existingIds.has(w.id))];
    });
    setHasMoreWebsites(websitesResponse.data.meta.hasNextPage);
  }, [websitesResponse]);

  // on picker open: just reset search + page, keep allWebsites (cache stays valid)
  useEffect(() => {
    if (pickerOpen) {
      setSearchQuery("");
      setPickerPage(1);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [pickerOpen]);

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // infinite scroll sentinel
  const handleListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || isFetchingWebsites || !hasMoreWebsites) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60) {
      setPickerPage((p) => p + 1);
    }
  }, [isFetchingWebsites, hasMoreWebsites]);

  // alphabetically sorted + filtered
  const filteredWebsites = [...allWebsites]
    .filter(
      (w) =>
        !searchQuery ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.websiteUrl.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSelectWebsite = (site: WebsiteListItem) => {
    setSelectedWebsite(site);
    setPickerOpen(false);
    setSearchQuery("");
    // sync lock state with wallet
    setIsWalletLocked(false); // will be updated from details response
  };

  // ── Credit details for selected website ───────────────────────────────────
  const { data: creditDetailsResponse, isFetching: isFetchingDetails } =
    useGetWebsiteCreditDetailsQuery(selectedWebsite?.id ?? "", {
      skip: !selectedWebsite,
    });
  const creditDetails = creditDetailsResponse?.data;

  // sync wallet lock status from API
  useEffect(() => {
    if (creditDetails?.wallet?.status) {
      setIsWalletLocked(creditDetails.wallet.status === "LOCKED");
    }
  }, [creditDetails]);

  // ── Summary cards ─────────────────────────────────────────────────────────
  const summaryCards = [
    {
      title: "Subscription Pool",
      subtitle: "Credit",
      value: displayCreditValue(
        governanceSummary?.subscriptionPoolCredits.displayValue
      ),
      color: "#000000",
    },
    {
      title: "Referral Credit",
      value: displayCreditValue(governanceSummary?.referralCredits.displayValue),
      color: "#00A63E",
    },
    {
      title: "Visibility Pool Credit",
      value: displayCreditValue(
        governanceSummary?.visibilityPoolCredits.displayValue
      ),
      color: "#155DFC",
    },
    {
      title: "Earned Credit",
      value: displayCreditValue(governanceSummary?.earnedCredits.displayValue),
      color: "#EC4A0A",
    },
  ];

  // ── Adjustment dialog ─────────────────────────────────────────────────────
  const [adjustmentMode, setAdjustmentMode] = useState<"add" | "remove">("add");
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [adjustWebsiteId, setAdjustWebsiteId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [adjustmentMessage, setAdjustmentMessage] = useState("");
  const [isAdjustingCredits, setIsAdjustingCredits] = useState(false);

  const openAdjustmentDialog = (mode: "add" | "remove") => {
    setAdjustmentMode(mode);
    setAdjustmentMessage("");
    setAdjustWebsiteId(selectedWebsite?.id ?? "");
    setIsAdjustmentDialogOpen(true);
  };

  const closeAdjustmentDialog = () => {
    if (isAdjustingCredits) return;
    setIsAdjustmentDialogOpen(false);
  };

  const handleCreditAdjustment = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setAdjustmentMessage("");
    const amount = Number(creditAmount);
    if (!adjustWebsiteId.trim() || !Number.isFinite(amount) || amount <= 0) {
      setAdjustmentMessage("Website ID and positive credit amount are required.");
      return;
    }
    try {
      setIsAdjustingCredits(true);
      const payload = {
        websiteId: adjustWebsiteId.trim(),
        amount,
        reason: creditReason.trim() || "Manual admin credit adjustment.",
        idempotencyKey: `admin-${adjustmentMode}-${adjustWebsiteId.trim()}-${Date.now()}`,
      };
      const token = getStoredAccessToken();
      const endpoint =
        adjustmentMode === "add"
          ? `/admin/credits/websites/${payload.websiteId}/task-credits`
          : `/admin/credits/websites/${payload.websiteId}/task-credits/remove`;
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";
      const apiResponse = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: payload.amount,
          reason: payload.reason,
          idempotencyKey: payload.idempotencyKey,
        }),
      });
      const response = await apiResponse.json();
      if (!apiResponse.ok || !response.success) {
        throw new Error(response.message || "Credit adjustment failed.");
      }
      setAdjustmentMessage(
        `${response.message}. Balance: ${response.data.balanceBefore} → ${response.data.balanceAfter}`
      );
      setCreditAmount("");
      setCreditReason("");
      refetch();
    } catch (error) {
      setAdjustmentMessage(
        error instanceof Error
          ? error.message
          : "Credit adjustment failed. Try again."
      );
    } finally {
      setIsAdjustingCredits(false);
    }
  };

  // ── Wallet lock dialog ────────────────────────────────────────────────────
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false);
  const [lockWebsiteId, setLockWebsiteId] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [lockMessage, setLockMessage] = useState("");
  const [isWalletLocked, setIsWalletLocked] = useState(false);
  const [lockWebsiteWallet, { isLoading: isLocking }] =
    useLockWebsiteWalletMutation();

  const openLockDialog = () => {
    setLockMessage("");
    setLockWebsiteId(selectedWebsite?.id ?? "");
    setIsLockDialogOpen(true);
  };

  const closeLockDialog = () => {
    if (isLocking) return;
    setIsLockDialogOpen(false);
  };

  const handleWalletLock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLockMessage("");
    if (!lockWebsiteId.trim()) {
      setLockMessage("Website ID is required.");
      return;
    }
    if (!lockReason.trim()) {
      setLockMessage("Reason is required.");
      return;
    }
    try {
      const response = await lockWebsiteWallet({
        websiteId: lockWebsiteId.trim(),
        locked: !isWalletLocked,
        reason: lockReason.trim(),
      }).unwrap();
      setIsWalletLocked(response.data.locked);
      setLockMessage(response.message);
      setLockReason("");
      refetch();
    } catch (error: unknown) {
      const errMsg =
        error &&
        typeof error === "object" &&
        "data" in error &&
        error.data &&
        typeof error.data === "object" &&
        "message" in error.data
          ? String((error.data as { message: string }).message)
          : "Wallet lock operation failed. Try again.";
      setLockMessage(errMsg);
    }
  };

  // ── Derived display values ────────────────────────────────────────────────
  const walletStatus = creditDetails?.wallet?.status ?? (selectedWebsite ? "—" : "—");
  const subscriptionTier =
    creditDetails?.subscription?.tier ?? (selectedWebsite ? "—" : "—");
  const authorName = selectedWebsite?.author?.name ?? "—";
  const websiteName = selectedWebsite
    ? creditDetails?.website?.name ?? selectedWebsite.name
    : "—";
  const websiteUrl = selectedWebsite?.websiteUrl ?? "";
  const websiteInitial = websiteName[0]?.toUpperCase() ?? "?";

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="w-full font-arimo space-y-6">
      {/* Header */}
      <section>
        <h1 className="text-2xl sm:text-[28px] lg:text-[32px] font-bold text-[#000000] uppercase tracking-tight leading-tight">
          Credit Governance Ledger
        </h1>
        <p className="text-[13px] sm:text-[14px] text-gray-400 font-medium mt-1.5 uppercase tracking-[0.03em]">
          Platform-Wide Aggregate Liquidity Monitoring.
        </p>
      </section>

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-red-600">
          Credit governance summary failed to load.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {summaryCards.map((card) => (
          <div key={card.title} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
              {card.title}
            </p>
            {card.subtitle && (
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">
                {card.subtitle}
              </p>
            )}
            <p
              className="text-[32px] lg:text-[36px] font-bold leading-none"
              style={{ color: card.color }}
            >
              {isFetching && !governanceSummary ? "..." : card.value}
            </p>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-2">
              Total Allocated Credits
            </p>
          </div>
        ))}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Credit Used/Available
          </p>
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="text-[22px] lg:text-[26px] font-bold text-[#000000] leading-none">
              {isFetching && !governanceSummary
                ? "..."
                : displayCreditValue(
                    governanceSummary?.creditUsage.used.displayValue
                  )}
            </span>
            <span className="text-[14px] font-medium text-gray-400">/</span>
          </div>
          <p className="text-[22px] lg:text-[26px] font-bold text-[#000000] leading-none mt-0.5">
            {isFetching && !governanceSummary
              ? "..."
              : displayCreditValue(
                  governanceSummary?.creditUsage.available.displayValue
                )}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-[11px] font-bold uppercase tracking-wider mt-2 underline hover:opacity-80"
            style={{ color: "#155DFC" }}
          >
            {isFetching ? "Recalculating" : "Recalculate"}
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left column */}
        <div className="xl:col-span-4 space-y-5">
          {/* Wallet Selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-[14px] font-bold text-[#000000] uppercase tracking-wider">
              Wallet Selector
            </h3>

            {/* Active Website picker */}
            <div ref={pickerRef} className="relative">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Active Website
              </p>
              <button
                type="button"
                id="website-picker-trigger"
                onClick={() => setPickerOpen((v) => !v)}
                className="flex items-center justify-between w-full border border-gray-200 rounded-lg px-4 h-[44px] hover:border-gray-400 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {selectedWebsite ? (
                    <>
                      <Globe size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-[14px] font-medium text-gray-700 truncate">
                        {selectedWebsite.websiteUrl}
                      </span>
                    </>
                  ) : (
                    <span className="text-[14px] font-medium text-gray-400">
                      Select a website…
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 flex-shrink-0 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown */}
              {pickerOpen && (
                <div className="absolute z-40 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                  {/* Search */}
                  <div className="p-2 border-b border-gray-100">
                    <div className="flex items-center gap-2 px-3 h-[36px] bg-gray-50 rounded-lg">
                      <Search size={13} className="text-gray-400 flex-shrink-0" />
                      <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search websites…"
                        className="flex-1 text-[13px] font-medium text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List */}
                  <div
                    ref={listRef}
                    onScroll={handleListScroll}
                    className="overflow-y-auto"
                    style={{ maxHeight: "260px" }}
                  >
                    {filteredWebsites.length === 0 && !isFetchingWebsites ? (
                      <p className="px-4 py-6 text-center text-[12px] font-medium text-gray-400 uppercase tracking-wide">
                        No websites found
                      </p>
                    ) : (
                      filteredWebsites.map((site) => (
                        <button
                          key={site.id}
                          type="button"
                          onClick={() => handleSelectWebsite(site)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                            selectedWebsite?.id === site.id ? "bg-blue-50" : ""
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#1F2937] flex items-center justify-center flex-shrink-0">
                            <span className="text-[11px] font-bold text-white">
                              {site.name[0]?.toUpperCase() ?? "W"}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-gray-800 truncate uppercase">
                              {site.name}
                            </p>
                            <p className="text-[11px] font-medium text-gray-400 truncate">
                              {site.websiteUrl}
                            </p>
                          </div>
                          <span
                            className="ml-auto text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
                            style={{
                              color:
                                site.verificationStatus === "VERIFIED"
                                  ? "#00A63E"
                                  : site.verificationStatus === "PENDING"
                                  ? "#F59E0B"
                                  : "#FB2C36",
                            }}
                          >
                            {site.verificationStatus === "VERIFICATION_FAILED"
                              ? "FAILED"
                              : site.verificationStatus}
                          </span>
                        </button>
                      ))
                    )}

                    {/* Infinite scroll loader */}
                    {isFetchingWebsites && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 size={16} className="animate-spin text-gray-400" />
                        <span className="ml-2 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                          Loading…
                        </span>
                      </div>
                    )}
                    {!hasMoreWebsites && filteredWebsites.length > 0 && !searchQuery && (
                      <p className="px-4 py-3 text-center text-[10px] font-medium text-gray-300 uppercase tracking-wider">
                        All {allWebsites.length} websites loaded
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Wallet metadata */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">
                Linked Account
              </span>
              <span className="text-[14px] font-bold text-[#000000] uppercase truncate max-w-[160px]">
                {isFetchingDetails ? "…" : authorName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">
                Subscription Tier
              </span>
              <span
                className="text-[14px] font-bold uppercase"
                style={{ color: getTierColor(subscriptionTier) }}
              >
                {isFetchingDetails ? "…" : subscriptionTier}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">
                Wallet Status
              </span>
              <span
                className="text-[14px] font-bold uppercase"
                style={{ color: getWalletStatusColor(walletStatus) }}
              >
                {isFetchingDetails ? "…" : walletStatus}
              </span>
            </div>
          </div>

          {/* Authority Console — only shown to admins with CREDITS update permission */}
          {canUpdate && (
            <div
              className="rounded-xl p-5 space-y-3"
              style={{ backgroundColor: "#101828" }}
            >
              <h3 className="text-[14px] font-bold text-white uppercase tracking-wider mb-4">
                Authority Console
              </h3>
              <button
                type="button"
                onClick={() => openAdjustmentDialog("add")}
                className="w-full h-[46px] rounded-lg text-[13px] font-bold text-white uppercase tracking-wider transition-colors hover:bg-white/10"
                style={{ border: "1px solid #FFFFFF33" }}
              >
                Manually Add Credits
              </button>
              <button
                type="button"
                onClick={() => openAdjustmentDialog("remove")}
                className="w-full h-[46px] rounded-lg text-[13px] font-bold text-white uppercase tracking-wider transition-colors hover:bg-white/10"
                style={{ border: "1px solid #FFFFFF33" }}
              >
                Manually Remove Credits
              </button>
              <button
                type="button"
                onClick={openLockDialog}
                className="w-full h-[46px] rounded-lg text-[13px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                style={{
                  backgroundColor: isWalletLocked ? "#00A63E1A" : "#FB2C361A",
                  color: isWalletLocked ? "#00A63E" : "#FB2C36",
                  border: `1px solid ${isWalletLocked ? "#00A63E" : "#FB2C36"}`,
                }}
              >
                {isWalletLocked ? <Unlock size={15} /> : <Lock size={15} />}
                {isWalletLocked ? "Unlock Website Wallet" : "Lock Website Wallet"}
              </button>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="xl:col-span-8 space-y-5">
          {/* Website credit details card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {!selectedWebsite ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Globe size={36} className="text-gray-300" />
                <p className="text-[13px] font-bold text-gray-400 uppercase tracking-wider">
                  Select a website to view credit details
                </p>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="mt-2 px-5 h-[38px] rounded-lg text-[12px] font-bold uppercase tracking-wider text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: "#155DFC" }}
                >
                  Choose Website
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#1F2937] flex items-center justify-center flex-shrink-0">
                      <span className="text-[18px] font-bold text-white">
                        {websiteInitial}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-[18px] font-bold text-[#000000] uppercase tracking-wide">
                        {isFetchingDetails ? "Loading…" : websiteName}
                      </h3>
                      <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">
                        {authorName} • {subscriptionTier} Plan
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="text-[12px] font-bold uppercase tracking-wider"
                      style={{ color: getWalletStatusColor(walletStatus) }}
                    >
                      {walletStatus}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 uppercase">
                      {websiteUrl}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
                  {[
                    {
                      label: "Subscription Cost",
                      value: creditDetails?.subscription?.cost != null
                        ? fmt(creditDetails.subscription.cost)
                        : "—",
                    },
                    {
                      label: "Earned Credit",
                      value: creditDetails?.wallet?.earnedCredits != null
                        ? fmt(creditDetails.wallet.earnedCredits)
                        : "—",
                    },
                    {
                      label: "Referral Credit",
                      value: creditDetails?.wallet?.referralCredits != null
                        ? fmt(creditDetails.wallet.referralCredits)
                        : "—",
                    },
                    {
                      label: "Visibility Credit",
                      value: creditDetails?.wallet?.visibilityCredits != null
                        ? fmt(creditDetails.wallet.visibilityCredits)
                        : "—",
                    },
                    {
                      label: "Credits on Hold",
                      value: creditDetails?.wallet?.creditOnHold != null
                        ? fmt(creditDetails.wallet.creditOnHold)
                        : "—",
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {item.label}
                      </p>
                      <p className="text-[28px] lg:text-[32px] font-bold text-[#000000] leading-none">
                        {isFetchingDetails ? "…" : item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Transaction history */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#000000]" />
                <h2 className="text-[14px] font-bold text-[#000000] uppercase tracking-[0.05em]">
                  Immutable Transaction History
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  Export Audit Trail
                </span>
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  {creditDetails?.transactions?.length ?? 0} Verified Records
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      TX<br />Identifier
                    </th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Type /<br />Reference
                    </th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Institutional<br />Reason
                    </th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Asset<br />Impact
                    </th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Auth / Status
                    </th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right pr-6">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {/* No website selected */}
                  {!selectedWebsite && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center">
                        <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">
                          Select a website to view transaction history
                        </p>
                      </td>
                    </tr>
                  )}

                  {/* Loading */}
                  {selectedWebsite && isFetchingDetails && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 size={16} className="animate-spin text-gray-400" />
                          <span className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">Loading transactions…</span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Empty */}
                  {selectedWebsite && !isFetchingDetails && (!creditDetails?.transactions || creditDetails.transactions.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center">
                        <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">
                          No transactions found for this website.
                        </p>
                      </td>
                    </tr>
                  )}

                  {/* Live data */}
                  {!isFetchingDetails && creditDetails?.transactions?.map((tx) => {
                    const isPositive = tx.signedAmount >= 0;
                    const impactColor = isPositive ? "#00A63E" : "#FB2C36";
                    const impactPrefix = isPositive ? "+" : "";
                    const impactValue = `${impactPrefix}${fmt(Math.abs(tx.signedAmount))}`;

                    // Action badge colors
                    const actionColors: Record<string, { bg: string; text: string }> = {
                      SPEND:   { bg: "#FFF7ED", text: "#CA3500" },
                      EARN:    { bg: "#F0FDF4", text: "#008236" },
                      REFUND:  { bg: "#EFF6FF", text: "#1447E6" },
                      REVERSE: { bg: "#FEF2F2", text: "#FB2C36" },
                      RESERVE: { bg: "#F5F3FF", text: "#6D28D9" },
                    };
                    const badge = actionColors[tx.action.toUpperCase()] ?? { bg: "#F3F4F6", text: "#374151" };

                    // Format timestamp
                    const dt = new Date(tx.createdAt);
                    const datePart = dt.toISOString().slice(0, 10);
                    const timePart = dt.toISOString().slice(11, 19);

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        {/* TX Identifier */}
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-mono font-medium text-gray-500 break-all">
                            {tx.id.slice(0, 16)}…
                          </span>
                        </td>

                        {/* Type / Reference */}
                        <td className="px-4 py-4">
                          <span className="text-[12px] font-bold text-[#000000] uppercase block">
                            {tx.creditType.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] font-medium text-gray-400 uppercase">
                            {tx.action}
                          </span>
                        </td>

                        {/* Institutional Reason */}
                        <td className="px-4 py-4 max-w-[180px]">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                            {tx.reason.replace(/_/g, " ")}
                          </span>
                          {tx.note && (
                            <span className="text-[11px] font-medium text-gray-500 leading-snug block">
                              {tx.note}
                            </span>
                          )}
                        </td>

                        {/* Asset Impact */}
                        <td className="px-4 py-4">
                          <span
                            className="text-[16px] font-bold block leading-none"
                            style={{ color: impactColor }}
                          >
                            {impactValue}
                          </span>
                          <span
                            className="text-[11px] font-bold uppercase"
                            style={{ color: impactColor }}
                          >
                            CR
                          </span>
                        </td>

                        {/* Auth / Status */}
                        <td className="px-4 py-4">
                          <span
                            className="inline-block px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: badge.bg, color: badge.text }}
                          >
                            {tx.action}
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="px-4 py-4 text-right pr-6">
                          <span className="text-[12px] font-medium text-gray-500 whitespace-pre-line leading-tight">
                            {datePart}{"\n"}{timePart}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add / Remove Credits dialog ──────────────────────────────────── */}
      {isAdjustmentDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div
            className="w-full max-w-[520px] rounded-xl p-5 shadow-2xl"
            style={{ backgroundColor: "#101828" }}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="text-[14px] font-bold text-white uppercase tracking-wider">
                  {adjustmentMode === "add"
                    ? "Manually Add Credits"
                    : "Manually Remove Credits"}
                </h3>
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mt-1">
                  Website wallet task credit adjustment
                </p>
              </div>
              <button
                type="button"
                onClick={closeAdjustmentDialog}
                disabled={isAdjustingCredits}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close credit adjustment popup"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreditAdjustment} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Website ID
                </label>
                <input
                  type="text"
                  value={adjustWebsiteId}
                  onChange={(event) => setAdjustWebsiteId(event.target.value)}
                  placeholder="32e5addb-5511-4af3-b6f4-0b4a32c5ddbe"
                  className="mt-1 h-[46px] w-full rounded-lg border border-white/20 bg-transparent px-4 text-[13px] font-medium text-white outline-none placeholder:text-gray-500 focus:border-white/40"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Amount
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={creditAmount}
                  onChange={(event) => setCreditAmount(event.target.value)}
                  placeholder="5"
                  className="mt-1 h-[46px] w-full rounded-lg border border-white/20 bg-transparent px-4 text-[13px] font-medium text-white outline-none placeholder:text-gray-500 focus:border-white/40"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Reason
                </label>
                <textarea
                  value={creditReason}
                  onChange={(event) => setCreditReason(event.target.value)}
                  placeholder="Compensation after manual review."
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-white/20 bg-transparent px-4 py-3 text-[13px] font-medium text-white outline-none placeholder:text-gray-500 focus:border-white/40"
                />
              </div>
              {adjustmentMessage && (
                <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-gray-300">
                  {adjustmentMessage}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAdjustmentDialog}
                  disabled={isAdjustingCredits}
                  className="h-[46px] rounded-lg border border-white/20 text-[12px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjustingCredits}
                  className="h-[46px] rounded-lg text-[12px] font-bold text-white uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor:
                      adjustmentMode === "add" ? "#155DFC" : "#FB2C36",
                  }}
                >
                  {isAdjustingCredits
                    ? "Processing"
                    : adjustmentMode === "add"
                    ? "Add Credits"
                    : "Remove Credits"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Wallet Lock / Unlock dialog ──────────────────────────────────── */}
      {isLockDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div
            className="w-full max-w-[480px] rounded-xl p-5 shadow-2xl"
            style={{ backgroundColor: "#101828" }}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="text-[14px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  {isWalletLocked ? (
                    <Unlock size={16} className="text-[#00A63E]" />
                  ) : (
                    <Lock size={16} className="text-[#FB2C36]" />
                  )}
                  {isWalletLocked
                    ? "Unlock Website Wallet"
                    : "Lock Website Wallet"}
                </h3>
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mt-1">
                  {isWalletLocked
                    ? "Re-enable wallet access for this website."
                    : "Restrict all wallet operations for this website."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLockDialog}
                disabled={isLocking}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close wallet lock dialog"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleWalletLock} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Website ID
                </label>
                <input
                  type="text"
                  value={lockWebsiteId}
                  onChange={(e) => setLockWebsiteId(e.target.value)}
                  placeholder="3e9064f1-319b-4b1b-8c89-bd51877ec2f1"
                  className="mt-1 h-[46px] w-full rounded-lg border border-white/20 bg-transparent px-4 text-[13px] font-medium text-white outline-none placeholder:text-gray-500 focus:border-white/40"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Reason
                </label>
                <textarea
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="Wallet locked during fraud investigation."
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-white/20 bg-transparent px-4 py-3 text-[13px] font-medium text-white outline-none placeholder:text-gray-500 focus:border-white/40"
                />
              </div>
              {lockMessage && (
                <p
                  className="rounded-lg border px-3 py-2 text-[11px] font-medium uppercase tracking-wide"
                  style={{
                    borderColor: lockMessage.toLowerCase().includes("success")
                      ? "#00A63E55"
                      : "#FB2C3655",
                    backgroundColor: lockMessage
                      .toLowerCase()
                      .includes("success")
                      ? "#00A63E15"
                      : "#FB2C3615",
                    color: lockMessage.toLowerCase().includes("success")
                      ? "#00C950"
                      : "#FF6166",
                  }}
                >
                  {lockMessage}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeLockDialog}
                  disabled={isLocking}
                  className="h-[46px] rounded-lg border border-white/20 text-[12px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLocking}
                  className="h-[46px] rounded-lg text-[12px] font-bold text-white uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor: isWalletLocked ? "#00A63E" : "#FB2C36",
                  }}
                >
                  {isLocking
                    ? "Processing..."
                    : isWalletLocked
                    ? "Unlock Wallet"
                    : "Lock Wallet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Credit Compliance ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-[14px] font-bold text-[#000000] uppercase tracking-wider mb-4">
              Credit Compliance Protocol
            </h3>
            <ul className="space-y-2.5">
              {[
                "Credits are strictly non-transferable between material.",
                "Assets maintained in this registry have zero cash redemption value.",
                "Cross-user asset migration is prohibited by governance rule SYS-C02.",
                "All credit cycles are cryptographically logged for forensic audit.",
              ].map((rule, i) => (
                <li
                  key={i}
                  className="text-[12px] font-medium text-gray-500 uppercase tracking-wide flex items-start gap-2"
                >
                  <span className="text-gray-400 flex-shrink-0">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide leading-relaxed">
              Financial Integrity Disclosure: Authority-Level Modifications
              Bypass Standard Settlement Enforcement. Administrator Overrides
              Are Immutably Wallet Library Snapshot Generated Logs.
            </p>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide leading-relaxed mt-3">
              Hypervisor Links
            </p>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide leading-relaxed mt-1">
              Operational Oversight →
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[12px] font-medium text-gray-400 uppercase tracking-wider flex-wrap gap-2">
        <span>Management Environment V5 4.1</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00C950]" />
          <span>Platform Integrity Verified</span>
        </div>
        <span>Status Confidentiality Protocol Active</span>
      </div>
    </div>
  );
};

export default CreditsPage;
