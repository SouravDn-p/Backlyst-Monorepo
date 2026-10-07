"use client";

import React from "react";

type StatusVariant = "default" | "success" | "warning";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
}

const statusStyles: Record<StatusVariant, { bg: string; text: string }> = {
  default: { bg: "#f9f5ff", text: "#331ffd" },
  success: { bg: "#ecfdf3", text: "#12b76a" },
  warning: { bg: "#fff1e9", text: "#fd751f" },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
}) => {
  const computedVariant: StatusVariant =
    variant ||
    (status.includes("IN PROGRESS")
      ? "default"
      : status.includes("AVAILABLE")
        ? "warning"
        : status.includes("COMPLETED")
          ? "success"
          : "default");

  const style = statusStyles[computedVariant] || {
    bg: "#f5f5f5",
    text: "#535862",
  };

  return (
    <span
      className="px-2.5 py-1 rounded text-sm font-medium uppercase"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {status === "Waiting for Applicants" ? "WAITING FOR APPLICANTS" : status}
    </span>
  );
};
