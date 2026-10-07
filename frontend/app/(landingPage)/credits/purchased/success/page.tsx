"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useGetPurchasedCheckoutSuccessQuery } from "@/redux/features/api/credit/creditApi";
import {
  AlertTriangle,
  CheckCircle,
  LoaderCircle,
  XCircle,
} from "lucide-react";

const getApiErrorMessage = (error: unknown) => {
  if (
    typeof error === "object" &&
    error != null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data != null &&
    "message" in error.data &&
    typeof error.data.message === "string"
  ) {
    return error.data.message;
  }

  return "Unable to verify your credit purchase. Please try again.";
};

function CreditCheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const router = useRouter();

  const { data, error, isLoading, isFetching, refetch } =
    useGetPurchasedCheckoutSuccessQuery(sessionId ?? "", {
      skip: !sessionId,
    });

  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">Invalid session</h2>
        <p className="mt-2 text-center text-gray-600">
          No checkout session ID was found in the URL.
        </p>
        <button
          onClick={() => router.push("/dashboard/wallet")}
          className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          Return to Wallet
        </button>
      </div>
    );
  }

  if (isLoading || isFetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <LoaderCircle className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="mt-4 text-gray-600">Verifying your credit purchase...</p>
      </div>
    );
  }

  if (error || !data?.success) {
    const errorMessage = error
      ? getApiErrorMessage(error)
      : data?.message || "Unable to verify your credit purchase.";

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">
          Purchase verification failed
        </h2>
        <p className="mt-2 max-w-lg text-center text-gray-600">
          {errorMessage}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push("/dashboard/wallet")}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Return to Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-900">
        Credits purchased successfully!
      </h2>
      <p className="mt-2 text-center text-gray-600">{data.message}</p>
      <div className="mt-6 w-full max-w-sm rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Credits purchased</span>
          <span className="font-semibold text-gray-900">
            {data.data.boughtAmount.toLocaleString()}
          </span>
        </div>
        <div className="mt-3 flex justify-between gap-4">
          <span className="text-gray-600">Purchased credit balance</span>
          <span className="font-semibold text-gray-900">
            {data.data.purchasedTaskCredits.toLocaleString()}
          </span>
        </div>
      </div>
      <button
        onClick={() => router.push("/dashboard/wallet")}
        className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
      >
        Return to Wallet
      </button>
    </div>
  );
}

export default function CreditCheckoutSuccessPage() {
  return (
    <div className="bg-white min-h-screen">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <LoaderCircle className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
        }
      >
        <CreditCheckoutSuccessContent />
      </Suspense>
    </div>
  );
}
