"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useLogoutMutation } from "@/redux/features/api/auth/authApi";
import { deleteCookie } from "@/lib/cookie";

export const ssr = false;

const LogoutPage = () => {
  const router = useRouter();
  const [logout, { isLoading }] = useLogoutMutation();

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-[400px] flex flex-col gap-8">
        <div className="flex flex-col items-center text-center gap-6 pt-32">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold font-sora text-gray-900">
              Logging out
            </h1>
            <p className="text-sm text-gray-500 font-medium font-inter">
              Please wait while we sign you out...
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          {isLoading ? (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-gray-700">Signing out...</span>
            </div>
          ) : (
            <Button
              onClick={handleLogout}
              className="w-full bg-primary hover:bg-brand-indigo-600 text-white h-12 rounded-xl font-semibold text-sm shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
              Confirm Logout
            </Button>
          )}

          <div className="text-center">
            <a
              href="/auth/login"
              className="text-gray-500 font-semibold hover:text-gray-900 transition-colors"
            >
              Cancel and stay signed in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutPage;
