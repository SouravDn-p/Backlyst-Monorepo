"use client";

import { PricingCard } from "@/components/dashboard/subscription/PricingCard";
import CreditStatement from "@/components/dashboard/wallet/CreditStatement";
import PlanOverview from "@/components/dashboard/wallet/PlanOverview";
import { Button } from "@/components/ui/Button";
import { tierUiConfig } from "@/config/pricing.config";

import { useGetSubscriptionPlansQuery } from "@/redux/features/api/subscription/subscriptionApi";

export default function WalletPage() {
  const { data, isLoading, isError } = useGetSubscriptionPlansQuery();

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Failed to load plans</div>;

  const plans =
    data?.map((plan) => ({
      ...plan,
      billingInterval: plan.billingInterval ?? "MONTHLY",
      ...tierUiConfig[plan.tier],
    })) ?? [];

  return (
    <div className="md:px-4 md:py-8 space-y-10 w-full max-w-[90vw] lg:max-w-[65vw] xl:max-w-[85vw] 2xl:max-w-[90vw] md:mx-auto lg:mx-0">
      <PlanOverview />

      <div className="flex flex-col">
        <h1>Compare Plans</h1>

        <div className="flex gap-2 py-4">
          {plans.map((plan) => (
            <Button
              key={plan.id}
              variant="outline"
              className={`${plan.iconBg}`}
            >
              {plan.name}
            </Button>
          ))}
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
      </div>

      <CreditStatement />
    </div>
  );
}