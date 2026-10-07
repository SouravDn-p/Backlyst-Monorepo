"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import Image from "next/image";
import logo from "@/public/backlyst-logo.png";
import { useRegisterMutation } from "@/redux/features/api/auth/authApi";
import { Suspense } from "react";
import { savePendingRegistration } from "@/lib/auth/pendingRegistration";
import { LegalDocumentLink } from "@/components/legal/LegalDocumentLink";
import { getLegalDocumentBySlug } from "@/lib/legal/documents";

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

const termsOfService = getLegalDocumentBySlug("terms-of-service")!;
const communityGuidelines = getLegalDocumentBySlug("community-guidelines")!;
const creditVisibilityTerms = getLegalDocumentBySlug("credit-visibility-terms")!;
const privacyPolicy = getLegalDocumentBySlug("privacy-policy")!;
const dataRightsNotice = getLegalDocumentBySlug("data-rights")!;

// Inner Client Component
function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referralCodeError, setReferralCodeError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode:
      searchParams.get("referralCode") ||
      searchParams.get("refferalCode") ||
      "",
  });

  const [register, { isLoading }] = useRegisterMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setReferralCodeError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!acceptedLegalTerms) {
      setError(
        "You must confirm that you are aged 18 or over and accept the legal documents before creating an account.",
      );
      return;
    }

    try {
      const response = await register({ 
        name: formData.name,
        email: formData.email,
        password: formData.password,
        imageKey: undefined,
        referralCode: formData.referralCode || undefined,
      }).unwrap();

      if (response.success) {
        const email = formData.email.trim();

        savePendingRegistration({
          email,
          password: formData.password,
        });
        router.push(
          `/auth/verify-register-otp?email=${encodeURIComponent(email)}`,
        );
      } else {
        setError(response.message || "Registration failed. Please try again.");
      }
    } catch (err: unknown) {
      const message = getApiErrorMessage(
        err,
        "Registration failed. Please try again.",
      );

      if (message === "Invalid referral code") {
        setReferralCodeError(message);
      } else {
        setError(message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-130 flex flex-col gap-8 py-8">
        <div className="flex flex-col items-center text-center gap-6 pt-20 md:pt-32">
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
              Create your account
            </h1>
            <p className="text-sm text-gray-500 font-medium font-inter">
              Join Backlyst and start building
            </p>

            {error && (
              <p className="text-sm text-red-600 font-semibold bg-red-50 p-3 rounded-lg">
                {error}
              </p>
            )}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 font-inter"
        >
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-bold text-gray-700">
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              className="h-12 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all duration-200"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-bold text-gray-700">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              className="h-12 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all duration-200"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2 relative">
            <Label htmlFor="password" className="text-sm font-bold text-gray-700">
              Password
            </Label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="h-12 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all duration-200 pr-12"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
            <button
              type="button"
              className="absolute right-3 top-12 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="space-y-2 relative">
            <Label htmlFor="confirmPassword" className="text-sm font-bold text-gray-700">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              className="h-12 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all duration-200 pr-12"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
            />
            <button
              type="button"
              className="absolute right-3 top-12 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>

         <div className="space-y-2">
  <Label
    htmlFor="referralCode"
    className="text-sm font-bold text-gray-700"
  >
    Referral Code
  </Label>

  <Input
    id="referralCode"
    type="text"
    placeholder="PRO-2025-EX"
    className={`h-12 rounded-xl transition-all duration-200 ${
      referralCodeError
        ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
        : "border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/30"
    }`}
    value={formData.referralCode}
    onChange={(e) => {
      setReferralCodeError("");
      setFormData({
        ...formData,
        referralCode: e.target.value,
      });
    }}
  />

  {referralCodeError && (
    <p className="text-sm text-red-600">{referralCodeError}</p>
  )}
</div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <input
                id="acceptedLegalTerms"
                type="checkbox"
                checked={acceptedLegalTerms}
                onChange={(e) => setAcceptedLegalTerms(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <label
                htmlFor="acceptedLegalTerms"
                className="text-xs text-gray-600 font-medium leading-relaxed cursor-pointer"
              >
                I confirm that I am aged 18 or over and am creating this account
                for business, trade or professional purposes. I have read and
                agree to the{" "}
                <LegalDocumentLink href={termsOfService.href}>
                  {termsOfService.name}
                </LegalDocumentLink>
                ,{" "}
                <LegalDocumentLink href={communityGuidelines.href}>
                  {communityGuidelines.name}
                </LegalDocumentLink>{" "}
                and{" "}
                <LegalDocumentLink href={creditVisibilityTerms.href}>
                  {creditVisibilityTerms.name}
                </LegalDocumentLink>
                , and I acknowledge that I have read the{" "}
                <LegalDocumentLink href={privacyPolicy.href}>
                  {privacyPolicy.name}
                </LegalDocumentLink>{" "}
                and{" "}
                <LegalDocumentLink href={dataRightsNotice.href}>
                  {dataRightsNotice.name}
                </LegalDocumentLink>
                .
              </label>
            </div>

            <div className="flex items-start gap-3">
              <input
                id="marketingConsent"
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <label
                htmlFor="marketingConsent"
                className="text-xs text-gray-600 font-medium leading-relaxed cursor-pointer"
              >
                I would like to receive Backlyst news, product updates, offers
                and marketing communications by email. I can unsubscribe at any
                time.
              </label>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !acceptedLegalTerms}
            className="w-full cursor-pointer bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating Account..." : "Create My Account"}
          </Button>
        </form>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-gray-400 bg-white px-4">
            <span className="absolute text-sm font-normal -top-2 bg-white w-12 h-12 translate-x-0 px-2">
              OR
            </span>
            <div className="border-t border-base-300 w-full"></div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 cursor-pointer h-12 rounded-xl border-gray-200 font-bold text-xs text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50 transition-all px-0"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </Button>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500 font-medium font-inter">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-primary font-bold hover:text-primary/80 transition-colors"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Main Page with Suspense Boundary
export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
            <p className="text-gray-500">Loading registration form...</p>
          </div>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}