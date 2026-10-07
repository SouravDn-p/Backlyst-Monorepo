import type { LegalDocumentSlug } from "./documents";
import { COMMUNITY_GUIDELINES } from "./policies/community-guidelines";
import { CREDIT_VISIBILITY_TERMS } from "./policies/credit-visibility-terms";
import { DATA_RIGHTS_NOTICE } from "./policies/data-rights";
import { PRIVACY_POLICY } from "./policies/privacy-policy";
import { TERMS_OF_SERVICE } from "./policies/terms-of-service";
import type { LegalPolicy } from "./policyTypes";

export const LEGAL_POLICIES: Record<LegalDocumentSlug, LegalPolicy> = {
  "terms-of-service": TERMS_OF_SERVICE,
  "community-guidelines": COMMUNITY_GUIDELINES,
  "credit-visibility-terms": CREDIT_VISIBILITY_TERMS,
  "privacy-policy": PRIVACY_POLICY,
  "data-rights": DATA_RIGHTS_NOTICE,
};

export const getLegalPolicyBySlug = (slug: string) =>
  LEGAL_POLICIES[slug as LegalDocumentSlug];
