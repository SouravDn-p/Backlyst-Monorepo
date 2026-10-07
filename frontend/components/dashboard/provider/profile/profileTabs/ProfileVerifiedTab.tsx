import { CheckCircle2, Info, Lock } from "lucide-react";
import type { CompanyDirectoryDetail } from "@/types/company/companyDirectoryTypes";
import { formatDateDistance } from "../companyProfileHelpers";

const formatPlacementTypeLabel = (value?: string | null) =>
  value ? value.replaceAll("_", " ") : "Currently not available";

export default function ProfileVerifiedTab({
  detail,
}: {
  detail?: CompanyDirectoryDetail | null;
}) {
  const samples =
    detail?.verifiedSamples?.length
      ? detail.verifiedSamples.slice(0, 2)
      : [];

  return (
    <div className="p-6 space-y-6">
      <div className="bg-[#FFF7ED] border border-[#FDCFBE] rounded-xl px-5 py-3.5 flex items-start gap-3">
        <Info className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-secondary">
            Available Placement Formats
          </p>
          <p className="text-sm text-[#535862] mt-1 leading-relaxed">
            These are the link placement formats currently supported by your
            active publishers. Exact availability, pricing, and domain match are
            confirmed during task creation.
          </p>
        </div>
      </div>

      <div className="bg-[#f6f7f9] p-2 md:p-8 rounded-2xl">
        {samples.length === 0 ? (
          <div className="rounded-2xl bg-white border border-[#f3d6cd] px-6 py-12 text-center">
            <p className="text-lg font-semibold text-[#181d27]">
              Verified samples are currently not available
            </p>
            <p className="mt-2 text-sm text-[#667085]">
              This company has not published any verified placement samples yet.
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {samples.map((sample) => (
            <div
              key={sample.id}
              className="relative bg-white rounded-2xl p-6 shadow-[0_10px_30px_rgba(240,79,35,0.08)] border border-[#f3d6cd]"
            >
              <div className="absolute top-7 md:top-5 right-5 text-gray-400">
                <Lock className="w-5 h-5" />
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-secondary text-secondary text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                VERIFIED PLACEMENT
              </div>

              <div className="mt-6 text-xs text-gray-400 tracking-wider uppercase">
                Placement Type
              </div>
              <div className="mt-1 text-lg font-semibold text-gray-800">
                {formatPlacementTypeLabel(sample.finalTaskType)}
              </div>

              <div className="mt-5 space-y-3">
                <p className="text-sm font-medium text-gray-700 line-clamp-2">
                  {sample.projectTitle || "Currently not available"}
                </p>
                <p className="text-sm text-gray-500 line-clamp-2 break-all">
                  {sample.targetUrl || sample.websiteUrl || "Currently not available"}
                </p>
              </div>

              <div className="mt-6 flex justify-between text-sm">
                <div>
                  <div className="text-gray-400 text-xs uppercase tracking-wider">
                    Anchor Text
                  </div>
                  <div className="text-gray-800 font-medium mt-1">
                    {sample.anchorText || "Currently not available"}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-gray-400 text-xs uppercase tracking-wider">
                    Delivered
                  </div>
                  <div className="text-gray-600 mt-1">
                    {sample.verifiedAt
                      ? formatDateDistance(sample.verifiedAt)
                      : "Currently not available"}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-between text-sm">
                <div>
                  <div className="text-gray-400 text-xs uppercase tracking-wider">
                    Website
                  </div>
                  <div className="text-gray-800 font-medium mt-1">
                    {sample.websiteName || "Currently not available"}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-gray-400 text-xs uppercase tracking-wider">
                    Link Type
                  </div>
                  <div className="text-gray-600 mt-1">
                    {sample.linkAttribute || "Currently not available"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      <div className="bg-[#f9fafb] border border-[#e9eaeb] rounded-xl p-4 text-sm text-[#535862] flex items-start gap-3">
        <Info className="w-5 h-5 text-[#9DA4AE] shrink-0 mt-0.5" />
        <p>
          Placement formats show publisher capabilities only. Final pricing,
          domain authority, relevance, and exact link placement are confirmed
          during the task matching and approval process.
        </p>
      </div>
    </div>
  );
}
