import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface OpportunitySuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  requesterName?: string;
}

export default function OpportunitySuccessModal({
  isOpen,
  onClose,
  requesterName,
}: OpportunitySuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 md:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl md:max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center justify-center px-6 py-8 text-center md:px-8 md:py-12">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 md:mb-6 md:h-20 md:w-20">
            <CheckCircle className="h-8 w-8 text-emerald-600 md:h-10 md:w-10" />
          </div>

          <h2 className="mb-1 text-xl font-semibold text-[#181d27] md:mb-2 md:text-2xl">
            Application Submitted
          </h2>

          <p className="mb-6 text-center text-xs text-[#535862] md:mb-8 md:text-sm">
            Your application was submitted to{" "}
            <span className="font-semibold text-[#181d27]">
              {requesterName || "the requester"}
            </span>
            .
          </p>

          <Button
            onClick={onClose}
            className="w-full rounded-xl bg-[#ff6b00] px-6 py-2 text-xs font-semibold text-white hover:bg-[#e65c00] md:px-8 md:py-3 md:text-sm"
          >
            RETURN TO DASHBOARD
          </Button>
        </div>
      </div>
    </div>
  );
}
