import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/guard/ProtectedRoute";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Backlyst | Scale Your Backlinks Without The Hassle",
  description: "Dashboard for managing your backlink building activities",
};

export default function DashboardLayoutPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute>
      <main className="">
        <DashboardLayout>{children}</DashboardLayout>
      </main>
    </ProtectedRoute>
  );
}
