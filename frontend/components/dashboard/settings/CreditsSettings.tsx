"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { useGetCreditsMeQuery } from "@/redux/features/api/credit/creditApi";

export default function CreditsWalletPreferences() {
  const { data: creditsData, isLoading, error } = useGetCreditsMeQuery();

  const totalCredits = creditsData?.totalTaskCredits ?? 0;

  return (
    <div className="space-y-6 p-8 bg-white rounded-2xl overflow-hidden">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold font-sora text-gray-900">
          Credits & Wallet Preferences
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Visibility and spending preferences.
        </p>
      </div>

      {/* Credit Balance */}
      <div className="border border-primary bg-indigo rounded-xl bg-brand-indigo-50 px-6 py-4">
        <p className="text-sm font-medium text-primary">
          Current Credit Balance
        </p>
        <p className="text-3xl font-bold text-brand-indigo-700 mt-1">
          {isLoading ? "..." : totalCredits.toLocaleString()}
          <span className="text-xl font-medium ml-1">Credits</span>
        </p>
      </div>

      {/* Monthly limit */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-900">
          Monthly soft spending limit
        </p>

        <div className="flex justify-between items-center gap-3">
          <input
            type="number"
            defaultValue={5000}
            className="w-28 h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-sm text-gray-500">Credits</span>
        </div>

        <p className="text-xs text-gray-500">
          You&apos;ll be notified when approaching this limit
        </p>
      </div>

      {/* Optional: Show more credit breakdown */}
      {creditsData && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-500">Earned this month</p>
            <p className="font-semibold text-gray-900 mt-1">
              {creditsData.thisMonthTotalCredits?.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-500">Lifetime earned</p>
            <p className="font-semibold text-gray-900 mt-1">
              {creditsData.lifetimeTotalCreditEarned?.toLocaleString() || 0}
            </p>
          </div>
        </div>
      )}

      {/* Footer action */}
      <div className="flex justify-end pt-4 border-t">
        <Button className="h-11 px-6 rounded-xl bg-primary text-white text-sm font-medium hover:bg-brand-indigo-600">
          Update Wallet Preferences
        </Button>
      </div>
    </div>
  );
}