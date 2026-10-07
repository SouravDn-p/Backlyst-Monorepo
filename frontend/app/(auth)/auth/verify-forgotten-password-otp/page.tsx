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
  useVerifyForgotPasswordOTPMutation,
} from "@/redux/features/api/auth/authApi";

function VerifyForgotPasswordOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailFromQuery =
    searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromQuery);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [verifyForgotPasswordOTP] =
    useVerifyForgotPasswordOTPMutation();

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const response =
        await verifyForgotPasswordOTP({
          email,
          otp,
          newPassword,
        }).unwrap();

      if (response.success) {
        router.push("/auth/login");
      } else {
        setError(
          response.message ||
            "Verification failed. Please check your OTP and try again."
        );
      }
    } catch (err: any) {
      setError(
        err?.data?.message ||
          "Verification failed. Please check your OTP and try again."
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
              Reset your password
            </h1>

            <p className="text-sm text-gray-500 font-medium font-inter">
              Enter the OTP sent to your email and your new password
            </p>

            {error && (
              <p className="text-sm text-red-600 font-semibold bg-red-50 p-3 rounded-lg">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >
          {/* Email */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">
              Email
            </Label>

            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
              className="h-12 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* OTP */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">
              OTP
            </Label>

            <Input
              type="text"
              placeholder="Enter the 6-digit OTP"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value)
              }
              required
              maxLength={6}
              className="h-12 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">
              New Password
            </Label>

            <Input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(e.target.value)
              }
              required
              className="h-12 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-primary text-white font-semibold"
          >
            {isLoading
              ? "Verifying..."
              : "Reset Password"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Didn't receive the OTP?{" "}
            <Link
              href="/auth/forgot-password"
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

export default function VerifyForgotPasswordOTPPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyForgotPasswordOTPContent />
    </Suspense>
  );
}