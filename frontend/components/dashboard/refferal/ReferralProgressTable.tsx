"use client";

import {
  mapReferral,
  ReferralRow,
  STAGE_BADGE,
} from "@/lib/referral/referralHelpers";
import { useGetReferralProgressQuery } from "@/redux/features/api/refferal/refferalApi";

interface ReferralProgressTableProps {
  search?: string;
}

const ReferralProgressTable = ({
  search = "",
}: ReferralProgressTableProps) => {
  const {
    data: referralProgress = [],
    isLoading,
    isError,
  } = useGetReferralProgressQuery();

  const referrals: ReferralRow[] =
    referralProgress.map(mapReferral);

  const filteredReferrals = referrals.filter((referral) => {
    const query = search.toLowerCase().trim();

    if (!query) return true;

    return (
      referral.site.toLowerCase().includes(query) ||
      referral.company.toLowerCase().includes(query) ||
      referral.id.toLowerCase().includes(query)
    );
  });

  return (
    <div className="bg-white border border-[#e9eaeb] rounded-xl overflow-hidden">
      <div className="px-6 py-5 border-b border-[#e9eaeb]">
        <p className="text-sm font-bold text-[#181d27]">
          Referral Progress
        </p>

        <p className="text-xs text-[#535862] mt-0.5">
          Track your referrals and their milestones
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-[#e9eaeb]">
              {[
                "Referred Website / Company",
                "Current Stage",
                "Completed Actions",
                "Next Unlock Requirement",
                "Rewards Earned",
                "Status",
              ].map((header) => (
                <th
                  key={header}
                  className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-[#535862]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#e9eaeb]">
            {isLoading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-sm text-[#9DA4AE]"
                >
                  Loading referral progress...
                </td>
              </tr>
            )}

            {isError && !isLoading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-sm text-red-600"
                >
                  Failed to load referral progress.
                </td>
              </tr>
            )}

            {!isLoading &&
              !isError &&
              filteredReferrals.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-sm text-[#9DA4AE]"
                  >
                    {search
                      ? "No matching referrals found."
                      : "No referrals yet."}
                  </td>
                </tr>
              )}

            {!isLoading &&
              !isError &&
              filteredReferrals.map((referral) => (
                <tr
                  key={referral.id}
                  className="hover:bg-[#fafafa] transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-[#181d27]">
                      {referral.site}
                    </p>

                    <p className="text-xs text-[#535862] mt-0.5">
                      {referral.company}
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-block text-[10px] font-bold px-3 py-1 rounded-full ${
                        STAGE_BADGE[referral.stage]
                      }`}
                    >
                      Stage {referral.stage}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <ul className="space-y-1">
                      {referral.completedActions.map((action) => (
                        <li
                          key={action}
                          className="flex items-center gap-1.5 text-xs text-[#535862]"
                        >
                          <span className="text-[#181d27]">•</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </td>

                  <td className="px-6 py-4 text-sm text-[#535862]">
                    {referral.nextRequirement}
                  </td>

                  <td className="px-6 py-4 text-sm font-medium text-[#181d27]">
                    {referral.rewardsEarned}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${
                        referral.status === "Completed"
                          ? "text-[#027A48] bg-[#ECFDF3]"
                          : referral.status === "Active"
                          ? "text-[#175CD3] bg-[#EFF8FF]"
                          : "text-[#B54708] bg-[#FFF6ED]"
                      }`}
                    >
                      {referral.status}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-[#e9eaeb]">
        <p className="text-xs text-[#9DA4AE]">
          Referral credits are non-transferable and have no cash value.
        </p>
      </div>
    </div>
  );
};

export default ReferralProgressTable;