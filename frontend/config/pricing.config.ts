import {
  Globe,
  Star,
  ShieldCheck,
  Building2,
} from "lucide-react";

import { TierType } from "@/types/subscription/subscriptionTypes";

export const tierUiConfig: Record<
  TierType,
  {
    icon: React.ElementType;
    highlighted?: boolean;
    buttonColor: string;
    iconBg: string;
    iconColor: string;
    borderColor: string;
  }
> = {
  FREE: {
    icon: Globe,
    highlighted: false,
    buttonColor: "bg-[#405881]",
    iconBg: "bg-gray-200",
    iconColor: "text-gray-500",
    borderColor: "border-gray-200",
  },

  SILVER: {
    icon: Globe,
    highlighted: false,
    buttonColor: "bg-[#405881]",
    iconBg: "bg-gray-200",
    iconColor: "text-gray-500",
    borderColor: "border-gray-200",
  },

  GOLD: {
    icon: Star,
    highlighted: true,
    buttonColor: "bg-[#7C6C3E]",
    iconBg: "bg-[#FFF1E9]",
    iconColor: "text-[#FD751F]",
    borderColor: "border-secondary",
  },

  PLATINUM: {
    icon: ShieldCheck,
    highlighted: false,
    buttonColor: "bg-[#473586]",
    iconBg: "bg-gray-200",
    iconColor: "text-gray-500",
    borderColor: "border-gray-200",
  },

  ENTERPRISE: {
    icon: Building2,
    highlighted: false,
    buttonColor: "bg-[#2C2B31]",
    iconBg: "bg-gray-200",
    iconColor: "text-gray-500",
    borderColor: "border-gray-200",
  },
};