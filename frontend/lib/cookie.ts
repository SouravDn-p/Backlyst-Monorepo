type CookieOptions = {
  days?: number;
  path?: string;
  sameSite?: "Strict" | "Lax" | "None";
  secure?: boolean;
};

export const setCookie = (
  name: string,
  value: string,
  options: CookieOptions = {}
) => {
  if (typeof window === "undefined") return;

  const {
    days = 7,
    path = "/",
    sameSite = "Lax",
    secure = window.location.protocol === "https:",
  } = options;

  const expires = new Date(Date.now() + days * 86400000);

  const cookie = [
    `${name}=${encodeURIComponent(value)}`,
    `expires=${expires.toUTCString()}`,
    `path=${path}`,
    `SameSite=${sameSite}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  document.cookie = cookie;
};

export const getCookie = (name: string): string | null => {
  if (typeof window === "undefined") return null;

  const cookies = document.cookie.split("; ");

  for (const cookie of cookies) {
    const [key, value] = cookie.split("=");

    if (key === name) {
      return decodeURIComponent(value);
    }
  }

  return null;
};

export const deleteCookie = (name: string) => {
  if (typeof window === "undefined") return;

  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};