import { setCookie } from "@/lib/cookie";

export const saveAuthSession = (token: string) => {
    setCookie("accessToken", token, {
        days: 7,
        path: "/",
        sameSite: "Lax",
    });
};