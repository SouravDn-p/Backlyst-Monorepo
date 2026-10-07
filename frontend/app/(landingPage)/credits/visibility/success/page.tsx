"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  LoaderCircle,
  XCircle,
} from "lucide-react";
import { useGetVisibilityCheckoutSuccessQuery } from "@/redux/features/api/credit/creditApi";

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

  return "Unable to verify your visibility-credit purchase. Please try again.";
};

function VisibilityCheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const router = useRouter();

  const { data, error, isLoading, isFetching, refetch } =
    useGetVisibilityCheckoutSuccessQuery(sessionId ?? "", {
      skip: !sessionId,
    });

  if (!sessionId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">
          Invalid session
        </h2>
        <p className="mt-2 text-center text-gray-600">
          No checkout session ID was found in the URL.
        </p>
        <button
          onClick={() => router.push("/dashboard/wallet")}
          className="mt-6 rounded-lg bg-indigo-600 px-6 py-2 text-white transition-colors hover:bg-indigo-700 cursor-pointer"
        >
          Return to Wallet
        </button>
      </div>
    );
  }

  if (isLoading || isFetching) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="mt-4 text-gray-600">
          Verifying your visibility-credit purchase...
        </p>
      </div>
    );
  }

  if (error || !data?.success) {
    const errorMessage = error
      ? getApiErrorMessage(error)
      : data?.message || "Unable to verify your visibility-credit purchase.";

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-center text-2xl font-semibold text-gray-900">
          Purchase verification failed
        </h2>
        <p className="mt-2 max-w-lg text-center text-gray-600">
          {errorMessage}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-white transition-colors hover:bg-indigo-700"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push("/dashboard/wallet")}
            className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50 cursor-pointer"
          >
            Return to Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="text-center text-2xl font-semibold text-gray-900">
        Visibility credits purchased successfully!
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
          <span className="text-gray-600">Master visibility credits</span>
          <span className="font-semibold text-gray-900">
            {data.data.masterVisibilityCredits.toLocaleString()}
          </span>
        </div>
      </div>
      <button
        onClick={() => router.push("/dashboard/wallet")}
        className="mt-6 rounded-lg bg-indigo-600 px-6 py-2 text-white transition-colors hover:bg-indigo-700 cursor-pointer"
      >
        Return to Wallet
      </button>
    </div>
  );
}

export default function VisibilityCheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] flex-col items-center justify-center">
            <LoaderCircle className="h-10 w-10 animate-spin text-indigo-600" />
          </div>
        }
      >
        <VisibilityCheckoutSuccessContent />
      </Suspense>
    </div>
  );
}
