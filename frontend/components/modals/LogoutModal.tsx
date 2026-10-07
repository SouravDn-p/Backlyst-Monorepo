"use client";

import { useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLogoutMutation } from "@/redux/features/api/auth/authApi";
import { deleteCookie } from "@/lib/cookie";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LogoutModal({ isOpen, onClose }: LogoutModalProps) {
  const router = useRouter();
  const [logout, { isLoading }] = useLogoutMutation();

  if (!isOpen) return null;

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      deleteCookie("accessToken");
      router.push("/auth/login");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm md:max-w-xl w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 md:px-6 py-4 md:py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 md:w-10 h-9 md:h-10 rounded-full bg-red-100 flex items-center justify-center">
              <LogOut className="w-4 md:w-5 h-4 md:h-5 text-red-600" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-900">
              Logout?
            </h3>
          </div>

          <button
            onClick={onClose}
            className="bg-gray-200 cursor-pointer rounded-2xl p-2 hover:text-gray-700 transition-colors shrink-0"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M6.4 15L10 11.4L13.6 15L15 13.6L11.4 10L15 6.4L13.6 5L10 8.6L6.4 5L5 6.4L8.6 10L5 13.6L6.4 15ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C12.2333 18 14.125 17.225 15.675 15.675C17.225 14.125 18 12.2333 18 10C18 7.76667 17.225 5.875 15.675 4.325C14.125 2.775 12.2333 2 10 2C7.76667 2 5.875 2.775 4.325 4.325C2.775 5.875 2 7.76667 2 10C2 12.2333 2.775 14.125 4.325 15.675C5.875 17.225 7.76667 18 10 18Z"
                fill="#A4A7AE"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 md:px-6 py-4 md:py-6">
          <p className="text-sm md:text-base text-gray-600 leading-relaxed text-center">
            Are you sure you want to end your session? You will need to sign in
            again to access your dashboard.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-4 md:px-6 py-4 md:py-5 flex flex-col items-center justify-center gap-3 md:gap-4">
          <Button
            variant="destructive"
            className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-6 md:px-8 py-2 md:py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center justify-center gap-2 text-sm md:text-base"
            onClick={handleLogout}
            disabled={isLoading}
          >
            {isLoading ? "Logging out..." : "Logout"}
          </Button>
          <Button
            variant="outline"
            className="w-full md:w-auto border-gray-300 text-gray-700 hover:bg-gray-100 px-6 py-2 md:py-2.5 text-sm md:text-base"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
