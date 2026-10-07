"use client";

import React from "react";
import Link from "next/link";

interface CTAButton {
  label: string;
  href: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary";
}

interface CTASectionProps {
  title: string;
  description: string;
  primaryAction: CTAButton;
  secondaryAction?: CTAButton;
  className?: string;
}

const CTASection: React.FC<CTASectionProps> = ({
  title,
  description,
  primaryAction,
  secondaryAction,
}) => {
  return (
    <section
      className={`py-12.5 px-1 md:px-6 min-w-[82vw] max-w-[92vw] mx-auto`}
    >
      <div className={` mx-auto max-w-[92vw]`}>
        <div className="bg-[#FFF1E9] rounded-2xl p-6 md:p-12 flex flex-col gap-5 items-center text-center relative overflow-hidden">
          <div className="absolute -bottom-20 -left-15 w-40 h-40 rounded-full border border-white/20 pointer-events-none bg-[#FED4BA]" />
          <div className="absolute -top-20 -right-15 w-40 h-40 rounded-full border border-white/20 pointer-events-none bg-[#FED4BA]" />

          <h2 className="relative z-10 font-sora font-semibold text-3xl md:text-5xl md:leading-15 tracking-[-0.96px] text-secondary">
            {title}
          </h2>

          <p className="relative z-10 font-inter font-normal md:text-xl leading-7.5 text-gray-900 md:max-w-185.25">
            {description}
          </p>

          <div className="relative z-10 flex gap-5 items-center mt-4 flex-wrap justify-center w-full">
            <Link
              href={primaryAction.href}
              className="flex gap-2.5 items-center justify-center bg-secondary hover:bg-gray-50 text-white px-7.5 py-3.5 rounded-2xl font-semibold font-inter text-xs md:text-base leading-6 shadow-[0_3px_7px_0_rgba(0,0,0,0.1)] transition-all"
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </Link>

            {secondaryAction && (
              <Link
                href={secondaryAction.href}
                className="flex gap-2.5 items-center justify-center bg-white hover:bg-brand-orange-700 border border-[#FEA369] text-secondary px-15 md:px-7.5 py-3.5 rounded-2xl font-semibold font-inter text-xs md:text-base leading-6 transition-all"
              >
                {secondaryAction.icon}
                <span>{secondaryAction.label}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
