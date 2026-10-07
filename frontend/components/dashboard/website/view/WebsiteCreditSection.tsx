"use client";

import { Calendar, Coins, TrendingUp, Zap } from "lucide-react";
import CreditCard from "../CreditCard";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreditBalances {
  subscriptionTaskCredits: number;
  earnedTaskCredits: number;
  allocatedPurchasedCredits: number;
  allocatedReferralCredits: number;
  visibilityCredits: number;
  totalTaskCredits: number;
}

interface CreditMeta {
  totalTransactions: number;
  latestActivityAt?: string | null;
}

interface MasterCredits {
  purchasedTaskCredits: number;
}

interface WebsiteCreditSectionProps {
  // feedback messages
  actionMessage: string;
  actionError: string;
  setActionMessage: (v: string) => void;
  setActionError: (v: string) => void;

  // loading / async states
  isCreditLoading: boolean;
  isAllocating: boolean;
  isBuyingVisibility: boolean;

  // data
  balances?: CreditBalances;
  meta?: CreditMeta;
  masterCredits?: MasterCredits;

  // allocate form state
  allocateAmount: string;
  setAllocateAmount: (v: string) => void;
  allocateNote: string;
  setAllocateNote: (v: string) => void;
  showAllocateForm: boolean;
  setShowAllocateForm: (fn: (prev: boolean) => boolean) => void;

  // visibility form state
  visibilityAmount: string;
  setVisibilityAmount: (v: string) => void;
  visibilityNote: string;
  setVisibilityNote: (v: string) => void;
  showVisibilityForm: boolean;
  setShowVisibilityForm: (fn: (prev: boolean) => boolean) => void;

  // handlers
  handleAllocateCredits: () => Promise<void>;
  handleBuyVisibility: () => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WebsiteCreditSection({
  actionMessage,
  actionError,
  setActionMessage,
  setActionError,
  isCreditLoading,
  isAllocating,
  isBuyingVisibility,
  balances,
  meta,
  masterCredits,
  allocateAmount,
  setAllocateAmount,
  allocateNote,
  setAllocateNote,
  showAllocateForm,
  setShowAllocateForm,
  visibilityAmount,
  setVisibilityAmount,
  visibilityNote,
  setVisibilityNote,
  showVisibilityForm,
  setShowVisibilityForm,
  handleAllocateCredits,
  handleBuyVisibility,
}: WebsiteCreditSectionProps) {
  // ── Internal toggle helpers ──────────────────────────────────────────────
  const openAllocateForm = () => {
    setShowAllocateForm((v) => !v);
    setShowVisibilityForm(() => false);
    setActionError("");
    setActionMessage("");
  };

  const openVisibilityForm = () => {
    setShowVisibilityForm((v) => !v);
    setShowAllocateForm(() => false);
    setActionError("");
    setActionMessage("");
  };

  const cancelAllocate = () => {
    setShowAllocateForm(() => false);
    setActionError("");
  };

  const cancelVisibility = () => {
    setShowVisibilityForm(() => false);
    setActionError("");
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="mx-6 mb-4 space-y-4">
      {/* Feedback banners */}
      {actionMessage && (
        <div className="bg-[#ECFDF3] border border-[#6CE9A6] rounded-xl px-4 py-3 text-sm font-semibold text-[#027A48]">
          {actionMessage}
        </div>
      )}
      {actionError && (
        <div className="bg-[#FEF3F2] border border-[#FDA29B] rounded-xl px-4 py-3 text-sm font-semibold text-[#B42318]">
          {actionError}
        </div>
      )}

      {/* Balance Cards */}
      {isCreditLoading ? (
        <div className="bg-[#f9fafb] rounded-xl p-6 text-center text-sm text-[#9DA4AE]">
          Loading credit balances...
        </div>
      ) : balances ? (
        <div className="bg-[#f9fafb] rounded-xl p-4 space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-[#535862]">
              Credit Balances
            </p>
            {meta && (
              <div className="flex items-center gap-3 text-[10px] text-[#9DA4AE]">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {meta.totalTransactions} transactions
                </span>
                {meta.latestActivityAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDateTime(meta.latestActivityAt)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Credit cards grid */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            <CreditCard
              label="Subscription"
              value={balances.subscriptionTaskCredits}
              color="blue"
            />
            <CreditCard
              label="Earned"
              value={balances.earnedTaskCredits}
              color="green"
            />
            <CreditCard
              label="Purchased"
              value={balances.allocatedPurchasedCredits}
              color="orange"
            />
            <CreditCard
              label="Referral"
              value={balances.allocatedReferralCredits}
              color="purple"
            />
            <CreditCard
              label="Visibility"
              value={balances.visibilityCredits}
              color="pink"
            />
            <CreditCard
              label="Total Task"
              value={balances.totalTaskCredits}
              color="dark"
              bold
            />
          </div>

          {/* Master purchased credits indicator */}
          {masterCredits && (
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-[#e9eaeb]">
              <Coins className="w-3.5 h-3.5 text-secondary" />
              <span className="text-xs text-[#535862]">
                Master Purchased Credits available to allocate:{" "}
                <span className="font-bold text-[#181d27]">
                  {masterCredits.purchasedTaskCredits}
                </span>
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={openAllocateForm}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-[#e9eaeb] hover:border-secondary hover:text-secondary text-[#535862] text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Coins className="w-4 h-4" />
              ALLOCATE PURCHASED CREDITS
            </button>
            <button
              onClick={openVisibilityForm}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-[#e9eaeb] hover:border-secondary hover:text-secondary text-[#535862] text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              BUY VISIBILITY CREDITS
            </button>
          </div>

          {/* Allocate form */}
          {showAllocateForm && (
            <div className="bg-white border border-[#e9eaeb] rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[#181d27]">
                Allocate Purchased Credits
              </p>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#535862] mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  min="1"
                  value={allocateAmount}
                  onChange={(e) => setAllocateAmount(e.target.value)}
                  placeholder="5"
                  className="w-full border border-[#e9eaeb] rounded-xl px-4 py-2.5 text-sm text-[#181d27] placeholder:text-[#9DA4AE] focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#535862] mb-1">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={allocateNote}
                  onChange={(e) => setAllocateNote(e.target.value)}
                  placeholder="Allocate purchased credits to this website."
                  className="w-full border border-[#e9eaeb] rounded-xl px-4 py-2.5 text-sm text-[#181d27] placeholder:text-[#9DA4AE] focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAllocateCredits}
                  disabled={isAllocating || !allocateAmount}
                  className="flex items-center gap-2 bg-secondary hover:bg-[#d94118] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
                >
                  {isAllocating ? "ALLOCATING..." : "ALLOCATE"}
                </button>
                <button
                  onClick={cancelAllocate}
                  className="text-xs font-semibold text-[#535862] hover:text-[#181d27] px-3 transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {/* Visibility buy form */}
          {showVisibilityForm && (
            <div className="bg-white border border-[#e9eaeb] rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[#181d27]">
                Buy Visibility Credits
              </p>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#535862] mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  min="1"
                  value={visibilityAmount}
                  onChange={(e) => setVisibilityAmount(e.target.value)}
                  placeholder="2"
                  className="w-full border border-[#e9eaeb] rounded-xl px-4 py-2.5 text-sm text-[#181d27] placeholder:text-[#9DA4AE] focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#535862] mb-1">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={visibilityNote}
                  onChange={(e) => setVisibilityNote(e.target.value)}
                  placeholder="Buy visibility boost for this website."
                  className="w-full border border-[#e9eaeb] rounded-xl px-4 py-2.5 text-sm text-[#181d27] placeholder:text-[#9DA4AE] focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="flex items-start gap-3 bg-[#FFF4ED] border border-[#FDCFBE] rounded-xl px-4 py-2.5">
                <Zap className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <p className="text-xs text-[#B54708]">
                  You will be redirected to Stripe to complete the payment.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleBuyVisibility}
                  disabled={isBuyingVisibility || !visibilityAmount}
                  className="flex items-center gap-2 bg-secondary hover:bg-[#d94118] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
                >
                  {isBuyingVisibility ? "PROCESSING..." : "BUY VISIBILITY"}
                </button>
                <button
                  onClick={cancelVisibility}
                  className="text-xs font-semibold text-[#535862] hover:text-[#181d27] px-3 transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}