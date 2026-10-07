"use client";

import React from "react";

import { PricingCard } from "../dashboard/subscription/PricingCard";
import { FreePlanCard } from "../dashboard/subscription/FreePlanCard";

import { useGetSubscriptionPlansQuery } from "@/redux/features/api/subscription/subscriptionApi";
import { tierUiConfig } from "@/config/pricing.config";

const Pricing = () => {
  const { data, isLoading, isError } = useGetSubscriptionPlansQuery();

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Failed to load pricing plans</div>;

  const plans =
    data?.map((plan) => ({
      ...plan,
      billingInterval: plan.billingInterval ?? "MONTHLY",
      ...tierUiConfig[plan.tier],
    })) ?? [];

  return (
    <section id="pricing" className="py-10 md:py-25 px-6 bg-[#fdfdff]">
      <div className="max-w-360 mx-auto flex flex-col gap-20 items-center justify-center">
        {/* Heading */}
        <h2 className="font-sora font-semibold text-3xl leading-12 md:text-[48px] md:leading-15 tracking-[-0.96px] text-gray-900 text-center">
          Transparent Pricing
        </h2>

        {/* Pricing Cards */}
        <div
          className="
            grid 
            grid-cols-1 
            sm:grid-cols-2 
            lg:grid-cols-3 
            xl:grid-cols-4 
            gap-6 md:gap-6 lg:gap-10 xl:gap-12
            w-full 
            max-w-330 
            mx-auto
            items-start
          "
        >
          {plans.map((tier) => (
            <PricingCard key={tier.id} tier={tier} />
          ))}
        </div>

        {/* Free Plan */}
        <FreePlanCard />
      </div>
    </section>
  );
};

export default Pricing;