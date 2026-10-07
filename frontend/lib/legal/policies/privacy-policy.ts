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

export const PRIVACY_POLICY: LegalPolicy = {
  slug: "privacy-policy",
  ...meta,
  sections: [
    {
      id: "who-we-are",
      title: "Who we are",
      paragraphs: [
        "This Privacy Policy explains how Backlyst (“we”, “us”) collects, uses and shares personal data when you visit backlyst.co.uk, create an account or use the Platform. For UK GDPR, Backlyst is the controller of account, billing-contact and Platform-usage data described in this Policy.",
        "Backlyst is a business platform. We expect the individuals who register to do so in a business, trade or professional capacity.",
      ],
    },
    {
      id: "data-we-collect",
      title: "Personal data we collect",
      paragraphs: [
        "We collect the following categories of personal data, depending on how you use the Platform:",
      ],
      bullets: [
        "Identity and contact data: name, email address, phone number, company name, role and billing or support contact details.",
        "Account data: login credentials (stored in hashed form), profile image, notification preferences and verification status.",
        "Business and website data: websites you register, industry, country, URLs and related verification materials.",
        "Transaction data: credit purchases, allocations, invoices, referral codes and marketplace task history.",
        "Technical data: IP address, device type, browser, approximate location derived from IP, and log data needed to secure the service.",
        "Communications: messages sent through the Platform, support tickets and, if you opt in, marketing preferences.",
      ],
    },
    {
      id: "how-we-collect",
      title: "How we collect data",
      paragraphs: [
        "We collect data directly from you when you register, complete your profile, purchase credits, submit a contact form or message another user. We also collect data automatically through cookies, logs and similar technologies, and from payment, hosting, email and analytics providers who process data on our instructions.",
        "If another user names you in a task, message or company profile, we process that information to deliver the relevant feature.",
      ],
    },
    {
      id: "purposes-and-lawful-bases",
      title: "Purposes and lawful bases",
      paragraphs: [
        "We process personal data for the following purposes and lawful bases under UK GDPR:",
      ],
      bullets: [
        "Perform our contract with you: creating and securing accounts, operating the marketplace, processing credits and providing support.",
        "Legitimate interests: keeping the Platform safe, preventing fraud and abuse, improving features, and understanding aggregated usage. We balance these interests against your rights.",
        "Legal obligation: tax, accounting, dispute and regulatory requirements.",
        "Consent: optional marketing emails, and non-essential cookies where consent is required. You may withdraw consent at any time.",
      ],
    },
    {
      id: "marketing",
      title: "Marketing",
      paragraphs: [
        "We only send news, product updates, offers and marketing emails if you have opted in on the registration form or in your settings. You can unsubscribe at any time using the link in those emails or by contacting us.",
        "Transactional messages that are necessary to provide the service (for example security alerts, invoices, task updates you have enabled) are not marketing and may still be sent.",
      ],
    },
    {
      id: "sharing",
      title: "Who we share data with",
      paragraphs: [
        "We share personal data only as needed to operate the Platform:",
      ],
      bullets: [
        "Other users, to the extent required for a task, application, company directory listing or message you choose to send.",
        "Service providers acting as processors: hosting, storage, email delivery, payments, analytics and customer support tools.",
        "Professional advisers, auditors and insurers, under confidentiality.",
        "Authorities, where required by law or to protect rights, safety or the integrity of the Platform.",
      ],
    },
    {
      id: "international-transfers",
      title: "International transfers",
      paragraphs: [
        "Some processors may be located outside the United Kingdom. Where that occurs, we use an appropriate safeguard such as the UK International Data Transfer Agreement, UK Addendum to the EU SCCs, or a UK adequacy regulation.",
      ],
    },
    {
      id: "retention-and-security",
      title: "Retention and security",
      paragraphs: [
        "We keep personal data only for as long as needed for the purposes above, including limitation periods and legal retention. Further detail is set out in the Data Rights, Retention & Deletion Notice.",
        "We use organisational and technical measures appropriate to the risk, including access controls, encryption in transit and hashed passwords. No method of transmission or storage is completely secure.",
      ],
    },
    {
      id: "your-rights",
      title: "Your rights",
      paragraphs: [
        "Depending on your circumstances, you may have rights of access, rectification, erasure, restriction, portability and objection, and the right to withdraw consent. How to exercise those rights is explained in the Data Rights, Retention & Deletion Notice.",
        "You may complain to the UK Information Commissioner’s Office (ICO) if you are unhappy with how we handle your data.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      paragraphs: [
        "We use essential cookies to keep you signed in and to protect the Platform. We may also use analytics or preference cookies. Where required, we will ask for consent. You can control cookies through your browser settings, but blocking essential cookies may prevent the Platform from working.",
      ],
    },
    {
      id: "changes-and-contact",
      title: "Changes and contact",
      paragraphs: [
        "We may update this Privacy Policy from time to time. The “Last updated” date will change and, where the update is material, we will provide a more prominent notice.",
        "Privacy questions can be sent through the Backlyst Contact page. Please include the email address associated with your account.",
      ],
    },
  ],
};
