import React, { useState } from "react";
import ReactDOM from "react-dom";
import { X, User, ChevronDown } from "lucide-react";
import {
  useGetUserRegistryQuery,
  useGetUserProfileQuery,
  useSuspendUserMutation,
  useBanUserMutation,
  useForceLogoutMutation,
  useAppendGovernanceNoteMutation,
  type UserRegistryItem,
} from "../redux/feature/user/userApi";
import {
  useRequestForgottenPasswordOtpMutation,
  useVerifyForgottenPasswordOtpMutation,
} from "../redux/feature/auth/authApi";
import { usePermissions } from "../utils/usePermissions";

const TIER_STYLES: Record<string, string> = {
  SILVER: "bg-gray-200 text-gray-700",
  GOLD: "bg-amber-400 text-white",
  PLATINUM: "bg-slate-700 text-white",
  ENTERPRISE: "bg-indigo-600 text-white",
};

const formatDate = (isoString?: string) => {
  if (!isoString) return "N/A";
  try {
    const d = new Date(isoString);
    return d.toISOString().split("T")[0];
  } catch (e) {
    return isoString;
  }
};

const UsersPage = () => {
  const { can } = usePermissions();
  const canUpdate = can("USERS", "canUpdate");
  const canDelete = can("USERS", "canDelete");
  const canCreate = can("USERS", "canCreate");
  const canModify = canUpdate || canDelete;

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [governanceNote, setGovernanceNote] = useState("");

  // Inline dialog state
  type DialogMode = "suspend" | "ban" | null;
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [dialogReason, setDialogReason] = useState("");
  const [dialogDuration, setDialogDuration] = useState("7");
  const [dialogError, setDialogError] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"request" | "verify">("request");
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");

  // Local Filter Inputs
  const [searchVal, setSearchVal] = useState("");
  const [tierVal, setTierVal] = useState("ALL TIERS");
  const [statusVal, setStatusVal] = useState("ALL STATUSES");
  const [referralVal, setReferralVal] = useState("ALL STATUSES");

  // Applied Query Params for RTK Query
  const [appliedFilters, setAppliedFilters] = useState<{
    page: number;
    limit: number;
    search?: string;
    subscriptionTier?: string;
    status?: string;
    referralStatus?: string;
  }>({
    page: 1,
    limit: 10,
    search: undefined,
    subscriptionTier: undefined,
    status: undefined,
    referralStatus: undefined,
  });

  // Queries
  const { data: registryResponse, isFetching, isError } = useGetUserRegistryQuery(appliedFilters);
  const registryItems = registryResponse?.data?.items || [];
  const meta = registryResponse?.data?.meta;

  const { data: profileResponse, isFetching: isProfileFetching, isError: isProfileError } = useGetUserProfileQuery(
    selectedUserId || "",
    { skip: !selectedUserId }
  );
  const profileData = profileResponse?.data;

  // Mutations
  const [suspendUser, { isLoading: isSuspending }] = useSuspendUserMutation();
  const [banUser, { isLoading: isBanning }] = useBanUserMutation();
  const [requestForgottenPasswordOtp, { isLoading: isRequestingPasswordOtp }] = useRequestForgottenPasswordOtpMutation();
  const [verifyForgottenPasswordOtp, { isLoading: isVerifyingPasswordOtp }] = useVerifyForgottenPasswordOtpMutation();
  const [forceLogout, { isLoading: isForcingLogout }] = useForceLogoutMutation();
  const [appendNote, { isLoading: isAppendingNote }] = useAppendGovernanceNoteMutation();
  const isResettingPassword = isRequestingPasswordOtp || isVerifyingPasswordOtp;

  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showFeedback = (message: string, type: "success" | "error" = "success") => {
    setActionFeedback({ message, type });
    setTimeout(() => {
      setActionFeedback(null);
    }, 4000);
  };

  // Handlers
  const handleApplyFilters = () => {
    setAppliedFilters((prev) => ({
      ...prev,
      page: 1, // Reset to page 1 when applying new filters
      search: searchVal.trim() || undefined,
      subscriptionTier: tierVal === "ALL TIERS" ? undefined : tierVal,
      status: statusVal === "ALL STATUSES" ? undefined : statusVal,
      referralStatus: referralVal === "ALL STATUSES" ? undefined : referralVal,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setAppliedFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleViewProfile = (user: UserRegistryItem) => {
    setSelectedUserId(user.id);
  };

  const handleCloseModal = () => {
    setSelectedUserId(null);
    setGovernanceNote("");
    setActionFeedback(null);
    closeResetDialog();
  };

  const openDialog = (mode: "suspend" | "ban") => {
    setDialogReason("");
    setDialogDuration("7");
    setDialogError("");
    setDialogMode(mode);
  };

  const closeDialog = () => {
    setDialogMode(null);
    setDialogReason("");
    setDialogDuration("7");
    setDialogError("");
  };

  const getSelectedUserEmail = () =>
    profileData?.user.emailIdentity || profileData?.oversight.primaryEmail || "";

  const openResetDialog = () => {
    setResetStep("request");
    setResetEmail(getSelectedUserEmail());
    setResetOtp("");
    setResetNewPassword("");
    setResetConfirmPassword("");
    setResetError("");
    setIsResetDialogOpen(true);
  };

  const closeResetDialog = () => {
    setIsResetDialogOpen(false);
    setResetStep("request");
    setResetEmail("");
    setResetOtp("");
    setResetNewPassword("");
    setResetConfirmPassword("");
    setResetError("");
  };

  const handleDialogConfirm = async () => {
    if (!selectedUserId) return;
    if (!dialogReason.trim()) {
      setDialogError("Reason is required.");
      return;
    }
    if (dialogMode === "suspend") {
      const durationInDays = parseInt(dialogDuration, 10);
      if (isNaN(durationInDays) || durationInDays < 1) {
        setDialogError("Duration must be a positive integer.");
        return;
      }
      try {
        const res = await suspendUser({ userId: selectedUserId, reason: dialogReason.trim(), durationInDays }).unwrap();
        showFeedback(res.message || "User suspended successfully");
        closeDialog();
      } catch (e: any) {
        showFeedback(e.data?.message || "Failed to suspend user", "error");
        closeDialog();
      }
    } else if (dialogMode === "ban") {
      try {
        const res = await banUser({ userId: selectedUserId, reason: dialogReason.trim() }).unwrap();
        showFeedback(res.message || "User banned successfully");
        closeDialog();
      } catch (e: any) {
        showFeedback(e.data?.message || "Failed to ban user", "error");
        closeDialog();
      }
    }
  };

  const handleSuspend = () => openDialog("suspend");
  const handleBan = () => openDialog("ban");

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      setResetError("Email is required.");
      return;
    }
    try {
      const res = await requestForgottenPasswordOtp({ email: resetEmail.trim() }).unwrap();
      setResetStep("verify");
      setResetError("");
      showFeedback(res.message || "Password reset OTP sent");
    } catch (e: any) {
      setResetError(e.data?.message || "Failed to send password reset OTP.");
    }
  };

  const handleVerifyResetPassword = async () => {
    const email = resetEmail.trim();
    const otp = resetOtp.trim();
    const newPassword = resetNewPassword;

    if (!email) {
      setResetError("Email is required.");
      return;
    }
    if (!otp) {
      setResetError("OTP is required.");
      return;
    }
    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== resetConfirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    try {
      const res = await verifyForgottenPasswordOtp({ email, otp, newPassword }).unwrap();
      closeResetDialog();
      showFeedback(res.message || "Password reset successfully");
    } catch (e: any) {
      setResetError(e.data?.message || "Failed to reset password.");
    }
  };

  const handleForceLogout = async () => {
    if (!selectedUserId) return;
    try {
      const res = await forceLogout(selectedUserId).unwrap();
      showFeedback(res.message || "User forced to log out");
    } catch (e: any) {
      showFeedback(e.data?.message || "Failed to force log out", "error");
    }
  };

  const handleAppendNote = async () => {
    if (!selectedUserId || !governanceNote.trim()) return;
    try {
      const res = await appendNote({ userId: selectedUserId, note: governanceNote.trim() }).unwrap();
      showFeedback(res.message || "Note appended to ledger");
      setGovernanceNote("");
    } catch (e: any) {
      showFeedback(e.data?.message || "Failed to append note", "error");
    }
  };

  return (
    <>
    <div className="w-full font-arimo space-y-6">
      <section>
        <h1 className="text-2xl sm:text-[28px] lg:text-[32px] font-bold text-[#000000] uppercase tracking-tight leading-tight">
          User Registry
        </h1>
        <p className="text-[13px] sm:text-[14px] text-gray-400 font-medium mt-1.5 uppercase tracking-[0.03em]">
          Governance and Monitoring of Platform Users, Subscriptions,
          Referrals, and Linked Assets.
        </p>
      </section>

      {/* Filter panel */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-end">
        <div className="flex-1 min-w-0">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
            Search by Email
          </label>
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="e.g. governance@cybertyne.com"
            className="w-full h-[44px] border border-gray-200 rounded-lg px-4 text-[14px] font-medium text-gray-700 placeholder:text-gray-300 focus:border-brand-indigo transition-colors"
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
            Subscription Tier
          </label>
          <div className="relative">
            <select
              value={tierVal}
              onChange={(e) => setTierVal(e.target.value)}
              className="w-full h-[44px] border border-gray-200 rounded-lg px-4 pr-10 text-[14px] font-medium text-gray-700 appearance-none bg-white cursor-pointer focus:border-brand-indigo transition-colors"
            >
              <option value="ALL TIERS">ALL TIERS</option>
              <option value="SILVER">SILVER</option>
              <option value="GOLD">GOLD</option>
              <option value="PLATINUM">PLATINUM</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
            Status
          </label>
          <div className="relative">
            <select
              value={statusVal}
              onChange={(e) => setStatusVal(e.target.value)}
              className="w-full h-[44px] border border-gray-200 rounded-lg px-4 pr-10 text-[14px] font-medium text-gray-700 appearance-none bg-white cursor-pointer focus:border-brand-indigo transition-colors"
            >
              <option value="ALL STATUSES">ALL STATUSES</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="NOT_VERIFIED">NOT VERIFIED</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="BANNED">BANNED</option>
              <option value="DELETED">DELETED</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
            Referral Stage
          </label>
          <div className="relative">
            <select
              value={referralVal}
              onChange={(e) => setReferralVal(e.target.value)}
              className="w-full h-[44px] border border-gray-200 rounded-lg px-4 pr-10 text-[14px] font-medium text-gray-700 appearance-none bg-white cursor-pointer focus:border-brand-indigo transition-colors"
            >
              <option value="ALL STATUSES">ALL STAGES</option>
              <option value="SIGNED_UP">SIGNED UP</option>
              <option value="WEBSITE_VERIFIED">WEBSITE VERIFIED</option>
              <option value="FIRST_BACKLINK_ACCEPTED">FIRST BACKLINK ACCEPTED</option>
              <option value="PAID_SUBSCRIPTION">PAID SUBSCRIPTION</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>
        <button
          onClick={handleApplyFilters}
          className="h-[44px] bg-[#000000] text-white px-7 rounded-lg text-[13px] font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors flex-shrink-0 cursor-pointer"
        >
          Apply Filters
        </button>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-[14px] font-medium uppercase tracking-wide animate-fade-in">
          Failed to load user registry data. Please try again.
        </div>
      )}

      {/* Main Table Card */}
      <div className={`bg-white rounded-xl border border-gray-200 transition-opacity duration-200 ${isFetching ? "opacity-75" : "opacity-100"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#000000]" />
            <h2 className="text-[15px] font-bold text-[#000000] uppercase tracking-[0.05em]">
              Registered Platform Accounts
            </h2>
          </div>
          <span className="text-[13px] font-medium text-gray-400 uppercase tracking-wider">
            {meta?.totalItems ?? 0} Total Accounts Found
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[80px]">
                  User<br /># (ID)
                </th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Email Identity
                </th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Account<br />Type
                </th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Governance<br />Status
                </th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Country
                </th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Assets
                </th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Credits<br />Used /<br />Allowed
                </th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right pr-6">
                  Authority<br />Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {registryItems.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-5">
                    <span className="text-[11px] font-bold text-gray-400 uppercase block leading-tight">
                      USER
                    </span>
                    <span className="text-[15px] font-bold text-[#000000]">
                      {user.userNumber.replace("USER ", "")}
                    </span>
                  </td>
                  <td className="px-4 py-5">
                    <span className="text-[14px] font-bold text-[#000000]">
                      {user.emailIdentity}
                    </span>
                  </td>
                  <td className="px-4 py-5">
                    <span
                      className={`text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider inline-block ${
                        (user.accountType && TIER_STYLES[user.accountType.toUpperCase()]) ||
                        "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {user.accountTypeLabel || "NO PLAN"}
                    </span>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          user.governanceStatus === "ACTIVE"
                            ? "bg-status-verified"
                            : "bg-status-flagged"
                        }`}
                      />
                      <span
                        className={`text-[13px] font-bold uppercase ${
                          user.governanceStatus === "ACTIVE"
                            ? "text-status-verified"
                            : "text-status-flagged"
                        }`}
                      >
                        {user.governanceStatus}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <span className="text-[14px] font-medium text-gray-600">
                      {user.country || "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-5">
                    <span className="text-[20px] font-bold text-[#000000] block leading-none">
                      {user.assets.verified}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                      Verified
                    </span>
                  </td>
                  <td className="px-4 py-5">
                    <span className="text-[14px] font-bold text-[#000000] block leading-tight">
                      {user.credits.displayValue}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">
                      Used: {user.credits.used} / {user.credits.allowed}
                    </span>
                  </td>
                  <td className="px-4 py-5 text-right pr-6">
                    <button
                      onClick={() => handleViewProfile(user)}
                      className="text-[12px] font-bold uppercase tracking-wider hover:underline leading-tight cursor-pointer"
                      style={{ color: "#155DFC" }}
                    >
                      View<br />Profile
                    </button>
                  </td>
                </tr>
              ))}
              {!isFetching && registryItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-400 uppercase tracking-wider font-medium">
                    No registry accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ═══ PAGINATION CONTROLS ═══ */}
        {meta && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl gap-4">
            <span className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
              {meta.totalItems > 0
                ? `Showing ${Math.min((meta.page - 1) * meta.limit + 1, meta.totalItems)}–${Math.min(
                    meta.page * meta.limit,
                    meta.totalItems
                  )} of ${meta.totalItems} accounts`
                : "No accounts"}
            </span>
            {meta.totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePageChange(meta.page - 1)}
                  disabled={!meta.hasPreviousPage}
                  className={`px-3 py-1.5 rounded-lg border text-[13px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    meta.hasPreviousPage
                      ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                  }`}
                >
                  Prev
                </button>
                {Array.from({ length: meta.totalPages }, (_, idx) => {
                  const pNum = idx + 1;
                  const isActive = pNum === meta.page;
                  return (
                    <button
                      key={pNum}
                      onClick={() => handlePageChange(pNum)}
                      className={`w-[32px] h-[32px] rounded-lg text-[13px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#000000] text-white"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(meta.page + 1)}
                  disabled={!meta.hasNextPage}
                  className={`px-3 py-1.5 rounded-lg border text-[13px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    meta.hasNextPage
                      ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] sm:text-[12px] text-gray-400 font-medium leading-relaxed uppercase tracking-wide">
        Account Integrity Protocol: All administrative and governance actions
        are role-stamped, timestamped, and immutably recorded in the
        institutional audit ledger. Modifications to corporate standing or
        verification tiers are subject to secondary oversight review.
        Unauthorized access to sensitive user metadata triggers immediate
        governance escalation.
      </p>

      {/* Selected User Detail Modal */}
      {selectedUserId && ReactDOM.createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 animate-fade-in"
            onClick={handleCloseModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-[650px] max-h-[90vh] overflow-y-auto pointer-events-auto transition-all animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Loading State */}
              {isProfileFetching && !profileData && (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[14px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                    Retrieving Institutional Profile...
                  </p>
                </div>
              )}

              {/* Modal Error State */}
              {isProfileError && (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <p className="text-[14px] font-bold text-red-500 uppercase tracking-widest">
                    Failed to Load Profile Details
                  </p>
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-900 text-white font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-black cursor-pointer"
                  >
                    Close Modal
                  </button>
                </div>
              )}

              {/* Modal Dynamic Content */}
              {profileData && (
                <>
                  <div className="flex items-center justify-between px-7 pt-7 pb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                        <User size={28} className="text-gray-500" />
                      </div>
                      <div>
                        <h2 className="text-[20px] font-bold text-[#000000] uppercase tracking-wide">
                          {profileData.oversight.title}
                        </h2>
                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                          {profileData.oversight.subtitle}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCloseModal}
                      className="p-2 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                    >
                      <X size={22} />
                    </button>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Action Feedback Notification inside Modal */}
                  {actionFeedback && (
                    <div className={`mx-7 mt-4 p-3.5 rounded-lg text-[13px] font-bold uppercase tracking-wider text-center animate-fade-in ${
                      actionFeedback.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
                    }`}>
                      {actionFeedback.message}
                    </div>
                  )}

                  <div className="px-7 py-6 space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Account Status
                        </p>
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[14px] font-bold uppercase ${
                            profileData.oversight.accountStatus === "ACTIVE"
                              ? "bg-[#F0FDF4] text-[#008236]"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              profileData.oversight.accountStatus === "ACTIVE"
                                ? "bg-[#008236]"
                                : "bg-red-500"
                            }`}
                          />
                          {profileData.oversight.accountStatus}
                        </span>
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Authority Clearance
                        </p>
                        <span className="text-[14px] font-bold text-[#000000] border border-gray-200 rounded-lg px-4 py-2 inline-block uppercase tracking-wide">
                          {profileData.oversight.authorityClearance}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          User Name
                        </p>
                        <p className="text-[16px] font-bold text-[#000000]">
                          {profileData.user.name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Primary Email
                        </p>
                        <p className="text-[16px] font-bold text-[#000000] break-all">
                          {profileData.user.emailIdentity}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Registration Date
                        </p>
                        <p className="text-[16px] font-bold text-[#000000]">
                          {formatDate(profileData.oversight.registrationDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Subscription Tier
                        </p>
                        <p className="text-[16px] font-bold" style={{ color: "#155DFC" }}>
                          {profileData.oversight.subscriptionTier}
                        </p>
                      </div>
                    </div>

                    {/* Company / Business Information */}
                    {(profileData.user.companyName || profileData.user.businessType) && (
                      <div className="grid grid-cols-2 gap-8 pt-2 border-t border-gray-50">
                        {profileData.user.companyName && (
                          <div>
                            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                              Company Name
                            </p>
                            <p className="text-[15px] font-bold text-[#000000]">
                              {profileData.user.companyName}
                            </p>
                          </div>
                        )}
                        {profileData.user.businessType && (
                          <div>
                            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                              Business Type
                            </p>
                            <p className="text-[15px] font-bold text-[#000000] uppercase">
                              {profileData.user.businessType}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Institutional Assets */}
                    <div className="border border-gray-200 rounded-xl p-5 bg-gradient-to-b from-white to-gray-50/50">
                      <p className="text-[12px] font-bold text-[#000000] uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                        Institutional Assets
                      </p>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <span className="text-[12px] font-medium text-gray-500 uppercase block">
                            Linked Websites
                          </span>
                          <span className="text-[20px] font-bold text-[#000000]">
                            {profileData.oversight.institutionalAssets.linkedWebsites}
                          </span>
                        </div>
                        <div>
                          <span className="text-[12px] font-medium text-gray-500 uppercase block">
                            Verified Websites
                          </span>
                          <span className="text-[20px] font-bold text-[#000000]">
                            {profileData.oversight.institutionalAssets.verifiedWebsites}
                          </span>
                        </div>
                        <div>
                          <span className="text-[12px] font-medium text-gray-500 uppercase block">
                            Referral Activity
                          </span>
                          <span className="text-[14px] font-bold text-[#000000] uppercase block mt-1">
                            {profileData.oversight.institutionalAssets.referralActivity}
                          </span>
                        </div>
                      </div>

                      {/* Websites details list */}
                      {profileData.assets.websites.length > 0 && (
                        <div className="space-y-2 mt-4 pt-3 border-t border-gray-100">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Registered Websites List
                          </p>
                          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                            {profileData.assets.websites.map((web) => (
                              <div key={web.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 text-[13px]">
                                <div>
                                  <span className="font-bold text-gray-800 block leading-tight">{web.name}</span>
                                  <a href={web.websiteUrl} target="_blank" rel="noreferrer" className="text-[11px] text-[#155DFC] hover:underline block leading-normal mt-0.5">
                                    {web.websiteUrl}
                                  </a>
                                </div>
                                <div className="text-right">
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                                    web.verificationStatus === "VERIFIED" ? "bg-green-50 text-green-700 border border-green-100" : "bg-yellow-50 text-yellow-700 border border-yellow-100"
                                  }`}>
                                    {web.verificationStatus}
                                  </span>
                                  {web.country && (
                                    <span className="text-[10px] text-gray-400 block mt-1 font-medium">{web.country}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Credit reserves & breakdown */}
                    <div className="border border-gray-200 rounded-xl p-5 bg-gradient-to-b from-white to-gray-50/50">
                      <p className="text-[12px] font-bold text-[#000000] uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                        Credit Reserves breakdown
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                            Total Reserves Balance
                          </p>
                          <p className="text-[32px] font-bold text-[#000000] leading-none mb-3">
                            {profileData.oversight.creditReserves.displayValue}
                          </p>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                backgroundColor: "#155DFC",
                                width: `${Math.min(100, Math.max(0, profileData.oversight.creditReserves.progressPercent))}%`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] font-medium text-gray-400 uppercase mt-2">
                            <span>Used: {profileData.oversight.creditReserves.used} CR</span>
                            <span>Available: {profileData.oversight.creditReserves.available} CR</span>
                          </div>
                        </div>

                        {/* Master Wallet details */}
                        <div className="space-y-1.5 text-[12px] bg-white p-3 rounded-lg border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                            Master Wallet allocation
                          </p>
                          <div className="flex justify-between font-medium">
                            <span className="text-gray-500">Subscription Credits:</span>
                            <span className="font-bold text-gray-800">{profileData.credits.masterWallet.subscriptionTaskCredits} CR</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span className="text-gray-500">Earned Task Credits:</span>
                            <span className="font-bold text-gray-800">{profileData.credits.masterWallet.earnedTaskCredits} CR</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span className="text-gray-500">Purchased Credits:</span>
                            <span className="font-bold text-gray-800">{profileData.credits.masterWallet.purchasedTaskCredits} CR</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span className="text-gray-500">Referral Earned Credits:</span>
                            <span className="font-bold text-gray-800">{profileData.credits.masterWallet.referralTaskCredits} CR</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span className="text-gray-500">Visibility Credits:</span>
                            <span className="font-bold text-gray-800">{profileData.credits.masterWallet.visibilityCredits} CR</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Referrals Sent/Received */}
                    {profileData.referral.received.length > 0 && (
                      <div className="border border-gray-200 rounded-xl p-5 bg-gradient-to-b from-white to-gray-50/50">
                        <p className="text-[12px] font-bold text-[#000000] uppercase tracking-wider mb-3">
                          Referral History
                        </p>
                        <div className="space-y-2">
                          {profileData.referral.received.map((ref) => (
                            <div key={ref.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 text-[13px]">
                              <div>
                                <span className="font-bold text-gray-800 block">Code: {ref.codeUsed}</span>
                                <span className="text-[11px] text-gray-400 block mt-0.5">Signed Up: {formatDate(ref.signedUpAt)}</span>
                              </div>
                              <span className="bg-blue-50 text-[#155DFC] text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider border border-blue-100">
                                {ref.currentStage.replace(/_/g, " ")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Governance Enforcement Center — only shown to admins with update/delete on USERS */}
                    {canModify && (
                      <div>
                        <h3 className="text-[14px] font-bold text-[#000000] uppercase tracking-wider mb-4">
                          Governance Enforcement Center
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {canUpdate && (
                            <button
                              onClick={handleSuspend}
                              disabled={isSuspending}
                              className="h-[46px] border border-gray-200 rounded-lg text-[14px] font-bold text-[#000000] uppercase tracking-wider hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSuspending ? "Suspending..." : "Suspend Account"}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={handleBan}
                              disabled={isBanning}
                              className="h-[46px] rounded-lg text-[14px] font-bold text-red-500 uppercase tracking-wider hover:opacity-90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ backgroundColor: "#FEF2F2", border: "1px solid #FFA2A2" }}
                            >
                              {isBanning ? "Banning..." : "Ban Account"}
                            </button>
                          )}
                          {canUpdate && (
                            <button
                              onClick={openResetDialog}
                              disabled={isResettingPassword}
                              className="h-[46px] border border-gray-200 rounded-lg text-[14px] font-bold text-[#000000] uppercase tracking-wider hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isResettingPassword ? "Processing..." : "Reset Password"}
                            </button>
                          )}
                          {canUpdate && (
                            <button
                              onClick={handleForceLogout}
                              disabled={isForcingLogout}
                              className="h-[46px] border border-gray-200 rounded-lg text-[14px] font-bold text-[#000000] uppercase tracking-wider hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isForcingLogout ? "Forcing..." : "Force Logout"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Governance Notes Ledger */}
                    <div className="border-t border-gray-100 pt-5">
                      <h3 className="text-[14px] font-bold text-[#000000] uppercase tracking-wider mb-3">
                        Internal Governance Notes Ledger
                      </h3>
                      {profileData.oversight.governanceNotes.length > 0 ? (
                        <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1 mb-4">
                          {profileData.oversight.governanceNotes.map((note, index) => (
                            <div key={index} className="p-3 bg-yellow-50/50 rounded-lg border border-yellow-100 text-[13px] leading-relaxed">
                              <p className="text-gray-800 font-medium">{note.note}</p>
                              <div className="flex justify-between items-center mt-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                <span>Author: {note.adminName || "System Admin"}</span>
                                <span>{formatDate(note.createdAt)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[13px] font-medium text-gray-400 italic mb-4">
                          No audit notes recorded for this identity.
                        </p>
                      )}

                      {/* Note entry — only shown if admin can create notes */}
                      {canCreate && (
                        <div className="space-y-2">
                          <textarea
                            value={governanceNote}
                            onChange={(e) => setGovernanceNote(e.target.value)}
                            placeholder="Enter audit-linked administrative notes here..."
                            className="w-full h-[100px] border border-gray-200 rounded-lg p-3 text-[14px] font-medium text-gray-700 placeholder:text-gray-300 resize-none focus:border-brand-indigo transition-colors"
                          />
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                              All Notes are Timestamped and Role-Attributed
                            </p>
                            <button
                              onClick={handleAppendNote}
                              disabled={isAppendingNote || !governanceNote.trim()}
                              className="text-[13px] font-bold uppercase tracking-wider hover:underline cursor-pointer text-[#155DFC] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isAppendingNote ? "Appending..." : "Append Note to Ledger"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>

      {/* ─── Password Reset Dialog ─── */}
      {isResetDialogOpen && ReactDOM.createPortal(
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={closeResetDialog} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between px-7 pt-6 pb-4">
                <div>
                  <h3 className="text-[16px] font-bold text-[#000000] uppercase tracking-wider">
                    Reset Password
                  </h3>
                  <p className="text-[12px] font-medium text-gray-400 mt-1 uppercase tracking-wide">
                    {resetStep === "request" ? "Send password reset OTP." : "Verify OTP and set new password."}
                  </p>
                </div>
                <button onClick={closeResetDialog} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer mt-0.5">
                  <X size={18} />
                </button>
              </div>

              <div className="border-t border-gray-100" />

              <div className="px-7 py-5 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => { setResetEmail(e.target.value); setResetError(""); }}
                    disabled={resetStep === "verify"}
                    placeholder="user@example.com"
                    className="w-full h-[44px] border border-gray-200 rounded-lg px-4 text-[14px] font-medium text-gray-700 placeholder:text-gray-300 focus:border-gray-400 transition-colors outline-none disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                {resetStep === "verify" && (
                  <>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                        OTP <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={resetOtp}
                        onChange={(e) => { setResetOtp(e.target.value); setResetError(""); }}
                        placeholder="123456"
                        className="w-full h-[44px] border border-gray-200 rounded-lg px-4 text-[14px] font-medium text-gray-700 placeholder:text-gray-300 focus:border-gray-400 transition-colors outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                        New Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={resetNewPassword}
                        onChange={(e) => { setResetNewPassword(e.target.value); setResetError(""); }}
                        placeholder="StrongPassword123!"
                        className="w-full h-[44px] border border-gray-200 rounded-lg px-4 text-[14px] font-medium text-gray-700 placeholder:text-gray-300 focus:border-gray-400 transition-colors outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={resetConfirmPassword}
                        onChange={(e) => { setResetConfirmPassword(e.target.value); setResetError(""); }}
                        placeholder="Re-enter new password"
                        className="w-full h-[44px] border border-gray-200 rounded-lg px-4 text-[14px] font-medium text-gray-700 placeholder:text-gray-300 focus:border-gray-400 transition-colors outline-none"
                      />
                    </div>
                  </>
                )}

                {resetError && (
                  <p className="text-[12px] font-bold text-red-500 uppercase tracking-wide">{resetError}</p>
                )}
              </div>

              <div className="flex gap-3 px-7 pb-6">
                <button
                  onClick={closeResetDialog}
                  className="flex-1 h-[44px] border border-gray-200 rounded-lg text-[13px] font-bold text-gray-600 uppercase tracking-wider hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                {resetStep === "verify" && (
                  <button
                    onClick={handleResetPassword}
                    disabled={isRequestingPasswordOtp}
                    className="flex-1 h-[44px] border border-gray-200 rounded-lg text-[13px] font-bold text-gray-600 uppercase tracking-wider hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRequestingPasswordOtp ? "Sending..." : "Resend OTP"}
                  </button>
                )}
                <button
                  onClick={resetStep === "request" ? handleResetPassword : handleVerifyResetPassword}
                  disabled={isResettingPassword}
                  className="flex-1 h-[44px] rounded-lg text-[13px] font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-white bg-[#000000] hover:bg-gray-800"
                >
                  {isResettingPassword ? "Processing..." : resetStep === "request" ? "Send OTP" : "Reset Password"}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ─── Custom Suspend / Ban Dialog ─── */}
      {dialogMode && ReactDOM.createPortal(
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={closeDialog} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px] pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Dialog Header */}
              <div className="flex items-start justify-between px-7 pt-6 pb-4">
                <div>
                  <h3 className="text-[16px] font-bold text-[#000000] uppercase tracking-wider">
                    {dialogMode === "suspend" ? "Suspend Account" : "Ban Account"}
                  </h3>
                  <p className="text-[12px] font-medium text-gray-400 mt-1 uppercase tracking-wide">
                    {dialogMode === "suspend"
                      ? "This action will temporarily restrict user access."
                      : "This is a permanent action. User access will be permanently revoked."}
                  </p>
                </div>
                <button onClick={closeDialog} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer mt-0.5">
                  <X size={18} />
                </button>
              </div>

              <div className="border-t border-gray-100" />

              <div className="px-7 py-5 space-y-4">
                {/* Reason */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={dialogReason}
                    onChange={(e) => { setDialogReason(e.target.value); setDialogError(""); }}
                    placeholder={dialogMode === "suspend" ? "e.g. Policy violation, suspicious activity..." : "e.g. Repeated violations, fraud detected..."}
                    maxLength={255}
                    className="w-full h-[90px] border border-gray-200 rounded-lg p-3 text-[14px] font-medium text-gray-700 placeholder:text-gray-300 resize-none focus:border-gray-400 transition-colors outline-none"
                  />
                  <p className="text-[10px] text-gray-300 font-medium text-right mt-0.5">{dialogReason.length}/255</p>
                </div>

                {/* Duration — suspend only */}
                {dialogMode === "suspend" && (
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                      Duration (Days) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={dialogDuration}
                      onChange={(e) => { setDialogDuration(e.target.value); setDialogError(""); }}
                      className="w-full h-[44px] border border-gray-200 rounded-lg px-4 text-[14px] font-medium text-gray-700 focus:border-gray-400 transition-colors outline-none"
                    />
                  </div>
                )}

                {/* Inline error */}
                {dialogError && (
                  <p className="text-[12px] font-bold text-red-500 uppercase tracking-wide">{dialogError}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 px-7 pb-6">
                <button
                  onClick={closeDialog}
                  className="flex-1 h-[44px] border border-gray-200 rounded-lg text-[13px] font-bold text-gray-600 uppercase tracking-wider hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDialogConfirm}
                  disabled={isSuspending || isBanning}
                  className={`flex-1 h-[44px] rounded-lg text-[13px] font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-white ${
                    dialogMode === "ban" ? "bg-red-600 hover:bg-red-700" : "bg-[#000000] hover:bg-gray-800"
                  }`}
                >
                  {(isSuspending || isBanning) ? "Processing..." : dialogMode === "ban" ? "Confirm Ban" : "Confirm Suspend"}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default UsersPage;
