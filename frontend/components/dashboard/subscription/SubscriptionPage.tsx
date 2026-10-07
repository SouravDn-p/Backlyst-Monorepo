"use client";

import { Crown, Info } from "lucide-react";

import { FreePlanCard } from "./FreePlanCard";
import { PricingCard } from "./PricingCard";
import { SubscriptionHistory } from "./SubscriptionHistory";
import { useCancelSubscriptionMutation, useGetMyActiveSubscriptionQuery, useGetSubscriptionPlansQuery } from "@/redux/features/api/subscription/subscriptionApi";
import { tierUiConfig } from "@/config/pricing.config";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

export default function SubscriptionPage() {
  const { data, isLoading, isError } = useGetSubscriptionPlansQuery();
  const [cancelSubscription] = useCancelSubscriptionMutation();
  const {
      data: activeSubscription,
      isLoading: isActiveSubscriptionLoading,
      isError: isActiveSubscriptionError,
    } = useGetMyActiveSubscriptionQuery();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error loading subscription plans.</div>;
  }

  const plans =
    data?.map((plan) => ({
      ...plan,
      ...tierUiConfig[plan.tier],
    })) ?? [];

  const planName = isActiveSubscriptionLoading
    ? "Loading Plan"
    : activeSubscription?.plan?.name || "No Active Plan";

  const handleCancelSubscription = async () => {
   try {
      await cancelSubscription().unwrap();
      toast.success("Subscription cancelled successfully");
    } catch (error:any) {
      toast.error(error?.data?.message || "Subscription cancelled failed");
    }
  }   

  return (
    <div className="flex flex-col gap-12 lg:gap-20 items-center justify-center w-full max-w-[90vw] lg:max-w-[65vw] xl:max-w-[85vw] 2xl:max-w-[90vw] md:mx-auto lg:mx-0">
      <div className="px-4 lg:px-8 py-8 lg:py-10 text-center max-w-5xl">
        <h2 className="text-3xl lg:text-5xl font-semibold text-gray-900">
          Membership Tiers
        </h2>

        <p className="mt-3 text-base lg:text-xl text-gray-600 max-w-2xl mx-auto">
          Scale your outreach with enterprise-grade tiers management and task
          tracking
        </p>

        <div className="mt-6 inline-flex items-start lg:items-center text-left gap-2 px-3 lg:px-5 py-2.5 bg-white rounded-xl text-sm lg:text-base text-gray-500">
          <Info className="w-4 h-4 lg:w-5 lg:h-5 shrink-0 mt-0.5 lg:mt-0" />
          <span>
            These are verified placements from previously completed tasks.
            Sensitive information has been redacted to maintain network
            integrity.
          </span>
        </div>
      </div>

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
            {/* <Button className="w-full w-fit">Upgrade Plan</Button> */}
            { planName !== 'No Active Plan' && <Button disabled={isActiveSubscriptionLoading} onClick={handleCancelSubscription} className="w-full w-fit bg-red-600">Cancel Subscription</Button>}
          </div>
        </div>
      </div>

      <div className="flex gap-4 lg:gap-8 items-start justify-center w-full px-4 lg:px-0 lg:max-w-full flex-wrap">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="w-full sm:w-auto flex-1 lg:flex-none min-w-full sm:min-w-fit"
          >
            <PricingCard tier={plan} />
          </div>
        ))}
      </div>

      {/* <FreePlanCard /> */}

      <div className="w-full">
        <SubscriptionHistory />
      </div>
    </div>
  );
}