import type { LegalDocumentSlug } from "./documents";

export type LegalPolicySection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalPolicy = {
  slug: LegalDocumentSlug;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  governingLaw: string;
  sections: LegalPolicySection[];
};

export const LEGAL_VERSION = "1.0";
export const LEGAL_EFFECTIVE_DATE = "3 September 2026";
export const LEGAL_LAST_UPDATED = "3 September 2026";
export const LEGAL_CONTACT_PATH = "/contact";
export const LEGAL_PLATFORM_NAME = "Backlyst";
export const LEGAL_SITE_URL = "https://backlyst.co.uk";
