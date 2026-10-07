import { ExternalLink, Globe } from "lucide-react";
import type { CompanyDirectoryDetail } from "@/types/company/companyDirectoryTypes";

export default function ProfileWebsite({
  detail,
}: {
  detail?: CompanyDirectoryDetail | null;
}) {
  const websites =
    detail?.websites?.length
      ? detail.websites.map((site, index) => ({
          href: site.websiteUrl,
          url: site.websiteUrl.replace(/^https?:\/\//, ""),
          type: index === 0 ? "Primary" : "Verified",
        }))
      : [
          { href: "", url: "Currently not available", type: "Unavailable" },
        ];
  return (
    <div className="p-6 flex flex-col gap-4">
      <p className="text-sm font-bold text-[#181d27] uppercase tracking-widest">
        Websites
      </p>
      <div className="flex flex-col divide-y divide-[#f0f0f0]">
        {websites.map((site) => (
          <div
            key={site.url}
            className="flex items-center justify-between py-3.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#f5f5f5] rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-[#717680]" />
              </div>
              <div>
                {site.href ? (
                  <a
                    href={site.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-md font-semibold text-[#fd751f] hover:underline cursor-pointer"
                  >
                    {site.url}
                  </a>
                ) : (
                  <p className="text-md font-semibold text-[#fd751f]">
                    {site.url}
                  </p>
                )}
                <p className="text-sm text-[#a4a7ae]">{site.type}</p>
              </div>
            </div>
            {site.href ? (
              <a
                href={site.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${site.url}`}
                className="text-[#a4a7ae] hover:text-[#717680] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <ExternalLink className="w-4 h-4 text-[#d5d7da]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
