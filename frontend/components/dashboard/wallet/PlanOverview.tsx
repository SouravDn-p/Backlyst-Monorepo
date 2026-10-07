"use client";

import { Button } from "@/components/ui/Button";
import {
  CreditCard,
  Info,
  FileText,
  Check,
  ListRestartIcon,
  ShoppingBag,
  Crown,
  Globe,
  Funnel,
  CirclePlay,
  Star,
  Badge,
  CheckCircle,
} from "lucide-react";
import BuyVisibilityCreditModal from "../provider/visivility/Buyvisibilitycreditmodal";
import { useState } from "react";
import { useGetCreditsMeQuery, useGetMyDashboardCreditSummaryQuery } from "@/redux/features/api/credit/creditApi";
import { useCancelSubscriptionMutation, useGetMyActiveSubscriptionQuery } from "@/redux/features/api/subscription/subscriptionApi";
import { SubscriptionFeature } from "@/types/subscription/subscriptionTypes";
import { toast } from "sonner";

type PlanBenefit = {
  icon: React.ElementType;
  title: string;
  key?: string;
};

const benefitIcons = [Globe, CheckCircle, CirclePlay, Star, Funnel, Badge];

const getFeatureText = (feature: SubscriptionFeature) =>
  typeof feature === "string" ? feature : feature.value;

const getFeatureKey = (feature: SubscriptionFeature, index: number) =>
  typeof feature === "string" ? feature : feature.key || `feature-${index}`;

export default function PlanOverview() {
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const {
    data: creditSummary,
    isLoading: isCreditSummaryLoading,
    isError: isCreditSummaryError,
  } = useGetMyDashboardCreditSummaryQuery();

  const { data: creditsMe, isLoading: isCreditsMeLoading, isError: isCreditsMeError, } = useGetCreditsMeQuery();
  const [cancelSubscription, { isLoading: isCancellingSubscription }] =
    useCancelSubscriptionMutation();

  const {
    data: activeSubscription,
    isLoading: isActiveSubscriptionLoading,
    isError: isActiveSubscriptionError,
    error: activeSubscriptionError,
  } = useGetMyActiveSubscriptionQuery();

  const isSubscriptionNotFound =
    isActiveSubscriptionError &&
    activeSubscriptionError != null &&
    "status" in activeSubscriptionError &&
    activeSubscriptionError.status === 404 &&
    "data" in activeSubscriptionError &&
    typeof activeSubscriptionError.data === "object" &&
    activeSubscriptionError.data != null &&
    "message" in activeSubscriptionError.data &&
    activeSubscriptionError.data.message === "Subscription not found";

  const hasActiveSubscription = Boolean(activeSubscription?.plan);
  const planName = isActiveSubscriptionLoading
    ? "Loading Plan"
    : isActiveSubscriptionError && !isSubscriptionNotFound
      ? "Plan Unavailable"
      : activeSubscription?.plan?.name || "No Active Plan";
  const planBenefits: PlanBenefit[] =
    activeSubscription?.plan?.features?.map(
      (feature: SubscriptionFeature, index: number) => ({
        icon: benefitIcons[index % benefitIcons.length],
        title: getFeatureText(feature),
        key: getFeatureKey(feature, index),
      })
    ) ?? [];
  const benefitsTitle = activeSubscription?.plan?.name
    ? `${activeSubscription.plan.name} Benefits`
    : "Plan Benefits";
  const monthlyCredits =
    activeSubscription?.plan?.monthlyTaskCreditAllowance ??
    activeSubscription?.credits?.planCredits;
  const maxTaskCapacity = activeSubscription?.plan?.maxTaskCreditCapacity;

  const summaryValue = (
    value: number | undefined,
    isLoading: boolean,
    isError: boolean
  ) => {
    if (isLoading) return "...";
    if (isError) return "Unavailable";
    return value?.toLocaleString() ?? "0";
  };

    const handleCancelSubscription = async () => {
     try {
        await cancelSubscription().unwrap();
        toast.success("Subscription cancelled successfully");
      } catch (error: unknown) {
        const message =
          typeof error === "object" &&
          error != null &&
          "data" in error &&
          typeof error.data === "object" &&
          error.data != null &&
          "message" in error.data &&
          typeof error.data.message === "string"
            ? error.data.message
            : "Subscription cancellation failed";

        toast.error(message);
      }
    }   

  return (
    <div className="space-y-8 w-full max-w-[90vw] lg:max-w-[65vw] xl:max-w-[85vw] 2xl:max-w-[90vw] md:mx-auto lg:mx-0">
      <BuyVisibilityCreditModal
        open={buyModalOpen}
        onClose={() => setBuyModalOpen(false)}
      />
      <div className="px-2 md:px-6 py-4 bg-white rounded-2xl border border-gray-200 w-full">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Your Plan Overview
            </h2>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              Your plan defines how many websites, credits, and tasks you can
              run each month.
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <span className="inline-flex items-center gap-1.5 w-full px-3 py-1.5 bg-[#FEDF89] text-[#DC6803] rounded-full font-medium text-sm">
              <span className="text-amber-600">
                <Crown className="w-4 h-4" />
              </span>
              {planName}
            </span>
            <Button className="w-full w-fit">Upgrade Plan</Button>
            {hasActiveSubscription && (
              <Button
                disabled={isCancellingSubscription}
                onClick={handleCancelSubscription}
                className="w-full w-fit bg-red-600"
              >
                {isCancellingSubscription
                  ? "Cancelling..."
                  : "Cancel Subscription"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 ">
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200">
            <h3 className="text-sm font-medium text-[#DC6803] mb-4 bg-[#FEDF89] w-fit px-3 py-2 rounded-full">
              {benefitsTitle}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isActiveSubscriptionLoading ? (
                <p className="text-sm text-gray-600">
                  Loading plan benefits...
                </p>
              ) : isSubscriptionNotFound ? (
                <p className="text-sm text-gray-600">
                  No active subscription.
                </p>
              ) : isActiveSubscriptionError ? (
                <p className="text-sm text-red-600">
                  Failed to load plan benefits.
                </p>
              ) : !hasActiveSubscription ? (
                <p className="text-sm text-gray-600">
                  No active subscription.
                </p>
              ) : planBenefits.length === 0 ? (
                <p className="text-sm text-gray-600">
                  No benefits are listed for this plan.
                </p>
              ) : (
                planBenefits.map((benefit, i) => {
                  const Icon = benefit.icon;
                  return (
                    <div
                      key={benefit.key ?? i}
                      className="flex items-start gap-3"
                    >
                      <div className="bg-[#FEDF89] p-1 rounded-sm">
                        <Check className="text-[#DC6803] mt-0.5" size={24} />
                      </div>
                      <div className="flex gap-2 ">
                        <Icon className="w-5 h-5 text-[#FFB900] mt-2" />
                        <span className="text-gray-700 mt-1">
                          {benefit.title}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Info size={20} className="text-indigo-600" />
              How Credits Work
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:px-12">
              <div className="space-y-4">
                <div className="flex items-center gap-3 border border-gray-50! p-4 rounded-md ">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      Backlink task costs
                    </p>
                    <p className="text-sm text-gray-600">1 credit</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 border border-gray-50! p-4 rounded-md ">
                  <div className="w-10 h-10 rounded-lg bg-[#51A2FF]/20 flex items-center justify-center text-[#51A2FF]">
                    <ListRestartIcon size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      Credits reset monthly
                    </p>
                    <p className="text-sm text-gray-600">
                      {monthlyCredits
                        ? `${monthlyCredits} credits from your plan`
                        : "Based on your plan"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 border border-gray-50! p-4 rounded-md ">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      Guest post task costs
                    </p>
                    <p className="text-sm text-gray-600">2 credits</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border border-gray-50! p-4 rounded-md ">
                  <div className="w-10 h-10 rounded-lg bg-[#FFB900]/20 flex items-center justify-center text-[#FFB900]">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      Guest post task costs
                    </p>
                    <p className="text-sm text-gray-600">2 credits</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4 h-fit">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Credits Summary
          </h3>

          

          <div className="space-y-4 overflow-x-scroll">

            <div className="border border-gray-50! p-3 rounded-lg">
              <p className="text-sm text-gray-600">Total Task Credits</p>
              <div className="text-3xl font-bold text-green-600 mt-1">
                {summaryValue(
                  creditsMe?.totalTaskCredits,
                  isCreditsMeLoading,
                  isCreditsMeError
                )}
              </div>
            </div>

              <div className="border border-gray-50! p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                Subscription Credits
              </p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                {summaryValue(
                  creditsMe?.subscriptionCredits,
                  isCreditsMeLoading,
                  isCreditsMeError
                )}
              </p>
            </div>

            <div className="border border-gray-50! p-3 rounded-lg">
              <p className="text-sm text-gray-600">Available Credits</p>
              <div className="text-3xl font-bold text-green-600 mt-1">
                {summaryValue(
                  creditsMe?.purchasedTaskCredits,
                  isCreditsMeLoading,
                  isCreditsMeError
                )}
              </div>
            </div>
            

            <div className="border border-gray-50! p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                Available Visibility Credits
              </p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                {summaryValue(
                  creditsMe?.visibilityCredits,
                  isCreditsMeLoading,
                  isCreditsMeError
                )}
              </p>
            </div>

            <div className="border border-gray-50! p-3 rounded-lg">
              <p className="text-sm text-gray-600">Used This Month</p>
              <p className="text-xl font-semibold text-gray-800 mt-1">
                {summaryValue(
                  creditSummary?.usedThisMonth,
                  isCreditSummaryLoading,
                  isCreditSummaryError
                )}
              </p>
            </div>

            <div className="border border-gray-50! p-3 rounded-lg">
              <p className="text-sm text-gray-600">Maximum Capacity</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                {summaryValue(
                  maxTaskCapacity ?? creditSummary?.maximumCapacity,
                  maxTaskCapacity === undefined && isCreditSummaryLoading,
                  maxTaskCapacity === undefined && isCreditSummaryError
                )}
              </p>
            </div>
            <div className="border border-gray-50! text-[#331FFD] p-3 rounded-lg font-semibold bg-[#2B7FFF4D]">
              <p className="text-sm">1 backlink = 1 credit</p>
              <p className="text-sm mt-1">1 guest post = 2 credits</p>
            </div>

            <Button className="w-full" onClick={() => setBuyModalOpen(true)}>
              Add Credit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
