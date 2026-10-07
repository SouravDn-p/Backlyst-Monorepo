"use client";

import React, { Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import logo from "@/public/backlyst-logo.png";
import {
  useLoginMutation,
  useVerifyRegisterOTPMutation,
} from "@/redux/features/api/auth/authApi";
import {
  clearPendingRegistration,
  getPendingRegistration,
} from "@/lib/auth/pendingRegistration";
import { saveAuthSession } from "@/lib/auth/auth/session";

const getApiErrorMessage = (error: unknown, fallback: string) => {
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

  return fallback;
};

function VerifyRegisterOTPContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [verifyRegisterOTP] = useVerifyRegisterOTPMutation();
  const [login] = useLoginMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const pendingRegistration = getPendingRegistration();

      if (
        !pendingRegistration ||
        pendingRegistration.email.toLowerCase() !== email.trim().toLowerCase()
      ) {
        setError(
          "Your registration session has expired. Please register again to continue.",
        );
        return;
      }

      const response = await verifyRegisterOTP({
        email: email.trim(),
        otp,
      }).unwrap();

      if (response.success) {
        const loginResponse = await login({
          email: pendingRegistration.email,
          password: pendingRegistration.password,
        }).unwrap();

        if (!loginResponse.success || !loginResponse.data?.accessToken) {
          setError(
            loginResponse.message ||
              "Your account was verified, but automatic sign-in failed.",
          );
          return;
        }

        saveAuthSession(loginResponse.data.accessToken);
        clearPendingRegistration();
        router.replace("/auth/verify");
      } else {
        setError(
          response.message ||
            "Verification failed. Please check your OTP and try again."
        );
      }
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          "Verification failed. Please check your OTP and try again.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-[520px] flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src={logo}
              alt="Backlyst"
              className="w-14 h-12 object-contain"
              priority
            />

            <span className="text-[28px] font-semibold font-sora text-gray-900">
              backlyst
            </span>
          </Link>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold font-sora text-gray-900">
              Verify your account
            </h1>

            <p className="text-sm text-gray-500 font-medium font-inter">
              Enter the 6-digit OTP sent to your email
            </p>

            {error && (
              <p className="text-sm text-red-600 font-semibold bg-red-50 p-3 rounded-lg">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">
              Email
            </Label>

            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">
              OTP
            </Label>

            <Input
              type="text"
              placeholder="Enter the 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
              className="h-12 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-primary text-white font-semibold"
          >
            {isLoading ? "Verifying & signing in..." : "Verify Account"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Did not receive the OTP?{" "}
            <Link
              href="/auth/register"
              className="text-brand-orange-500 font-semibold"
            >
              Resend OTP
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const VerifyRegisterOTPPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyRegisterOTPContent />
    </Suspense>
  );
};

export default VerifyRegisterOTPPage;
