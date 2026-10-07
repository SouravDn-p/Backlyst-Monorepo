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

export const CREDIT_VISIBILITY_TERMS: LegalPolicy = {
  slug: "credit-visibility-terms",
  ...meta,
  sections: [
    {
      id: "scope",
      title: "Scope",
      paragraphs: [
        "These Credit & Visibility System Terms (“Credit Terms”) govern purchased credits, earned or task credits, visibility credits, referrals and related balances on Backlyst. They form part of the Backlyst Terms of Service.",
        "Credits are a limited licence to use Platform features. Credits are not cash, e-money, a stored-value facility or a security, and they have no value outside the Platform except where we are required by law to provide a refund.",
      ],
    },
    {
      id: "types-of-credit",
      title: "Types of credit",
      paragraphs: [
        "The Platform may maintain one or more balances, including:",
      ],
      bullets: [
        "Purchased credits: bought through a checkout flow for use on eligible tasks, requests or other paid actions.",
        "Earned or task credits: granted when you complete eligible marketplace activity according to then-current Platform rules.",
        "Visibility credits: used to increase the prominence of eligible websites or opportunities within Backlyst, not on third-party search engines.",
        "Referral or promotional credits: granted under a campaign, badge, streak or referral programme, subject to the terms shown at the time of grant.",
      ],
    },
    {
      id: "purchase-and-pricing",
      title: "Purchase and pricing",
      paragraphs: [
        "Credit packs, visibility packs and subscriptions are priced as displayed at checkout. Payment is processed by our payment partner. You authorise us to charge the selected method for the stated amount plus applicable tax.",
        "Unless a pack or campaign states otherwise, purchased credits are added to your account when payment is confirmed. Failed, charged-back or reversed payments may result in the corresponding credits being withheld or clawed back.",
      ],
    },
    {
      id: "use-of-credits",
      title: "Use of credits",
      paragraphs: [
        "Credits may only be used for the feature type they are issued for. Purchased credits cannot be converted into cash. Visibility credits cannot be exchanged for purchased credits unless a Platform tool expressly provides that conversion.",
        "Spending credits on a task, boost or allocation is generally final once the relevant action is confirmed. If a task is cancelled, disputed or fails verification, any restoration of credits is at Backlyst’s reasonable discretion under the applicable task rules.",
      ],
    },
    {
      id: "visibility",
      title: "Visibility",
      paragraphs: [
        "Visibility credits may improve how often an eligible website or opportunity is shown inside Backlyst. Visibility is not search-engine optimisation, a ranking guarantee, or a promise of impressions, clicks, applications or completed placements.",
        "We may cap, pause or re-order visibility where necessary to protect marketplace fairness, prevent abuse, or comply with law. Unused visibility allocations may expire according to the pack or campaign terms shown at purchase.",
      ],
    },
    {
      id: "expiry-and-forfeiture",
      title: "Expiry, holds and forfeiture",
      paragraphs: [
        "Promotional, referral and bonus credits may expire on the date stated when they are granted. If no date is stated, we may still expire inactive promotional balances on reasonable notice.",
        "Credits may be placed on hold, reversed or forfeited where we reasonably believe there has been fraud, chargeback, Terms or Guidelines breach, duplicate accounts, or manipulation of the credit or visibility system.",
      ],
    },
    {
      id: "refunds",
      title: "Refunds",
      paragraphs: [
        "Because Backlyst is a business-to-business service and credits are a licence to use digital features, purchases are non-refundable except where required by law or where we have charged you in error.",
        "If we close a feature permanently and unused purchased credits can no longer be used for any reasonably equivalent feature, we may, at our option, migrate the balance, extend its use, or offer a proportionate refund or credit note.",
      ],
    },
    {
      id: "referrals",
      title: "Referrals",
      paragraphs: [
        "Referral rewards are only payable or grantable where the referred account is genuine, unique and not created by you or a related party to game the programme. Self-referrals and circular referral rings are prohibited.",
        "We may withhold, reverse or disable referral benefits if we reasonably consider a referral to be abusive or ineligible.",
      ],
    },
    {
      id: "changes",
      title: "Changes",
      paragraphs: [
        "We may change credit prices, pack sizes, earning rates and visibility rules prospectively. Changes will not retrospectively remove purchased credits already paid for, except as permitted under “Expiry, holds and forfeiture” or where we provide a reasonably equivalent substitute.",
      ],
    },
  ],
};
