"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { X, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useAcceptDirectTaskMutation } from "@/redux/features/api/directTask/directTaskApi";
import { useGetMyWebsitesQuery } from "@/redux/features/api/website/websiteApi";
import { WebsiteVerificationStatus } from "@/types/website/websiteTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AcceptDirectTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
}

export default function AcceptDirectTaskModal({
  isOpen,
  onClose,
  taskId,
}: AcceptDirectTaskModalProps) {
  const [providerWebsiteId, setProviderWebsiteId] = useState("");
  const [acceptTask, { isLoading }] = useAcceptDirectTaskMutation();

  const { data: websitesResponse, isLoading: isLoadingWebsites } = useGetMyWebsitesQuery({
    verificationStatus: WebsiteVerificationStatus.VERIFIED,
    limit: 100,
  });

  const verifiedWebsites = websitesResponse?.data?.data || [];

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      await acceptTask({
        id: taskId,
        data: {
          providerWebsiteId: providerWebsiteId || undefined,
        },
      }).unwrap();
      toast.success("Task accepted successfully.");
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to accept task.");
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
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="text-xl font-semibold text-gray-900">Accept Task</h3>
          </div>

          <div className="space-y-4 text-sm text-gray-600">
            <p>Are you sure you want to accept this direct task request?</p>
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-gray-700">
                Provider Website (Optional)
              </label>
              <Select
                value={providerWebsiteId}
                onValueChange={(value) => setProviderWebsiteId(value === "none" ? "" : value)}
              >
                <SelectTrigger className="w-full border-gray-300 rounded-lg">
                  <SelectValue placeholder={isLoadingWebsites ? "Loading websites..." : "Select a verified website"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default to primary verified website</SelectItem>
                  {verifiedWebsites.map((website) => (
                    <SelectItem key={website.id} value={website.id}>
                      {website.name} ({website.websiteUrl})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 w-full mt-2">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? "Accepting..." : "Accept Task"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
