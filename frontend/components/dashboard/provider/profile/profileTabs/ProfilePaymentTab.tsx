import { FileText, Info, Link2 } from "lucide-react";
import type { CompanyDirectoryDetail } from "@/types/company/companyDirectoryTypes";

const placementFormatLabels: Record<string, { title: string; description: string }> = {
  GUEST_POST: {
    title: "Guest Post",
    description: "Brand new article with a backlink. Costs 2 credits.",
  },
  LINK_INSERTION: {
    title: "Backlink Insertion/Niche Edit",
    description: "Costs 1 credit.",
  },
  NICHE_EDIT: {
    title: "Backlink Insertion/Niche Edit",
    description: "Costs 1 credit.",
  },
};

export default function ProfilePaymentTab({
  detail,
}: {
  detail?: CompanyDirectoryDetail | null;
}) {
  const formats = detail?.placementFormats ?? [];

  return (
    <div className="p-6 flex flex-col gap-4">
      <p className="text-sm font-bold text-[#181d27] uppercase tracking-widest">
        Available Capability Formats
      </p>
      <div className="flex flex-col gap-3">
        {formats.length === 0 ? (
          <div className="rounded-xl border border-[#e9eaeb] p-8 text-center text-sm text-[#717680]">
            Placement formats are currently not available.
          </div>
        ) : formats.map((format, index) => {
          const isHighlighted = index === 1;
          const config = placementFormatLabels[format] ?? {
            title: format.replaceAll("_", " "),
            description: "Available through the task workflow.",
          };

          return (
            <div
              key={format}
              className={
                isHighlighted
                  ? "flex items-start gap-3 p-4 border-2 border-[#fd751f] bg-[#fff7ed] rounded-xl"
                  : "flex items-start gap-3 p-4 border border-[#e9eaeb] rounded-xl hover:border-[#d5d7da] transition-colors"
              }
            >
              <div
                className={
                  isHighlighted
                    ? "w-9 h-9 bg-[#fd751f]/10 rounded-lg flex items-center justify-center shrink-0"
                    : "w-9 h-9 bg-[#f5f5f5] rounded-lg flex items-center justify-center shrink-0"
                }
              >
                {format === "GUEST_POST" ? (
                  <FileText
                    className={`w-4 h-4 ${isHighlighted ? "text-[#fd751f]" : "text-[#717680]"}`}
                  />
                ) : (
                  <Link2
                    className={`w-4 h-4 ${isHighlighted ? "text-[#fd751f]" : "text-[#717680]"}`}
                  />
                )}
              </div>
              <div>
                <p
                  className={`font-semibold text-md ${isHighlighted ? "text-[#fd751f]" : "text-[#181d27]"}`}
                >
                  {config.title}
                </p>
                <p
                  className={`text-sm mt-0.5 ${isHighlighted ? "text-[#c2410c]" : "text-[#717680]"}`}
                >
                  {config.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-[#f5f5f5] border border-[#e9eaeb] rounded-xl p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-[#a4a7ae] shrink-0 mt-0.5" />
        <p className="text-sm text-[#717680]">
          These formats indicate publisher capability only. Final selection,
          exact pricing, and domain eligibility are finalized exclusively
          through the format task creation and review process.
        </p>
      </div>
    </div>
  );
}
