"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCheckoutSuccessQuery } from "@/redux/features/api/subscription/subscriptionApi";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const router = useRouter();

  const { data, isLoading, isError } = useCheckoutSuccessQuery(sessionId || "", {
    skip: !sessionId,
  });

  useEffect(() => {
    if (data?.success) {
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    }
  }, [data, router]);

  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">Invalid session</h2>
        <p className="mt-2 text-gray-600">No session ID found. Please try again.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Return to Home
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Verifying your subscription...</p>
      </div>
    );
  }

  if (isError || !data?.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">Payment failed</h2>
        <p className="mt-2 text-gray-600">Something went wrong. Please try again.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold text-gray-900">Payment successful!</h2>
      <p className="mt-2 text-gray-600">Your subscription has been activated.</p>
      <p className="text-sm text-gray-500 mt-1">Redirecting you to Dashboard...</p>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="bg-white min-h-screen">
      <Suspense fallback={<div className="flex flex-col items-center justify-center min-h-[60vh]">Loading...</div>}>
        <CheckoutSuccessContent />
      </Suspense>
    </div>
  );
}
