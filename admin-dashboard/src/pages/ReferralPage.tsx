import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
  X,
  ChevronRight,
  AlertTriangle,
  ArrowRight,
  Loader2
} from "lucide-react";
import { 
  useGetReferralRegistryQuery, 
  useToggleReferralFreezeMutation, 
  useGetReferralDetailQuery, 
  useApproveReferralCreditMutation,
  useRevokeReferralCreditMutation,
  useDisableEntityReferralsMutation
} from "@/redux/feature/referral/referralApi";
import { ReferralItem } from "@/redux/feature/referral/referralTypes";
import { usePermissions } from "../utils/usePermissions";

const STATUS_STYLES: Record<string, string> = {
  VERIFIED: "#00C950",
  PENDING: "#FF6900",
  FLAGGED: "#FB2C36",
  REVOKED: "#000000",
};

type ActionModalType = "APPROVE" | "REVOKE" | "DISABLE" | "FREEZE" | "UNFREEZE";

const ReferralPage: React.FC = () => {
  const { can } = usePermissions();
  const canUpdate = can("REFERRALS", "canUpdate");

  const [selectedReferral, setSelectedReferral] = useState<ReferralItem | null>(null);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");
  const [conversion, setConversion] = useState<string>("");

  const { data, isLoading, isFetching } = useGetReferralRegistryQuery({
    page,
    limit: 20,
    ...(status ? { status } : {}),
    ...(conversion ? { conversion } : {}),
  });

  const { data: detailData, isLoading: isLoadingDetail } = useGetReferralDetailQuery(
    selectedReferral?.userReferralId ?? "",
    { skip: !selectedReferral }
  );

  const [toggleFreeze, { isLoading: isToggling }] = useToggleReferralFreezeMutation();
  const [approveCredit, { isLoading: isApproving }] = useApproveReferralCreditMutation();
  const [revokeCredit, { isLoading: isRevoking }] = useRevokeReferralCreditMutation();
  const [disableReferrals, { isLoading: isDisabling }] = useDisableEntityReferralsMutation();

  const [actionModal, setActionModal] = useState<{ isOpen: boolean; type: ActionModalType | null }>({ isOpen: false, type: null });
  const [actionReason, setActionReason] = useState("");
  const [actionAmount, setActionAmount] = useState("");
  const [actionError, setActionError] = useState("");

  const detail = detailData?.data;

  const referrals = data?.data?.items || [];
  const policyText = data?.data?.policy || "One-Credit-Per-User Enforced";
  const meta = data?.data?.meta;
  const isFrozen = data?.data?.emergencyFreeze?.frozen || false;

  const openActionModal = (type: ActionModalType) => {
    setActionError("");
    setActionReason("Manual review completed by compliance admin.");
    if (type === "APPROVE") {
      const defaultAmount = String(detail?.referral.source === "DIRECT_REFERRAL" ? 5 : 100);
      setActionAmount(defaultAmount);
    }
    setActionModal({ isOpen: true, type });
  };

  const handleToggleFreeze = () => openActionModal(isFrozen ? "UNFREEZE" : "FREEZE");
  const handleApproveClick = () => openActionModal("APPROVE");
  const handleRevokeClick = () => openActionModal("REVOKE");
  const handleDisableClick = () => openActionModal("DISABLE");

  const submitAction = async () => {
    setActionError("");
    
    try {
      if (actionModal.type === "FREEZE" || actionModal.type === "UNFREEZE") {
        await toggleFreeze({
          reason: actionReason,
          idempotencyKey: `referral-action-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        }).unwrap();
      } else if (actionModal.type === "APPROVE") {
        if (!selectedReferral) return;
        const creditAmount = Number(actionAmount);
        if (isNaN(creditAmount) || creditAmount <= 0) {
          setActionError("Invalid credit amount.");
          return;
        }
        await approveCredit({
          referralId: selectedReferral.userReferralId,
          creditAmount,
          reason: actionReason,
          idempotencyKey: `approve-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        }).unwrap();
      } else if (actionModal.type === "REVOKE") {
        if (!selectedReferral) return;
        await revokeCredit({
          referralId: selectedReferral.userReferralId,
          reason: actionReason,
          idempotencyKey: `revoke-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        }).unwrap();
      } else if (actionModal.type === "DISABLE") {
        if (!selectedReferral) return;
        await disableReferrals({
          referralId: selectedReferral.userReferralId,
          reason: actionReason,
          target: "REFERRER",
          idempotencyKey: `disable-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        }).unwrap();
      }
      
      setActionModal({ isOpen: false, type: null });
    } catch (err: any) {
      setActionError(err?.data?.message || "Action failed. Please try again.");
    }
  };

  const isActionLoading = isToggling || isApproving || isRevoking || isDisabling;

  return (
    <div className="w-full font-arimo space-y-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <section>
          <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-bold text-[#000000] uppercase tracking-tight leading-tight">
            Referral Attribution Registry
          </h1>
          <p className="text-[13px] sm:text-[14px] text-gray-400 font-medium mt-1.5 uppercase tracking-[0.03em]">
            Operational Console for Incentive Tracking and Compliance.
          </p>
        </section>
        {canUpdate && (
          <button
            onClick={handleToggleFreeze}
            disabled={isToggling}
            className="h-[44px] px-6 rounded-lg text-[13px] font-bold uppercase tracking-wider flex items-center gap-2 transition-opacity hover:opacity-90 flex-shrink-0 disabled:opacity-50"
            style={{ backgroundColor: isFrozen ? "#00C950" : "#E7000B", color: "#FFFFFF" }}
          >
            {isToggling ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <AlertTriangle size={16} />
            )}
            {isFrozen ? "Unfreeze Referrals" : "Freeze Referrals (Emergency)"}
          </button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <select 
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-[42px] border border-gray-200 rounded-lg px-4 pr-10 text-[14px] font-bold text-[#000000] uppercase tracking-wider appearance-none bg-white cursor-pointer focus:border-[#331FFD] transition-colors min-w-[170px]"
            >
              <option value="">ALL STATUSES</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="PENDING">PENDING</option>
              <option value="FLAGGED">FLAGGED</option>
              <option value="REVOKED">REVOKED</option>
            </select>
            <ChevronRight size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select 
              value={conversion}
              onChange={(e) => {
                setConversion(e.target.value);
                setPage(1);
              }}
              className="h-[42px] border border-gray-200 rounded-lg px-4 pr-10 text-[14px] font-bold text-[#000000] uppercase tracking-wider appearance-none bg-white cursor-pointer focus:border-[#331FFD] transition-colors min-w-[195px]"
            >
              <option value="">ALL CONVERSIONS</option>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="NO_CONVERSION">NO CONVERSION</option>
            </select>
            <ChevronRight size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">
          Policy: {policyText.replace(/_/g, " ")}
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pl-6 pr-3 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Referrer / Referred
                </th>
                <th className="px-3 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-3 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Credit<br />(CR)
                </th>
                <th className="px-3 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">
                  Status
                </th>
                <th className="px-3 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Conversion
                </th>
                <th className="pl-3 pr-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">
                  Admin Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 relative">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 text-[#155DFC] animate-spin mx-auto" />
                  </td>
                </tr>
              )}
              {!isLoading && referrals.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-gray-400 font-medium text-[14px]">
                    No referrals found.
                  </td>
                </tr>
              )}
              {!isLoading && referrals.map((ref) => (
                <tr
                  key={ref.referralId}
                  className={`hover:bg-gray-50/50 transition-colors ${isFetching ? "opacity-50" : ""}`}
                >
                  <td className="pl-6 pr-3 py-6">
                    <div className="flex items-center gap-2">
                      <div>
                        <span
                          className="text-[15px] font-bold uppercase block leading-tight cursor-pointer hover:underline"
                          style={{ color: "#155DFC" }}
                        >
                          {ref.referrer.name}
                        </span>
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                          ID: {ref.referralId}
                        </span>
                      </div>
                      <ArrowRight size={16} className="text-gray-300 flex-shrink-0 mx-1" />
                      <span
                        className="text-[15px] font-bold uppercase leading-tight"
                        style={{ color: "#0A0A0A" }}
                      >
                        {ref.referred.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-6">
                    <span
                      className="text-[13px] font-medium uppercase tracking-wider"
                      style={{ color: "#4A5565" }}
                    >
                      {ref.sourceLabel}
                    </span>
                  </td>
                  <td className="px-3 py-6">
                    <span className="text-[22px] font-bold text-[#000000] block leading-none">
                      {ref.creditAmount.toLocaleString()}
                    </span>
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                      CR
                    </span>
                  </td>
                  <td className="px-3 py-6 text-center">
                    <span
                      className="inline-block px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider min-w-[80px] text-center"
                      style={{
                        backgroundColor: STATUS_STYLES[ref.status] || "#364153",
                        color: "#FFFFFF",
                      }}
                    >
                      {ref.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-6">
                    <span
                      className="text-[14px] font-bold uppercase tracking-wider"
                      style={{
                        color:
                          ref.conversion === "PENDING"
                            ? "#F54900"
                            : ref.conversion === "NO_CONVERSION"
                            ? "#6A7282"
                            : "#000000",
                      }}
                    >
                      {ref.conversion.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="pl-3 pr-6 py-6 text-right">
                    <button
                      onClick={() => setSelectedReferral(ref)}
                      className="text-[12px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
                      style={{ backgroundColor: "#155DFC", color: "#FFFFFF" }}
                    >
                      Oversight
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {meta && meta.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">
              Showing Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={!meta.hasPreviousPage}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider border border-gray-200 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={!meta.hasNextPage}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider border border-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
        <div className="px-6 py-5 border-t border-gray-100">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide leading-relaxed">
            Regulatory Disclosure: Referral attributions are derived from verified cross-entity
            authentication. Revocation events trigger immediate credit settlement reversal and affect
            entity trust ratings.
          </p>
        </div>
      </div>
      {selectedReferral && ReactDOM.createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            onClick={() => setSelectedReferral(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between px-7 pt-7 pb-2">
                <div>
                  <h2 className="text-[20px] font-bold text-[#000000] uppercase tracking-wide">
                    Referral Credit Details
                  </h2>
                  <p className="text-[13px] font-medium text-gray-400 mt-1">
                    Details about referral rewards and credit status
                  </p>
                  <p className="text-[12px] font-medium text-gray-400 mt-0.5">
                    ID: {selectedReferral.referralId}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedReferral(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="px-7 pb-7 space-y-6 pt-4 relative">
                {isLoadingDetail && (
                  <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center rounded-b-2xl">
                    <Loader2 className="w-8 h-8 text-[#155DFC] animate-spin" />
                  </div>
                )}
                
                {detail && (
                  <>
                    <div>
                      <h3 className="text-[14px] font-bold text-[#000000] uppercase tracking-wider mb-3">
                        Referral Chain
                      </h3>
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: "#155DFC" }}
                          />
                          <span className="text-[14px] font-medium text-gray-600">
                            Referred by: {detail.chain.referrer.name.charAt(0) + detail.chain.referrer.name.slice(1).toLowerCase().replace(/(^\w|\s\w)/g, m => m.toUpperCase())}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: "#155DFC" }}
                          />
                          <span className="text-[14px] font-medium text-gray-600">
                            Original source: {detail.referral.sourceLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-[#000000] uppercase tracking-wider mb-2">
                        Credit History
                      </h3>
                      <p className="text-[13px] font-medium text-gray-500 mb-3">
                        Credit type: {detail.credit.type}
                      </p>

                      <div className="space-y-3">
                        <div className="bg-[#F9FAFB] rounded-lg p-4 flex items-start justify-between">
                          <div>
                            <p className="text-[14px] font-bold text-[#000000] uppercase tracking-wider">
                              Credit Issued
                            </p>
                            <p className="text-[12px] font-medium text-gray-400 mt-0.5 uppercase">
                              "Standard Conversion Reward"
                            </p>
                          </div>
                          <span className="text-[14px] font-bold text-[#000000]">
                            {detail.credit.totalIssued > 0 ? `${detail.credit.totalIssued} CR` : "0 CR"}
                          </span>
                        </div>
                        <div className="bg-[#F9FAFB] rounded-lg p-4 flex items-start justify-between">
                          <div>
                            <p className="text-[14px] font-bold text-[#000000] uppercase tracking-wider">
                              Verification
                            </p>
                            <p className="text-[12px] font-medium text-gray-400 mt-0.5 uppercase">
                              "Referral Activity Verified Automatically"
                            </p>
                          </div>
                          <span className="text-[14px] font-bold text-[#000000]">
                            {new Date(selectedReferral.createdAt).toISOString().split('T')[0]}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-[#000000] uppercase tracking-wider mb-3">
                        Administrative Actions
                      </h3>
                      {canUpdate ? (
                        <div className="space-y-3">
                          <button
                            onClick={handleApproveClick}
                            disabled={!detail.actions.canApprove}
                            className="w-full h-[52px] rounded-lg text-[14px] font-bold uppercase tracking-wider transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{ backgroundColor: "#DBEAFE", color: "#1447E6" }}
                          >
                            Approve Credit
                          </button>
                          <button 
                            onClick={handleRevokeClick}
                            disabled={!detail.actions.canRevoke}
                            className="w-full h-[52px] border border-gray-200 rounded-lg text-[14px] font-bold text-[#000000] uppercase tracking-wider hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            Revoke Credit
                          </button>
                          <button
                            onClick={handleDisableClick}
                            disabled={!detail.actions.canDisableEntityReferrals}
                            className="w-full h-[52px] border border-gray-200 rounded-lg text-[14px] font-bold uppercase tracking-wider hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{ color: "#E7000B" }}
                          >
                            Disable Entity Referrals
                          </button>
                        </div>
                      ) : (
                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">
                          Read-only access — administrative actions are restricted.
                        </p>
                      )}
                    </div>
                  </>
                )}
                <p
                  className="text-[12px] font-medium uppercase tracking-wide text-center leading-relaxed italic pt-1"
                  style={{ color: "#51A2FF" }}
                >
                  All Attribution Changes Are Role-Stamped.<br />
                  Platform Integrity Verified.
                </p>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {actionModal.isOpen && ReactDOM.createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            onClick={() => !isActionLoading && setActionModal({ isOpen: false, type: null })}
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] pointer-events-auto p-7"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-5">
                <h2 className="text-[18px] font-bold text-[#000000] uppercase tracking-wide">
                  {actionModal.type?.replace("_", " ")} ACTION
                </h2>
                <button
                  onClick={() => !isActionLoading && setActionModal({ isOpen: false, type: null })}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {actionError && (
                <div className="bg-red-50 text-[#E7000B] text-[13px] font-medium p-3 rounded-lg mb-4 flex items-center gap-2">
                  <AlertTriangle size={16} className="flex-shrink-0" />
                  <span className="leading-tight">{actionError}</span>
                </div>
              )}

              <div className="space-y-4">
                {actionModal.type === "APPROVE" && (
                  <div>
                    <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Credit Amount (CR)
                    </label>
                    <input
                      type="number"
                      value={actionAmount}
                      onChange={(e) => setActionAmount(e.target.value)}
                      className="w-full h-[44px] border border-gray-200 rounded-lg px-4 text-[14px] font-medium text-[#000000] focus:border-[#155DFC] focus:ring-1 focus:ring-[#155DFC] outline-none transition-all"
                      placeholder="e.g. 5"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Action Reason
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="w-full h-[80px] border border-gray-200 rounded-lg p-3 text-[14px] font-medium text-[#000000] focus:border-[#155DFC] focus:ring-1 focus:ring-[#155DFC] outline-none transition-all resize-none"
                    placeholder="Enter reason for audit logs..."
                  />
                </div>
                <button
                  onClick={submitAction}
                  disabled={isActionLoading || !actionReason}
                  className="w-full h-[48px] rounded-lg text-[13px] font-bold uppercase tracking-wider transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  style={{ backgroundColor: "#155DFC", color: "#FFFFFF" }}
                >
                  {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Confirm Action
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default ReferralPage;
