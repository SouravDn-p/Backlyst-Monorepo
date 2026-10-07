"use client";

import { getCookie } from "@/lib/cookie";
import { useGetMeQuery } from "@/redux/features/api/auth/authApi";

export default function AuthInitializer() {
  const accessToken = getCookie("accessToken");
  
  // Fetch user data if access token exists
  useGetMeQuery(undefined, { 
    skip: !accessToken,
    refetchOnMountOrArgChange: true
  });

  return null;
}