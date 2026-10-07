import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_LAST_UPDATED,
  LEGAL_VERSION,
  type LegalPolicy,
} from "../policyTypes";

const meta = {
  version: LEGAL_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  lastUpdated: LEGAL_LAST_UPDATED,
  governingLaw: "England and Wales",
};

export const TERMS_OF_SERVICE: LegalPolicy = {
  slug: "terms-of-service",
  ...meta,
  sections: [
    {
      id: "about-these-terms",
      title: "About these Terms",
      paragraphs: [
        "These Terms of Service (“Terms”) govern access to and use of the Backlyst platform, websites, applications and related services (together, the “Platform”). The Platform is a business marketplace that helps organisations procure, place and manage backlinks and related SEO services.",
        "By creating an account, accessing the Platform or using any Backlyst service, you agree to these Terms, the Community Guidelines & Acceptable Use Policy, and the Credit & Visibility System Terms. You also acknowledge that you have read the Privacy Policy and the Data Rights, Retention & Deletion Notice.",
        "If you do not agree to these Terms, you must not create an account or use the Platform.",
      ],
    },
    {
      id: "who-may-use-backlyst",
      title: "Who may use Backlyst",
      paragraphs: [
        "Backlyst is supplied solely for business, trade or professional purposes. You must be at least 18 years of age and have authority to bind the organisation you represent.",
        "You represent and warrant that: (a) you are not a consumer for the purposes of UK consumer law; (b) the information you provide is accurate and complete; and (c) your use of the Platform will comply with applicable law, including advertising, competition, data protection and search-engine guidelines.",
      ],
    },
    {
      id: "accounts-and-security",
      title: "Accounts and security",
      paragraphs: [
        "You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You must notify Backlyst promptly if you suspect unauthorised access.",
        "We may require identity, company or website verification before certain features are available. We may suspend or restrict an account where we reasonably believe these Terms, our policies or the law have been breached.",
      ],
    },
    {
      id: "the-marketplace",
      title: "The marketplace",
      paragraphs: [
        "Backlyst connects requesters (organisations seeking placements) with providers or publishers (organisations offering website inventory or related services). Backlyst is a platform operator. Unless we expressly state otherwise in writing, we are not a party to the underlying placement arrangement between users.",
        "Users are solely responsible for the websites they register, the content they publish, the tasks they create or accept, and the commercial suitability of any placement. Backlyst does not guarantee rankings, traffic, conversions, search-engine treatment or any particular SEO outcome.",
      ],
    },
    {
      id: "acceptable-use",
      title: "Acceptable use",
      paragraphs: [
        "You must use the Platform in accordance with the Community Guidelines & Acceptable Use Policy. In particular, you must not use Backlyst to facilitate spam, cloaking, malware, hidden links, deceptive redirect schemes, or any practice intended to manipulate search results in a way that is unlawful or prohibited by major search engines.",
        "We may remove content, cancel tasks, reverse credits, reduce visibility or suspend accounts where we reasonably consider that a user has engaged in abusive, fraudulent or harmful conduct.",
      ],
    },
    {
      id: "fees-credits-and-taxes",
      title: "Fees, credits and taxes",
      paragraphs: [
        "Certain features require purchased credits, earned credits or visibility credits. The acquisition, use, expiry and non-refundability of credits are governed by the Credit & Visibility System Terms.",
        "Prices are shown on the Platform at the point of purchase. Unless stated otherwise, amounts are exclusive of applicable taxes. You are responsible for any VAT or similar tax due on your transactions.",
      ],
    },
    {
      id: "intellectual-property",
      title: "Intellectual property",
      paragraphs: [
        "Backlyst and its licensors own the Platform, including software, branding, design, documentation and aggregated marketplace data. We grant you a limited, non-exclusive, non-transferable licence to use the Platform for your internal business purposes while your account remains in good standing.",
        "You retain ownership of content you submit. You grant Backlyst a worldwide licence to host, process, display and transmit that content solely as needed to operate, secure and improve the Platform and to perform contracts with you.",
      ],
    },
    {
      id: "confidentiality",
      title: "Confidentiality",
      paragraphs: [
        "Each party must keep confidential any non-public business information received from the other through the Platform, except where disclosure is required by law, already public, independently developed, or needed to perform a marketplace task with another user in the ordinary course of using Backlyst.",
      ],
    },
    {
      id: "warranties-and-disclaimers",
      title: "Warranties and disclaimers",
      paragraphs: [
        "The Platform is provided on an “as is” and “as available” basis. To the fullest extent permitted by law, Backlyst disclaims all implied warranties, including merchantability, fitness for a particular purpose, non-infringement and uninterrupted availability.",
        "Search engines, browsers, third-party websites and payment providers are outside our control. Temporary interruption, ranking changes or third-party refusal of a placement do not, by themselves, constitute a breach of these Terms.",
      ],
    },
    {
      id: "liability",
      title: "Limitation of liability",
      paragraphs: [
        "Nothing in these Terms limits liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or any liability that cannot be limited under English law.",
        "Subject to the previous paragraph, Backlyst is not liable for loss of profit, loss of business, loss of goodwill, loss of data, or any indirect or consequential loss. Our aggregate liability arising out of or in connection with the Platform in any 12-month period is limited to the greater of: (a) the amounts you paid to Backlyst for credits or subscriptions in that period; and (b) one hundred pounds sterling (£100).",
      ],
    },
    {
      id: "suspension-and-termination",
      title: "Suspension and termination",
      paragraphs: [
        "You may stop using the Platform at any time. Account deletion is handled as described in the Data Rights, Retention & Deletion Notice.",
        "We may suspend or terminate access immediately where we reasonably believe it is necessary to protect the Platform, other users, or to comply with law. Accrued payment obligations, credit rules, confidentiality, IP, liability and governing-law clauses survive termination.",
      ],
    },
    {
      id: "changes",
      title: "Changes to these Terms",
      paragraphs: [
        "We may update these Terms from time to time. Material changes will be notified in-product or by email. Continued use of the Platform after the effective date of an update constitutes acceptance of the revised Terms, except where applicable law requires a further consent.",
      ],
    },
    {
      id: "governing-law",
      title: "Governing law and disputes",
      paragraphs: [
        "These Terms are governed by the laws of England and Wales. The courts of England and Wales have exclusive jurisdiction, except that Backlyst may seek injunctive relief in any jurisdiction to protect its intellectual property or the Platform.",
      ],
    },
    {
      id: "contact",
      title: "Contact",
      paragraphs: [
        "Questions about these Terms may be sent through the Backlyst Contact page. Please include your account email and a short description of the issue.",
      ],
    },
  ],
};
