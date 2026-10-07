"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetMeQuery } from "@/redux/features/api/auth/authApi";
import { saveAuthSession } from "@/lib/auth/auth/session";

function GoogleAuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  const { refetch } = useGetMeQuery(undefined);

  useEffect(() => {
    const handleAuth = async () => {
      if (!token) {
        router.replace("/auth/login");
        return;
      }

      // Step 1: Save token in cookie
      saveAuthSession(token);

      // Step 2: Load user into redux
      await refetch();

      // Step 3: Redirect
      router.replace("/dashboard");
    };

    handleAuth();
  }, [token, router, refetch]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      Logging you in...
    </div>
  );
}

export default function GoogleAuthSuccess() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <GoogleAuthSuccessContent />
    </Suspense>
  );
}