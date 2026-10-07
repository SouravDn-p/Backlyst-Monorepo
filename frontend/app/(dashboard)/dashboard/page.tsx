"use client";

import { useSelector } from "react-redux";
import { selectActiveTab } from "@/redux/features/slice/authSlice";
import ProviderDashboardHome from "@/components/dashboard/provider/ProviderDashboardHome";
import RequesterDashboardHome from "@/components/dashboard/requester/RequesterDashboardHome";

export default function DashboardPage() {
  const role = useSelector(selectActiveTab);

  return role === "provider" ? (
    <ProviderDashboardHome />
  ) : (
    <RequesterDashboardHome />
  );
}
