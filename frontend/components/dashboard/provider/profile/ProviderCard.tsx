"use client";

import { Star, Globe, ArrowRight, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CompanyProviderCard } from "@/types/company/companyDirectoryTypes";

interface ProviderCardProps {
  provider: CompanyProviderCard;
  onViewProfile: (provider: CompanyProviderCard) => void;
}

export default function ProviderCard({
  provider,
  onViewProfile,
}: ProviderCardProps) {
  return (
    <div className="bg-white rounded-[20px] p-5 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-md shrink-0"
            style={{ backgroundColor: provider.avatarBg }}
          >
            {provider.avatar}
          </div>
          <div>
            <p className="text-base font-bold text-[#414651]">
              {provider.name}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="w-3.5 h-3.5 text-[#fbbf24] fill-[#fbbf24]" />
              <span className="text-sm font-medium text-[#394554]">
                {provider.rating}
              </span>
              <span className="text-sm text-[#394554]">
                ({provider.reviews})
              </span>
            </div>
          </div>
        </div>
        {provider.verified && (
          <Shield className="w-5 h-5 text-[#2ab516] shrink-0" />
        )}
      </div>
      <div className="h-px bg-[#f0f0f0]" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#fd751f]" />
          <span className="text-md font-medium text-[#fd751f]">
            {provider.website}
          </span>
        </div>
        {provider.websiteUrl ? (
          <a
            href={provider.websiteUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${provider.website}`}
            className="text-[#a4a7ae] transition-colors hover:text-[#717680]"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <ExternalLink className="w-4 h-4 text-[#d5d7da]" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#fafafa] rounded-lg p-2.5">
          <p className="text-[10px] font-semibold text-[#717680] uppercase tracking-wide mb-1">
            Domain Rating
          </p>
          <p className="text-xl font-bold text-[#181d27]">
            {provider.domainRating}
          </p>
        </div>
        <div className="bg-[#fafafa] rounded-lg p-2.5">
          <p className="text-[10px] font-semibold text-[#717680] uppercase tracking-wide mb-1">
            Industry Tag
          </p>
          <p className="text-md font-semibold text-[#181d27]">
            {provider.industryTag}
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {provider.tags.map((tag) => (
          <span
            key={tag}
            className="bg-[#f5f5f5] text-[#414651] text-[10px] font-semibold px-2.5 py-1 rounded-lg tracking-wide"
          >
            {tag}
          </span>
        ))}
      </div>
      <Button
        variant="secondary"
        className="rounded-lg"
        onClick={() => onViewProfile(provider)}
      >
        VIEW PROFILE <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
