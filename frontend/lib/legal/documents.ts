export type LegalDocumentSlug =
  | "terms-of-service"
  | "community-guidelines"
  | "credit-visibility-terms"
  | "privacy-policy"
  | "data-rights";

export type RegistrationLegalDocument = {
  slug: LegalDocumentSlug;
  name: string;
  href: string;
  description: string;
};

export const REGISTRATION_LEGAL_DOCUMENTS: RegistrationLegalDocument[] = [
  {
    slug: "terms-of-service",
    name: "Backlyst Terms of Service",
    href: "/legal/terms-of-service",
    description:
      "The terms that govern use of the Backlyst platform for business, trade or professional purposes.",
  },
  {
    slug: "community-guidelines",
    name: "Community Guidelines & Acceptable Use Policy",
    href: "/legal/community-guidelines",
    description:
      "Rules for acceptable behaviour and prohibited use of Backlyst community and marketplace features.",
  },
  {
    slug: "credit-visibility-terms",
    name: "Credit & Visibility System Terms",
    href: "/legal/credit-visibility-terms",
    description:
      "Terms that apply to purchased credits, earned credits and website visibility on Backlyst.",
  },
  {
    slug: "privacy-policy",
    name: "Privacy Policy",
    href: "/legal/privacy-policy",
    description:
      "How Backlyst collects, uses and shares personal data when you use the platform.",
  },
  {
    slug: "data-rights",
    name: "Data Rights, Retention & Deletion Notice",
    href: "/legal/data-rights",
    description:
      "Your data rights and how long Backlyst retains or deletes account and platform data.",
  },
];

export const getLegalDocumentBySlug = (slug: string) =>
  REGISTRATION_LEGAL_DOCUMENTS.find((document) => document.slug === slug);
