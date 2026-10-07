import React, { useState } from "react";
import { X, Star, Award, Sparkles, Trophy, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CongratsModalProps extends BaseModalProps {
  title: string;
  message: string;
  credits?: number;
}

export const CongratsModal: React.FC<CongratsModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  credits,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs md:max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="relative bg-linear-to-br from-brand-orange-400 to-primary p-6 md:p-8 text-center">
          <div className="absolute inset-0 overflow-hidden">
            <Sparkles className="absolute top-4 left-4 w-5 md:w-6 h-5 md:h-6 text-yellow-300 animate-pulse" />
            <Sparkles className="absolute top-8 right-8 w-3 md:w-4 h-3 md:h-4 text-yellow-200 animate-pulse delay-100" />
            <Sparkles className="absolute bottom-4 left-12 w-4 md:w-5 h-4 md:h-5 text-yellow-300 animate-pulse delay-200" />
          </div>

          <div className="relative z-10">
            <div className="w-16 md:w-20 h-16 md:h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <Trophy className="w-8 md:w-10 h-8 md:h-10 text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-sora text-white">
              {title}
            </h2>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-3 md:space-y-4 text-center">
          <p className="text-sm md:text-base text-gray-600">{message}</p>

          {credits && (
            <div className="bg-primary rounded-xl p-3 md:p-4">
              <p className="text-xs md:text-sm text-gray-500">Earned</p>
              <p className="text-2xl md:text-3xl font-bold text-primary0">
                +{credits} CR
              </p>
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 pt-0">
          <Button
            onClick={onClose}
            className="w-full h-10 md:h-11 bg-primary0 hover:bg-brand-orange-600 text-white text-sm md:text-base"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

interface LeaveReviewModalProps extends BaseModalProps {
  providerName: string;
  taskTitle: string;
  onSubmit: (rating: number, comment: string) => void;
}

export const LeaveReviewModal: React.FC<LeaveReviewModalProps> = ({
  isOpen,
  onClose,
  providerName,
  taskTitle,
  onSubmit,
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  const resetForm = () => {
    setRating(0);
    setHoverRating(0);
    setComment("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100">
          <h2 className="text-base md:text-lg font-bold font-sora text-gray-900">
            Leave a Review
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="text-center">
            <p className="text-sm md:text-base text-gray-600">
              How was your experience with
            </p>
            <p className="font-semibold text-gray-900 text-sm md:text-base">
              {providerName}
            </p>
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              for {taskTitle}
            </p>
          </div>

          <div className="flex items-center justify-center gap-1 md:gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 md:w-10 h-8 md:h-10 ${
                    star <= (hoverRating || rating)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>

          {rating > 0 && (
            <p className="text-center text-gray-500 text-sm md:text-base">
              {rating === 5
                ? "Excellent!"
                : rating === 4
                  ? "Very Good"
                  : rating === 3
                    ? "Good"
                    : rating === 2
                      ? "Fair"
                      : "Poor"}
            </p>
          )}

          <div className="space-y-2">
            <label className="text-xs md:text-sm font-semibold text-gray-700">
              Your feedback (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              className="w-full h-20 md:h-24 p-3 md:p-4 border border-gray-200 rounded-xl resize-none focus:border-primary0 focus:ring-2 focus:ring-primary0/20 outline-none text-xs md:text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 p-4 md:p-6 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="flex-1 h-10 md:h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSubmit(rating, comment);
              resetForm();
              onClose();
            }}
            disabled={rating === 0}
            className="flex-1 h-10 md:h-11 bg-primary0 hover:bg-brand-orange-600 text-white disabled:opacity-50 text-sm md:text-base"
          >
            Submit Review
          </Button>
        </div>
      </div>
    </div>
  );
};

interface TaskAcceptedModalProps extends BaseModalProps {
  taskTitle: string;
  credits: number;
  deadline: string;
}

export const TaskAcceptedModal: React.FC<TaskAcceptedModalProps> = ({
  isOpen,
  onClose,
  taskTitle,
  credits,
  deadline,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs md:max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-green-500 p-6 md:p-8 text-center">
          <div className="w-14 md:w-16 h-14 md:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
            <ThumbsUp className="w-7 md:w-8 h-7 md:h-8 text-white" />
          </div>
          <h2 className="text-lg md:text-xl font-bold font-sora text-white">
            Task Accepted!
          </h2>
        </div>

        <div className="p-4 md:p-6 space-y-3 md:space-y-4">
          <div className="text-center">
            <p className="font-semibold text-gray-900 text-sm md:text-base">
              {taskTitle}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="bg-gray-50 rounded-xl p-3 md:p-4 text-center">
              <p className="text-xs md:text-sm text-gray-500">Reward</p>
              <p className="text-lg md:text-xl font-bold text-primary0 mt-1">
                {credits} CR
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 md:p-4 text-center">
              <p className="text-xs md:text-sm text-gray-500">Deadline</p>
              <p className="text-lg md:text-xl font-bold text-gray-900 mt-1">
                {deadline}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 md:p-4 text-xs md:text-sm text-blue-700">
            <p>
              Start working on this task now. Submit your work before the
              deadline to earn your credits.
            </p>
          </div>
        </div>

        <div className="p-4 md:p-6 pt-0">
          <Button
            onClick={onClose}
            className="w-full h-10 md:h-11 bg-primary0 hover:bg-brand-orange-600 text-white text-sm md:text-base"
          >
            Start Working
          </Button>
        </div>
      </div>
    </div>
  );
};
