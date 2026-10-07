import type { WebsiteCategoryKey } from "@/types/website/websiteTypes";

export const LEGACY_INDUSTRY_MAP: Record<string, string> = {
  Technology: "technology-and-software",
  SaaS: "technology-and-software",
  Marketing: "marketing-and-media",
  "E-commerce": "e-commerce-and-retail",
  Finance: "finance-and-business",
  Health: "health-fitness-and-medicine",
  TechNews: "other",
  Education: "education-and-careers",
  Other: "other",
};

export function getPrimaryCategories(categories: WebsiteCategoryKey[]) {
  return categories.filter((c) => c.parentId === null);
}

export function getSecondaryCategories(
  categories: WebsiteCategoryKey[],
  parentId: string | null | undefined
) {
  if (!parentId) return [];
  return categories.filter((c) => c.parentId === parentId);
}
