"use client";

import { useState } from "react";
import {
  Database,
  CreditCard,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import ModalShell from "@/components/dashboard/provider/delivery/modals/ModalShell";
import { Button } from "@/components/ui/Button";
import {
  useBuyPurchasedCreditsMutation,
  useBuyVisibilityCreditsMutation,
} from "@/redux/features/api/credit/creditApi";
import { useGetMyWebsitesQuery } from "@/redux/features/api/website/websiteApi";

type CreditType = "purchased" | "visibility";

type Props = {
  open: boolean;
  onClose: () => void;
};

const QUICK_AMOUNTS = [1, 5, 10];

export default function BuyVisibilityCreditModal({ open, onClose }: Props) {
  const [creditType, setCreditType] = useState<CreditType>("purchased");
  const [amount, setAmount] = useState("5");
  const [customAmount, setCustomAmount] = useState("");
  const [selectedWebsiteId, setSelectedWebsiteId] = useState("");
  const [error, setError] = useState("");
  const [buyPurchasedCredits, { isLoading: isBuyingPurchasedCredits }] =
    useBuyPurchasedCreditsMutation();
  const [buyVisibilityCredits, { isLoading: isBuyingVisibilityCredits }] =
    useBuyVisibilityCreditsMutation();
  const { data: websitesResponse, isLoading: isWebsitesLoading } =
    useGetMyWebsitesQuery(
      { page: 1, limit: 100 },
      { skip: !open || creditType !== "visibility" },
    );

  const websites = websitesResponse?.data?.data ?? [];
  const resolvedWebsiteId = selectedWebsiteId || websites[0]?.id || "";
  const isSubmitting = isBuyingPurchasedCredits || isBuyingVisibilityCredits;

  const handleConfirm = async () => {
    const numericAmount = Number(amount);
    setError("");

    if (
      !Number.isFinite(numericAmount) ||
      !Number.isInteger(numericAmount) ||
      numericAmount < 1
    ) {
      setError("Please enter a positive whole-number credit amount.");
      return;
    }

    if (creditType === "visibility" && !resolvedWebsiteId) {
      setError("Please select a website for visibility credits.");
      return;
    }

    try {
      const response =
        creditType === "visibility"
          ? await buyVisibilityCredits({
              websiteId: resolvedWebsiteId,
              amount: numericAmount,
              note: "Buy visibility boost for this website.",
            }).unwrap()
          : await buyPurchasedCredits({
              amount: numericAmount,
              note: "Buy task credits via Stripe checkout.",
            }).unwrap();

      if (response?.data?.url) {
        window.location.href = response.data.url;
        return;
      }

      setError("Checkout session was created, but no Stripe URL was returned.");
    } catch (err) {
      const message =
        err &&
        typeof err === "object" &&
        "data" in err &&
        err.data &&
        typeof err.data === "object" &&
        "message" in err.data
          ? String(err.data.message)
          : "Failed to create checkout session. Please try again.";

      setError(message);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setCreditType("purchased");
      setAmount("5");
      setCustomAmount("");
      setSelectedWebsiteId("");
      setError("");
    }, 200);
  };

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      widthClass="max-w-3xl"
      maxHeightClass="max-w-3xl"
      minHeightClass="min-h-20"
    >
      <FormScreen
        amount={amount}
        setAmount={setAmount}
        customAmount={customAmount}
        setCustomAmount={setCustomAmount}
        creditType={creditType}
        setCreditType={setCreditType}
        setSelectedWebsiteId={setSelectedWebsiteId}
        resolvedWebsiteId={resolvedWebsiteId}
        websites={websites}
        isWebsitesLoading={isWebsitesLoading}
        error={error}
        isSubmitting={isSubmitting}
        onCancel={handleClose}
        onConfirm={handleConfirm}
      />
    </ModalShell>
  );
}

type FormProps = {
  amount: string;
  setAmount: (v: string) => void;
  customAmount: string;
  setCustomAmount: (v: string) => void;
  creditType: CreditType;
  setCreditType: (v: CreditType) => void;
  setSelectedWebsiteId: (v: string) => void;
  resolvedWebsiteId: string;
  websites: {
    id: string;
    name: string;
    websiteUrl: string;
  }[];
  isWebsitesLoading: boolean;
  error: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function FormScreen({
  amount,
  setAmount,
  customAmount,
  setCustomAmount,
  creditType,
  setCreditType,
  setSelectedWebsiteId,
  resolvedWebsiteId,
  websites,
  isWebsitesLoading,
  error,
  isSubmitting,
  onCancel,
  onConfirm,
}: FormProps) {
  return (
    <div className="flex flex-col max-w-3xl marker-class">
      <div className="px-6 pt-6 pb-5  flex items-start gap-4 pr-12">
        <div className="w-12 h-12 rounded-xl bg-[#FFF4ED] border border-[#FDCFBE] flex items-center justify-center shrink-0">
          <Database className="w-6 h-6 text-secondary" />
        </div>
        <div>
          <h2 className="md:text-xl font-bold text-[#181d27]">
            Add Credits to Wallet
          </h2>
          <p className="text-xs font-semibold text-[#535862] uppercase md:tracking-widest mt-0.5">
            Secure Institutional Funding
          </p>
        </div>
      </div>

      <div className="px-4 md:px-8 py-1 space-y-5">
        <p className=" text-gray-900 mb-3">
          Credits are used for escrow deployment, task allocation , and
          automated settlements within the backlyst ecosystem.
        </p>

        <div className="space-y-4 md:space-y-0 md:flex justify-between max-w-md px-8 py-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="option"
              checked={creditType === "purchased"}
              onChange={() => setCreditType("purchased")}
              className="appearance-none w-5 h-5 rounded-full border-2 border-secondary 
                 checked:bg-[#fd751f] checked:ring-2 checked:ring-inset 
                 checked:ring-white focus:outline-none transition-all cursor-pointer"
            />
            <span className="text-sm font-medium">Credits</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer ">
            <input
              type="radio"
              name="option"
              checked={creditType === "visibility"}
              onChange={() => setCreditType("visibility")}
              className="appearance-none w-5 h-5 rounded-full border-2 border-secondary 
                 checked:bg-[#fd751f] checked:ring-2 checked:ring-inset 
                 checked:ring-white focus:outline-none transition-all cursor-pointer"
            />
            <span className="text-sm font-medium">Visibility Credits</span>
          </label>
        </div>
      </div>

      <div className="px-6 py-5 space-y-3">
        {creditType === "visibility" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#535862] uppercase tracking-wide">
              Select Website
            </label>
            <select
              value={resolvedWebsiteId}
              onChange={(e) => setSelectedWebsiteId(e.target.value)}
              disabled={isWebsitesLoading}
              className="w-full border border-[#e9eaeb] rounded-xl px-5 py-4 bg-white text-sm font-semibold text-[#535862] outline-none focus:border-secondary"
            >
              <option value="">
                {isWebsitesLoading ? "Loading websites..." : "Select website"}
              </option>
              {websites.map((website) => (
                <option key={website.id} value={website.id}>
                  {website.name} ({website.websiteUrl})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="text-sm font-medium text-[#535862] uppercase tracking-wide">
          SELECT CREDIT AMOUNT
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
            {QUICK_AMOUNTS.map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => {
                  setAmount(String(qty));
                  setCustomAmount("");
                }}
                className={`h-11 cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                  !customAmount && Number(amount) === qty
                    ? "border-secondary bg-[#FFF4ED] text-secondary"
                    : "border-[#e9eaeb] text-[#535862] hover:border-secondary hover:text-secondary"
                }`}
              >
                +{qty} CR
              </button>
            ))}
          </div>
          <p className="text-xs text-[#9DA4AE]">
            Checkout pricing is calculated by Stripe from your selected amount.
          </p>
        </div>

        <div>
          <p className="text-md font-bold uppercase tracking-widest text-[#535862] mb-3">
            Payment Method
          </p>
          <div className="grid md:grid-cols-2 gap-3 cursor-pointer">
            <PaymentCard
              active
              onClick={() => undefined}
              icon={<CreditCard className="w-6 h-6" />}
              label="Stripe Checkout"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <div className="border border-[#e9eaeb] rounded-xl p-5 space-y-3 max-w-md mx-auto">
          <p className="text-sm font-bold text-[#181d27] uppercase tracking-wide">
            Security &amp; Compliance Protocol
          </p>
          {[
            "Funds are held in institutional escrow",
            "Ledger transactions are encrypted and audited",
            "All credit additions are immutable once confirmed",
          ].map((line) => (
            <div
              key={line}
              className="flex items-start gap-3 text-sm text-[#535862]"
            >
              <Lock className="w-4 h-4 text-[#4169E1] shrink-0 mt-0.5" />
              {line}
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pb-6 pt-2 flex flex-col md:flex-row gap-3 w-full border justify-between">
        <Button variant="white" onClick={onCancel} className=" border-none">
          CANCEL
        </Button>
        <Button
          variant="secondary"
          onClick={onConfirm}
          disabled={isSubmitting || isWebsitesLoading}
          className="rounded-md"
        >
          {isSubmitting ? "CREATING CHECKOUT..." : "CONFIRM & ADD CREDITS"}
          <ArrowUpRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function PaymentCard({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col cursor-pointer max-w-3xl gap-3 p-5 rounded-xl border-2 text-left transition-colors ${
        active
          ? "border-secondary bg-white"
          : "border-[#e9eaeb] bg-white hover:border-secondary/40"
      }`}
    >
      <span className={active ? "text-secondary" : "text-[#9DA4AE]"}>
        {icon}
      </span>
      <span
        className={`text-sm font-bold uppercase tracking-wide ${
          active ? "text-secondary" : "text-[#181d27]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
