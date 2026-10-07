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

export const COMMUNITY_GUIDELINES: LegalPolicy = {
  slug: "community-guidelines",
  ...meta,
  sections: [
    {
      id: "purpose",
      title: "Purpose",
      paragraphs: [
        "These Community Guidelines & Acceptable Use Policy (“Guidelines”) set the standard of conduct for everyone using Backlyst. They sit alongside the Terms of Service and apply to requesters, providers, publishers and any person acting on a company’s behalf.",
        "The Platform exists to support legitimate, commercially reasonable backlink and content-placement activity between businesses. Conduct that harms users, websites, search quality or Backlyst’s integrity is not permitted.",
      ],
    },
    {
      id: "professional-conduct",
      title: "Professional conduct",
      paragraphs: [
        "Communicate professionally in tasks, applications, messages and reviews. Do not harass, threaten, impersonate or discriminate against other users.",
        "Do not scrape, harvest or bulk-export another user’s contact details, website inventory or marketplace data except through features we expressly provide.",
      ],
      bullets: [
        "Keep task briefs, deliverables and messages accurate and complete.",
        "Honour agreed deadlines, niches and placement specifications.",
        "Report disputes through Platform tools rather than public attacks.",
        "Do not attempt to take contracted work off-platform in order to evade fees, credits or safeguards.",
      ],
    },
    {
      id: "website-and-content-standards",
      title: "Website and content standards",
      paragraphs: [
        "Websites registered on Backlyst must be under your control or operated with authority from the owner. You must not register domains you do not operate, or misrepresent traffic, industry, language or audience.",
      ],
      bullets: [
        "No malware, phishing pages, forced redirects or doorway networks.",
        "No adult, illegal, hateful or violent content where it would reasonably surprise the other party or breach law.",
        "No cloned, spun or scraped sites created solely to sell placements.",
        "No undisclosed paid editorial that would breach ASA, CAP or equivalent advertising rules where those rules apply to you.",
      ],
    },
    {
      id: "search-and-link-integrity",
      title: "Search and link integrity",
      paragraphs: [
        "Backlyst does not permit schemes whose primary purpose is to deceive search engines or users. The following are prohibited unless a specific Backlyst feature expressly allows an equivalent, disclosed workflow:",
      ],
      bullets: [
        "Hidden, cloaked or JavaScript-only links that users cannot reasonably see.",
        "Link farms, PBNs operated deceptively, or reciprocal-link rings designed to inflate rankings artificially.",
        "Buying or selling links in a manner that conceals the commercial nature of the placement from readers where disclosure is required.",
        "Automated or bulk messaging that constitutes spam.",
      ],
    },
    {
      id: "platform-integrity",
      title: "Platform integrity",
      paragraphs: [
        "You must not interfere with the Platform, its matching, credit, visibility, referral or verification systems.",
      ],
      bullets: [
        "No multiple accounts to evade suspension, limits or verification.",
        "No manipulation of reviews, badges, rankings or visibility scores.",
        "No unauthorised access, probing or reverse engineering of non-public APIs.",
        "No uploading of content that infringes intellectual property or privacy rights.",
      ],
    },
    {
      id: "enforcement",
      title: "Enforcement",
      paragraphs: [
        "We may investigate reports and take action we consider proportionate, including warnings, content removal, task cancellation, credit reversal, visibility reduction, temporary suspension or permanent exclusion.",
        "Serious or repeated breaches may be reported to payment providers, hosting providers or law enforcement where we reasonably believe we are required or permitted to do so.",
      ],
    },
    {
      id: "reporting",
      title: "Reporting concerns",
      paragraphs: [
        "If you believe another user is breaching these Guidelines, use in-product reporting where available or contact us via the Contact page with evidence, URLs and timestamps. Do not engage in public accusations that themselves breach these Guidelines.",
      ],
    },
  ],
};
