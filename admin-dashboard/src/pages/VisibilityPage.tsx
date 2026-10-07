import React, { useState } from "react";
import ReactDOM from "react-dom";
import { X, ChevronRight } from "lucide-react";
import { useGetMarketplaceVisibilityQuery } from "../redux/feature/visibility/visibilityApi";

const STATUS_STYLES: Record<string, string> = {
  VISIBLE: "#00C950",
  "GRACE PERIOD": "#FF6900",
  HIDDEN: "#364153",
};

const COMPLIANCE_STYLES: Record<string, string> = {
  COMPLIANT: "#00C950",
  "NON-COMPLIANT": "#FB2C36",
};

const VisibilityPage = () => {
  const [visibilityStatus, setVisibilityStatus] = useState<string>("ALL STATUSES");

  const queryStatus =
    visibilityStatus === "ALL STATUSES"
      ? undefined
      : visibilityStatus === "GRACE PERIOD"
      ? "GRACE_PERIOD"
      : visibilityStatus;

  const { data: response, isLoading } = useGetMarketplaceVisibilityQuery({
    page: 1,
    limit: 50,
    visibilityStatus: queryStatus,
  });

  const sites = response?.data?.items || [];

  return (
    <div className="w-full font-arimo space-y-6">
      <section>
        <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-bold text-[#000000] uppercase tracking-tight leading-tight">
          Marketplace Visibility
        </h1>
        <p className="text-[13px] sm:text-[14px] text-gray-400 font-medium mt-1.5 uppercase tracking-[0.03em]">
          Operational Console for Domain Discovery and Compliance Status.
        </p>
      </section>
      <div className="flex flex-col sm:flex-row justify-end gap-4 sm:gap-6 items-stretch sm:items-center">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
            Visibility Status
          </span>
          <div className="relative">
            <select
              value={visibilityStatus}
              onChange={(e) => setVisibilityStatus(e.target.value)}
              className="h-[42px] border border-gray-200 rounded-lg px-4 pr-10 text-[14px] font-medium text-gray-700 appearance-none bg-white cursor-pointer focus:border-[#331FFD] transition-colors min-w-[165px]"
            >
              <option value="ALL STATUSES">ALL STATUSES</option>
              <option value="VISIBLE">VISIBLE</option>
              <option value="GRACE PERIOD">GRACE PERIOD</option>
              <option value="HIDDEN">HIDDEN</option>
            </select>
            <ChevronRight
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
            DA Range
          </span>
          <div className="relative">
            <select className="h-[42px] border border-gray-200 rounded-lg px-4 pr-10 text-[14px] font-medium text-gray-700 appearance-none bg-white cursor-pointer focus:border-[#331FFD] transition-colors min-w-[150px]">
              <option>ALL RANGES</option>
              <option>0 – 30</option>
              <option>31 – 60</option>
              <option>61 – 100</option>
            </select>
            <ChevronRight
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pl-6 pr-3 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Website / Owner
                </th>
                <th className="px-3 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">
                  DA
                </th>
                <th className="px-3 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">
                  Weighted
                  <br />
                  Rank
                </th>
                <th className="px-3 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">
                  Status
                </th>
                <th className="px-3 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">
                  Compliance
                </th>
                <th className="px-3 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">
                  Usage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-gray-500 font-medium text-sm"
                  >
                    Loading marketplace visibility data...
                  </td>
                </tr>
              ) : sites.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-gray-500 font-medium text-sm"
                  >
                    No data found.
                  </td>
                </tr>
              ) : (
                sites.map((site: any) => {
                  const displayStatus =
                    site.status === "GRACE_PERIOD" ? "GRACE PERIOD" : site.status;
                  const displayCompliance =
                    site.compliance === "NON_COMPLIANT"
                      ? "NON-COMPLIANT"
                      : site.compliance;

                  return (
                    <tr
                      key={site.website.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="pl-6 pr-3 py-5">
                        <a
                          href={site.website.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[15px] font-bold block leading-tight cursor-pointer hover:underline uppercase"
                          style={{ color: "#155DFC" }}
                        >
                          {site.website.name ||
                            site.website.websiteUrl.replace(/^https?:\/\//, "")}
                        </a>
                        <span className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mt-0.5 block">
                          {site.website.owner.name}
                        </span>
                      </td>
                      <td className="px-3 py-5 text-center">
                        <span className="text-[20px] font-bold text-[#000000]">
                          92
                        </span>
                      </td>
                      <td className="px-3 py-5 text-center">
                        <span className="text-[18px] font-bold text-[#000000]">
                          842.5
                        </span>
                      </td>
                      <td className="px-3 py-5 text-center">
                        <span
                          className="inline-block px-3 py-1.5 rounded text-[11px] font-bold text-white uppercase tracking-wider text-center"
                          style={{
                            backgroundColor:
                              STATUS_STYLES[displayStatus] || "#364153",
                          }}
                        >
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-3 py-5 text-center">
                        <span
                          className="inline-block px-3 py-1.5 rounded text-[11px] font-bold text-white uppercase tracking-wider text-center"
                          style={{
                            backgroundColor:
                              COMPLIANCE_STYLES[displayCompliance] || "#364153",
                          }}
                        >
                          {displayCompliance}
                        </span>
                      </td>
                      <td className="px-3 py-5 text-center">
                        <span className="text-[20px] font-bold text-[#000000] block leading-none">
                          {site.usage.credits.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                          CR
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VisibilityPage;
