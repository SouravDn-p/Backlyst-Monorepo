"use client";

import { useState } from "react";
import { Star, Send, ShieldCheck, X } from "lucide-react";
import ModalShell from "@/components/dashboard/provider/delivery/modals/ModalShell";

type Props = {
  open: boolean;
  partnerName?: string;
  onClose: () => void;
};

export default function SendFeedbackModal({
  open,
  partnerName = "Alex M. Media",
  onClose,
}: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setRating(0);
      setHovered(0);
      setFeedback("");
      setSubmitted(false);
    }, 200);
  };

  const handleSubmit = () => {
    if (!rating) return;
    setSubmitted(true);
  };

  return (
    <ModalShell open={open} onClose={handleClose} widthClass="max-w-2xl">
      <div className="flex flex-col px-6 pt-6 pb-6 gap-6">
        {submitted ? (
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-[#ECFDF3] flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-[#027A48]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#181d27]">
                Feedback Submitted!
              </p>
              <p className="text-sm text-[#535862] mt-1 leading-relaxed max-w-xs">
                Your rating has been recorded and will impact {partnerName}
                &apos;s authority score.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="bg-[#f2f4f7] hover:bg-[#e9eaeb] text-[#535862] font-semibold text-sm px-8 py-2.5 rounded-xl transition-colors mt-2"
            >
              CLOSE
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-4 pt-4">
              <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
                <div className="w-10 h-10 rounded-xl bg-[#6366f1] flex items-center justify-center text-white font-bold text-lg">
                  {partnerName.charAt(0)}
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-[#181d27]">
                  Rate {partnerName}
                </h2>
                <p className="text-sm text-[#535862] mt-1">
                  Provide formal institutional feedback for this fulfillment
                  partner.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= (hovered || rating);
                return (
                  <button
                    key={star}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`w-9 h-9 transition-colors ${
                        filled
                          ? "text-amber-400 fill-amber-400"
                          : "text-[#d1d5db]"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#535862]">
                <Send className="w-3.5 h-3.5" />
                Institutional Feedback (Optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={5}
                placeholder="Ex: Excellent communication and metric alignment..."
                className="w-full bg-[#f9fafb] border border-[#e9eaeb] rounded-xl px-4 py-3 text-sm text-[#181d27] placeholder:text-[#9DA4AE] resize-none focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] transition"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!rating}
              className={`flex items-center justify-center gap-2 font-bold text-sm py-3.5 rounded-xl transition-all ${
                rating
                  ? "bg-[#F04F23] hover:bg-[#d94118] text-white"
                  : "bg-[#f2f4f7] text-[#9DA4AE] cursor-not-allowed"
              }`}
            >
              <Send className="w-4 h-4" />
              SUBMIT PROPOSAL
            </button>

            <div className="flex items-center gap-3 bg-[#ECFDF3] border border-[#6CE9A6] rounded-xl px-4 py-3">
              <ShieldCheck className="w-4 h-4 text-[#027A48] shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#027A48]">
                Feedback Impacts Partner Authority Score
              </p>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}
