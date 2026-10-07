import type { Metadata } from "next";
import "./globals.css";
import { ReduxProviders } from "@/providers/ReduxProviders";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Backlyst | Scale Your Backlinks Without The Hassle",
  description: "Modern backlink building platform for SEO professionals and content creators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ReduxProviders>{children}</ReduxProviders>
        <Toaster
          closeButton
          richColors
          position="top-right"
          toastOptions={{
            className: "font-[var(--font-sora)]",
          }}
        />
      </body>
    </html>
  );
}
