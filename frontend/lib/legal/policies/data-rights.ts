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

export const DATA_RIGHTS_NOTICE: LegalPolicy = {
  slug: "data-rights",
  ...meta,
  sections: [
    {
      id: "about-this-notice",
      title: "About this notice",
      paragraphs: [
        "This Data Rights, Retention & Deletion Notice explains how long Backlyst keeps personal data, how you can exercise your rights, and what happens when an account is closed. It should be read with the Privacy Policy.",
        "It applies to personal data we control in connection with the Platform. It does not override statutory retention periods or a user’s own obligations where they act as an independent controller of their website or customer data.",
      ],
    },
    {
      id: "your-rights",
      title: "Your data rights",
      paragraphs: [
        "Subject to UK GDPR and the Data Protection Act 2018, you may request to:",
      ],
      bullets: [
        "Access a copy of personal data we hold about you.",
        "Correct inaccurate or incomplete personal data.",
        "Erase personal data in certain circumstances (“right to be forgotten”).",
        "Restrict or object to certain processing, including processing based on legitimate interests.",
        "Receive certain data in a portable format.",
        "Withdraw consent where processing is based on consent, including marketing emails.",
      ],
    },
    {
      id: "how-to-request",
      title: "How to make a request",
      paragraphs: [
        "Send requests through the Contact page from the email address on your account, or write to us with enough information to identify you. We may ask for additional verification before fulfilling a request.",
        "We will respond within one month of receiving a valid request, or tell you if we need more time because the request is complex. There is usually no fee, unless a request is manifestly unfounded or excessive.",
      ],
    },
    {
      id: "retention",
      title: "Retention periods",
      paragraphs: [
        "We apply the following typical retention periods. A longer or shorter period may apply where the law requires it or a dispute is ongoing:",
      ],
      bullets: [
        "Account profile and login data: for the life of the account, then up to 24 months after closure unless a longer legal hold applies.",
        "Marketplace tasks, messages and website records: for the life of the account and up to 36 months after the last related activity, to handle disputes, chargebacks and abuse investigations.",
        "Billing, invoices and credit ledgers: 6 years from the end of the financial year of the transaction, in line with UK accounting practice.",
        "Security logs and IP records: typically 12 months, longer if needed to investigate an incident.",
        "Marketing consents and suppression lists: for as long as we need to honour your preference, including a suppression record after you unsubscribe.",
        "Support correspondence: up to 24 months after the ticket is closed.",
      ],
    },
    {
      id: "deletion",
      title: "Account deletion",
      paragraphs: [
        "You may request deletion of your account through in-product settings where available, or via the Contact page. Deletion means we will stop providing the service and will erase or irreversibly anonymise personal data we no longer need.",
        "Some information is retained after deletion where we have a lawful basis to keep it. Examples include invoices, fraud-prevention records, legally required books and records, and backup copies that rotate out on a defined cycle.",
        "Content you posted into another user’s task, or that another business still needs to perform an existing contract, may be retained in that business context. Public or shared marketplace artefacts may be anonymised rather than removed where removal would break another user’s records.",
      ],
    },
    {
      id: "backups-and-holds",
      title: "Backups and legal holds",
      paragraphs: [
        "Deleted data may remain in encrypted backups for a limited period until those backups expire. Backup copies are not used for live processing.",
        "If we receive a valid legal hold, tax enquiry, or active dispute, we may pause deletion of the affected records until the matter is resolved.",
      ],
    },
    {
      id: "organisation-accounts",
      title: "Organisation accounts",
      paragraphs: [
        "If you use Backlyst for a company, the company may be an independent controller of business content it uploads. An organisation administrator may ask us to transfer or close seats when staff leave. We will take reasonable steps to verify that the requester is authorised.",
      ],
    },
    {
      id: "complaints",
      title: "Complaints",
      paragraphs: [
        "If you are not satisfied with our response, you may contact the UK Information Commissioner’s Office at ico.org.uk. We would appreciate the chance to resolve your concern first.",
      ],
    },
  ],
};
