import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://")) {
    try {
      if (url.startsWith("/")) return true;
      new URL(url);
      return true;
    } catch (_) {
      return false;
    }
  }
  return false;
}
