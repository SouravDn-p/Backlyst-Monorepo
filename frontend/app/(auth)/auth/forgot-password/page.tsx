"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import logo from "@/public/backlyst-logo.png";
import { useForgotPasswordMutation } from "@/redux/features/api/auth/authApi";
import { useRouter } from "next/navigation";

export const ssr = false;

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [forgotPassword] = useForgotPasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await forgotPassword({ email }).unwrap();

      if (response.success) {
        // Redirect to OTP verification page
        router.push(`/auth/verify-forgotten-password-otp?email=${encodeURIComponent(email)}`);
      } else {
        setError(
          response.message || "Failed to send reset link. Please try again."
        );
      }
    } catch (err: any) {
      setError(
        err?.data?.message ||
          "Failed to send reset link. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-[400px] flex flex-col gap-8">
        <div className="flex flex-col items-center text-center gap-6 pt-32">
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
              Welcome back
            </h1>

            <p className="text-sm text-gray-500 font-medium font-inter">
              Enter your email address to continue
            </p>

            {error && (
              <p className="text-sm text-red-600 font-semibold bg-red-50 p-3 rounded-lg">
                {error}
              </p>
            )}
          </div>
        </div>

        {!submitted ? (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-6 font-inter"
          >
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-semibold text-gray-700"
              >
                Email
              </Label>

              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="h-12 rounded-xl bg-brand-indigo-50 border-transparent focus:ring-primary focus:border-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary cursor-pointer hover:bg-brand-indigo-600 text-white h-12 rounded-xl font-semibold text-sm shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {isLoading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        ) : (
          <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm font-medium text-center">
            If an account exists for {email}, you will receive a password reset
            link shortly.
          </div>
        )}

        <div className="text-center">
          <Link
            href="/auth/login"
            className="text-gray-500 font-semibold hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to log in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;