type StatusType = "APPLIED" | "PENDING" | "APPROVED" | "REJECTED";

interface Props {
  status: StatusType;
  onClose: () => void;
}

const STATUS_STYLES: Record<
  StatusType,
  { label: string; bg: string; text: string; border: string }
> = {
  APPLIED: {
    label: "APPLIED",
    bg: "bg-[#ECFDF3]",
    text: "text-primary",
    border: "border-[#6CE9A6]",
  },
  PENDING: {
    label: "PENDING",
    bg: "bg-[#FFF7ED]",
    text: "text-[#B45309]",
    border: "border-[#FED7AA]",
  },
  APPROVED: {
    label: "APPROVED",
    bg: "bg-[#ECFDF3]",
    text: "text-[#027A48]",
    border: "border-[#6CE9A6]",
  },
  REJECTED: {
    label: "REJECTED",
    bg: "bg-[#FEF3F2]",
    text: "text-[#B42318]",
    border: "border-[#FECDCA]",
  },
};

export default function ProjectOverview({ status, onClose }: Props) {
  const statusStyle = STATUS_STYLES[status];

  return (
    <div className="flex flex-col max-h-[90vh]">
      <div className="px-6 pt-6 pb-4 border-b border-[#e9eaeb] shrink-0">
        <div className="flex items-start gap-4 pr-8">
          <div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center shrink-0">
            <svg
              viewBox="0 0 32 32"
              className="w-8 h-8 fill-[#7C3AED]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M8 4a2 2 0 0 0-2 2v20l10-5 10 5V6a2 2 0 0 0-2-2H8Z" />
            </svg>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-[#181d27]">
                Alpha Brands Inc.
              </h2>
              <span className="text-[10px] font-semibold bg-[#ECFDF3] text-[#027A48] px-2.5 py-0.5 rounded-full border border-[#6CE9A6] tracking-wide">
                VERIFIED REQUESTER
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-sm">
                <span className="text-yellow-400 text-base leading-none">
                  ★
                </span>
                <span className="font-semibold text-[#181d27]">4.9</span>
                <span className="text-[#9DA4AE]">(102 Reviews)</span>
              </span>
              <span className="text-[#e9eaeb] select-none">|</span>
              <span className="text-xs text-[#9DA4AE] font-medium tracking-wide">
                REFERENCE: PROJ-0217
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-3">
          <span
            className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border tracking-wide
              ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
          >
            {statusStyle.label}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6"></div>

      <div className="shrink-0 px-6 pb-6 pt-4 flex justify-between border-t border-[#e9eaeb] gap-3">
        <button
          onClick={onClose}
          className="flex-1 bg-[#f2f4f7] hover:bg-[#e9eaeb] text-[#535862] font-semibold text-sm py-3.5 rounded-xl transition-colors tracking-wide"
        >
          CLOSE OVERSIGHT
        </button>
      </div>
    </div>
  );
}
