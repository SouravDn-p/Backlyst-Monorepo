import type { CompanyDirectoryDetail } from "@/types/company/companyDirectoryTypes";

export const formatHours = (minutes?: number) => {
  if (!minutes || minutes <= 0) return "N/A";
  if (minutes < 60) return `${minutes}m`;

  const hours = minutes / 60;
  return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)}h`;
};

export const formatDateDistance = (dateString?: string) => {
  if (!dateString) return "Recently";

  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  const days = Math.max(0, Math.floor(diffMs / dayMs));

  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
};

export const getReliabilityLabel = (score?: number) => {
  if (!score && score !== 0) return "Not enough data";
  if (score >= 90) return "Historically High";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Stable";

  return "Developing";
};

export const getCompanySpecializationLabel = (
  detail?: CompanyDirectoryDetail | null,
) => {
  if (!detail) return "NICHE SPECIALIST • GENERAL";

  const left = detail.publisher?.nicheSpecialization || detail.businessType || "NICHE SPECIALIST";
  const right = detail.companyIndustry || "GENERAL";

  return `${left.toUpperCase()} • ${right.toUpperCase()}`;
};
