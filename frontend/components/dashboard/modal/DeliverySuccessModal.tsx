import { Button } from "@/components/ui/Button";
import { CheckCircle } from "lucide-react";

import { type MouseEvent } from "react";

interface SuccessModalProps {
  onClose: () => void;
}

export default function DeliverySuccessModal({ onClose }: SuccessModalProps) {
  const handleBackdropClick = () => onClose();
  const handleContentClick = (e: MouseEvent<HTMLDivElement>) =>
    e.stopPropagation();

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 flex flex-col items-center text-center"
        onClick={handleContentClick}
      >
        <div className="w-14 h-14 rounded-full border-2 border-[#e6fae3] bg-[#f0fdf4] flex items-center justify-center mb-5">
          <CheckCircle className="w-7 h-7 text-[#2ab516]" strokeWidth={2} />
        </div>
        <h2 className="text-2xl font-bold text-[#181d27] mb-2">
          Submission Successful
        </h2>
        <p className="text-sm text-[#717680] leading-relaxed mb-7">
          Your delivery has been submitted and is now awaiting requester review.
        </p>
        <Button
          variant="secondary"
          type="button"
          onClick={onClose}
          className="rounded-lg"
          // className="w-full bg-[#fd751f] hover:bg-[#e65c00] transition-colors text-white font-bold text-sm py-3 rounded-xl"
        >
          RETURN TO DASHBOARD
        </Button>
      </div>
    </div>
  );
}
