import { Lock, Shield } from "lucide-react";
import type { CompanyDirectoryDetail } from "@/types/company/companyDirectoryTypes";
import { formatHours } from "../companyProfileHelpers";

export default function ProfileAuthorityTab({
  detail,
}: {
  detail?: CompanyDirectoryDetail | null;
}) {
  const label = [
    {
      label: "AVG. DOMAIN RATING",
      value: String(
        Math.round(
          detail?.authorityMetrics?.averageDomainRating ??
            detail?.stats?.averageDomainRating ??
            0,
        ),
      ),
    },
    {
      label: "AVG. SPAM SCORE",
      value:
        detail?.authorityMetrics?.averageSpamScore != null
          ? `${detail.authorityMetrics.averageSpamScore}`
          : "N/A",
    },
    {
      label: "AVERAGE TAT",
      value: formatHours(detail?.stats?.averageResponseTime),
    },
  ];
  return (
    <div className="p-6 flex flex-col items-center gap-6">
      <div className="flex flex-col items-center text-center pt-4">
        <div className="w-16 h-16 bg-[#ede9fe] rounded-full flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-[#6366f1]" />
        </div>
        <p className="text-base font-bold text-[#181d27] uppercase tracking-widest">
          Escrow Protected Publisher
        </p>
        <p className="text-md text-[#535862] mt-2 max-w-sm leading-relaxed">
          Authority metrics summarize the publisher&apos;s verified website
          profile, spam baseline, and response consistency across marketplace
          activity.
        </p>
      </div>
      <div className="w-full grid md:grid-cols-3 gap-3">
        {label.map((stat) => (
          <div
            key={stat.label}
            className="bg-[#fafafa] border border-[#e9eaeb] rounded-xl p-4 text-center"
          >
            <p className="text-[10px] font-bold text-[#717680] uppercase tracking-widest mb-1">
              {stat.label}
            </p>
            <p className="text-xl font-bold text-[#181d27]">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="w-full bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-[#15803d] shrink-0 mt-0.5" />
        <p className="text-md text-[#166534]">
          All placements are protected by platform escrow. Funds are only
          released upon verified task completion and quality review.
        </p>
      </div>
    </div>
  );
}
