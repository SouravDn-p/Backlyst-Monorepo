"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useCancelDirectTaskMutation } from "@/redux/features/api/directTask/directTaskApi";

interface CancelDirectTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
}

export default function CancelDirectTaskModal({
  isOpen,
  onClose,
  taskId,
}: CancelDirectTaskModalProps) {
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelTask, { isLoading }] = useCancelDirectTaskMutation();

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      await cancelTask({
        id: taskId,
        data: {
          cancellationReason: cancellationReason || undefined,
        },
      }).unwrap();
      toast.success("Task cancelled successfully.");
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to cancel task.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="flex flex-col gap-6 mt-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            <h3 className="text-xl font-semibold text-gray-900">Cancel Task</h3>
          </div>

          <div className="space-y-4 text-sm text-gray-600">
            <p>Are you sure you want to cancel this direct task request?</p>
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-gray-700">
                Cancellation Reason (Optional)
              </label>
              <textarea
                placeholder="Let the provider know why you are cancelling this request"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 w-full mt-2">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Keep Task
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isLoading ? "Cancelling..." : "Cancel Task"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
