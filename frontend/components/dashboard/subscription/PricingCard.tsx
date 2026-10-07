import { PricingCardData } from "@/types/subscription/subscriptionTypes";
import { Check, Sparkles, Globe } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useCheckoutSubscriptionMutation } from "@/redux/features/api/subscription/subscriptionApi";

const getFeatureText = (feature: string | { value: string }) => {
  return typeof feature === "string" ? feature : feature.value;
};

const getFeatureKey = (feature: string | { key?: string; value: string }) => {
  return typeof feature === "string" ? feature : feature.key ?? feature.value;
};

export const PricingCard = ({
  tier,
}: {
  tier: PricingCardData;
}) => {
  const Icon = tier.icon || Globe;
  const safeBilling = ["MONTHLY", "YEARLY"].includes(tier.billingInterval)
  ? tier.billingInterval
  : "MONTHLY";

  const [checkout, { isLoading }] = useCheckoutSubscriptionMutation();

  const handleCheckout = async () => {
    try {
      const res = await checkout({ planId: tier.id }).unwrap();
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (error: any) {
      const message =
        error?.data?.message ||
        error?.message ||
        "Checkout failed. Please check if you already have an active subscription.";
      toast.error(message);
    }
  };

  return (
    <div
      className={`flex-1 min-w-full md:min-w-80 lg:min-w-50 2xl:min-w-80 my-4 bg-white rounded-2xl border shadow-lg flex flex-col justify-between relative ${
        tier.borderColor
      }`}
    >
      {tier.highlighted && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-5 md:-top-4 w-40">
          <span className="bg-secondary flex gap-1 md:gap-3 text-white text-md text-center items-center tracking-wide px-2 py-2 rounded-full shadow-md">
            <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="pt-8 px-8">
        <div className="flex flex-col gap-2 items-center">
          <div className="flex flex-col gap-5 items-center">
            <div
              className={`w-10 h-10 rounded-[28px] flex items-center justify-center ${tier.iconBg}`}
            >
              <Icon
                size={20}
                className={tier.iconColor}
              />
            </div>

            <span
              className={`font-inter font-semibold text-xl leading-7.5 text-center ${tier.iconColor}`}
            >
              {tier.name}
            </span>
          </div>

          <div className="flex items-end justify-center pr-2 relative">
            <span className="font-sora font-semibold relative text-[36px] md:text-[40px] leading-15 tracking-[-0.96px] text-gray-700 flex items-center gap-1">
              <div className="flex items-center">
                <Image
                  width={200}
                  height={200}
                  src="/icon/pound.svg"
                  className="w-7 h-7 md:w-8 md:h-8 pointer-events-none"
                  alt="pound"
                />
                {tier.price}
              </div>

              <div className="font-sora font-bold text-[24px] md:text-[28px] leading-9.5 text-gray-700">
                /mth
              </div>
            </span>
          </div>

          <span className="font-inter font-normal text-base leading-6 text-gray-600 text-center">
            Billed {safeBilling.toLowerCase()}.
          </span>

          <p className="text-sm text-gray-500 text-center">
            {tier.description}
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="p-6 flex flex-col gap-4 min-h-110 md:max-w-70 2xl:max-w-80">
        {tier.features.map((feature) => (
          <div
            key={getFeatureKey(feature)}
            className="flex gap-3 items-center"
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${tier.iconBg}`}
            >
              <Check
                className={`w-4 h-4 ${tier.iconColor}`}
              />
            </div>

            <span className="font-inter font-normal text-base leading-6 text-gray-600">
              {getFeatureText(feature)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-8 py-8">
        <button
          onClick={handleCheckout}
          disabled={isLoading}
          className={`block w-full text-center py-4 rounded-xl font-inter font-semibold text-white text-base transition-all disabled:opacity-50 ${tier.buttonColor}`}
        >
          {isLoading ? "Redirecting..." : "Get started"}
        </button>
      </div>
    </div>
  );
};
