"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useGetMeQuery } from "@/redux/features/api/auth/authApi";
import { useUpdateNotificationPreferencesMutation } from "@/redux/features/api/settings/notification/notificationSettingsApi";

export default function NotificationSettings() {
  const { data: userResponse, isLoading } = useGetMeQuery();
  const user = userResponse?.data;
  const [updateNotificationPreferences] = useUpdateNotificationPreferencesMutation();

  const [taskStatusUpdates, setTaskStatusUpdates] = useState(true);
  const [creditBalanceAlerts, setCreditBalanceAlerts] = useState(true);
  const [disputeReviewNotifications, setDisputeReviewNotifications] =
    useState(true);
  const [systemAnnouncements, setSystemAnnouncements] = useState(false);

  useEffect(() => {
    if (user) {
      setTaskStatusUpdates(user.notificationTaskStatusUpdates ?? true);
      setCreditBalanceAlerts(user.notificationCreditBalanceAlerts ?? true);
      setDisputeReviewNotifications(user.notificationDisputeReviewNotifications ?? true);
      setSystemAnnouncements(user.notificationSystemAnnouncements ?? false);
    }
  }, [user]);

  const handleToggle = async (key: "notificationTaskStatusUpdates" | "notificationCreditBalanceAlerts" | "notificationDisputeReviewNotifications" | "notificationSystemAnnouncements", value: boolean) => {
    if (key === "notificationTaskStatusUpdates") setTaskStatusUpdates(value);
    if (key === "notificationCreditBalanceAlerts") setCreditBalanceAlerts(value);
    if (key === "notificationDisputeReviewNotifications") setDisputeReviewNotifications(value);
    if (key === "notificationSystemAnnouncements") setSystemAnnouncements(value);

    try {
      await updateNotificationPreferences({
        notificationTaskStatusUpdates: key === "notificationTaskStatusUpdates" ? value : taskStatusUpdates,
        notificationCreditBalanceAlerts: key === "notificationCreditBalanceAlerts" ? value : creditBalanceAlerts,
        notificationDisputeReviewNotifications: key === "notificationDisputeReviewNotifications" ? value : disputeReviewNotifications,
        notificationSystemAnnouncements: key === "notificationSystemAnnouncements" ? value : systemAnnouncements,
      }).unwrap();
    } catch (error) {
      console.error("Failed to update preferences", error);
    }
  };

  const [contactTags, setContactTags] = useState<string[]>([
    "Notification",
    "Advertisement",
    "Offers",
    "Payments",
    "Security",
  ]);
  const [newTag, setNewTag] = useState("");

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ";") {
      e.preventDefault();
      if (newTag.trim() && !contactTags.includes(newTag.trim())) {
        setContactTags([...contactTags, newTag.trim()]);
        setNewTag("");
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setContactTags(contactTags.filter((tag) => tag !== tagToRemove));
  };

  // const handleSave = () => {
  //   console.log("Saving notification & contact preferences:", {
  //     taskStatusUpdates,
  //     creditBalanceAlerts,
  //     disputeReviewNotifications,
  //     systemAnnouncements,
  //     contactTags,
  //   });
  //   toast.success("Preferences saved successfully!");  
  // };

  return (
    <div className="bg-[#F9FAFB] space-y-12 overflow-hidden">
      <div className="p-8 bg-white rounded-xl">
        <div className="pb-4">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            Notification Preferences
          </h2>
          <p className="mt-1.5 text-sm text-gray-600">
            Control how you receive platform updates.
          </p>
        </div>
        <div className="space-y-8 ">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Task status updates
              </label>
              <p className="text-xs text-gray-500 mt-0.5 ">
                Receive notifications when task status changes
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={taskStatusUpdates}
                onChange={(e) => handleToggle("notificationTaskStatusUpdates", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Credit balance alerts
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                Get notified when credits are low
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={creditBalanceAlerts}
                onChange={(e) => handleToggle("notificationCreditBalanceAlerts", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Dispute & review notifications
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                Stay updated on disputes and reviews
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={disputeReviewNotifications}
                onChange={(e) =>
                  handleToggle("notificationDisputeReviewNotifications", e.target.checked)
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between ">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                System announcements
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                Platform updates and maintenance notices
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={systemAnnouncements}
                onChange={(e) => handleToggle("notificationSystemAnnouncements", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
