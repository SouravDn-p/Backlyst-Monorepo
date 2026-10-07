"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGetMeQuery } from "@/redux/features/api/auth/authApi";
import { getCookie } from "@/lib/cookie";

export default function ProtectedRoute({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const token = typeof window !== "undefined" ? getCookie("accessToken") : null;
    const { data: userResponse, isLoading, isError } = useGetMeQuery(undefined, {
        skip: !token,
    });
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const token = getCookie("accessToken");

        if (!token) {
            router.push("/auth/login");
        } else if (!isLoading) {
            if (isError || !userResponse?.success) {
                router.push("/auth/login");
            } else {
                setIsChecking(false);
            }
        }
    }, [isLoading, isError, userResponse, router]);

    if (isLoading || isChecking) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9FAFB]">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return <>{children}</>;
}
