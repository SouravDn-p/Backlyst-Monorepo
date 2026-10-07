"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ActionLinkVariant = "default" | "outline";
type IconPosition = "left" | "right";

interface ActionLinkProps {
  href: string;
  label: string;
  variant?: ActionLinkVariant;
  className?: string;
  icon?: React.ReactNode;
  iconPosition?: IconPosition;
}

const variantClasses: Record<ActionLinkVariant, string> = {
  default:
    "flex items-center gap-2 text-lg font-medium leading-7 hover:underline",

  outline:
    "flex items-center gap-2.5 px-5 py-2.5 bg-white border border-[#fea369] rounded-full text-sm font-medium text-[#fd751f] hover:bg-orange-50 transition-colors",
};

const ActionLink: React.FC<ActionLinkProps> = ({
  href,
  label,
  variant = "default",
  className,
  icon,
  iconPosition = "right",
}) => {
  return (
    <Link href={href} className={cn(variantClasses[variant], className)}>
      {icon && iconPosition === "left" && icon}
      <span>{label}</span>
      {icon && iconPosition === "right" && icon}
    </Link>
  );
};

export default ActionLink;
