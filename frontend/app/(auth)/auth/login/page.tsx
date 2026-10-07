"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import logo from "@/public/backlyst-logo.png";
import { useLoginMutation, useLazyGetMeQuery } from "@/redux/features/api/auth/authApi";
import { loginWithGoogle } from "@/lib/auth/googleAuth";
import { saveAuthSession } from "@/lib/auth/auth/session";
import { useAppSelector } from "@/redux/store/hooks";

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [login, { isLoading }] = useLoginMutation();
  const [fetchUser] = useLazyGetMeQuery();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await login({ email, password }).unwrap();
      if (response.success) {
         saveAuthSession(response.data.accessToken);
        // Fetch user data after successful login but don't let it block dashboard redirect
        try {
          await fetchUser().unwrap();
        } catch (fetchErr) {
          console.error("Failed to fetch user data after login:", fetchErr);
        }
        router.push("/dashboard");
      } else {
        setError(response.message || "Invalid email or password.");
      }
    } catch (err: any) {
      setError(err?.data?.message || "Invalid email or password. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-130 flex flex-col gap-8">
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
              Welcome back
            </h1>
            <p className="text-sm text-gray-500 font-medium font-inter">
              Log in to your workspace to continue
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
          {/* Email */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">Email</Label>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="
                h-12 rounded-xl pr-12
                  bg-white
                  border border-gray-200
                  transition-colors
                  focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none
              "
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">
              Password
            </Label>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="
                  h-12 rounded-xl pr-12
                  bg-white
                  border border-gray-200
                  
                  transition-colors
                  focus:border-primary focus:ring-2 focus:ring-primary/30
    focus:outline-none
                "
              />

              {/* Toggle Button */}
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 cursor-pointer -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div className="flex justify-center">
            <Link
              href="/auth/forgot-password"
              className="text-xs font-semibold cursor-pointer text-secondary hover:text-brand-orange-600 transition-colors uppercase tracking-widest "
            >
              Forgot password
            </Link>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading}
            className="
              w-full h-12 rounded-xl
              bg-primary hover:bg-brand-indigo-600 focus-visible:none
              text-white font-semibold text-sm
              shadow-lg shadow-primary/20
              transition-all active:scale-[0.98]
              border-gray-100
              cursor-pointer
              disabled:opacity-70 disabled:cursor-not-allowed
            "
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </Button>
        </form>

        {/* Social buttons */}
        <div className="flex flex-col gap-3">
          {/* <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-gray-200 text-gray-700 flex gap-3 hover:bg-gray-50 "
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09z" />
            </svg>
            Sign in with Apple
          </Button> */}

          <Button
            variant="outline"
            onClick={loginWithGoogle}
            className="w-full h-12 rounded-xl border-gray-200 text-gray-700 flex gap-3 hover:bg-gray-50 cursor-pointer"
          >
            {/* Google icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>
        </div>

        {/* Footer link */}
        <p className="text-sm text-center text-gray-500">
          New to Backlyst?{" "}
          <Link
            href="/auth/register"
            className="text-brand-orange-500 font-semibold hover:text-brand-orange-600 cursor-pointer"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
