# Admin Credit Summary

Date: 2026-06-10

A concise, credit-focused summary for the Backlyst backend: existing surface, recommended admin APIs, minimal data model additions, risks, and an implementation priority plan.

## Executive summary

- Existing: `UserCreditWallet`, `WebsiteCreditWallet`, `CreditLog`, subscription/purchased/referral/earned/visibility buckets, task credit flows (`reserve`, `refund`, `reward`).
- Missing: dedicated admin credit namespace and admin-grade APIs for ledger oversight, forensic adjustments/reversals, referral governance, visibility governance, analytics, and central credit configuration.
- Recommended admin namespace: `/admin-credits/*` (keeps admin ops separate from `/credits/*`).

## Minimal admin API set (P0)

These unlock core admin features and should be implemented first:

- GET `/admin-credits/overview` — platform liquidity and top-line dashboard cards (total pools, active users/sites, disputes).
- GET `/admin-credits/ledger` — paginated, filterable global credit ledger (filters: userId, websiteId, taskId, creditType, action, reason, sourceBucket, fromDate, toDate).
- GET `/admin-credits/wallets/websites/:websiteId` — website wallet profile with bucket balances and recent ledger rows.
- POST `/admin-credits/adjustments` — audited manual adjustments (ADD/REMOVE/REVERSE) with `reasonCode`, `note`, `adminId`, `balanceBefore`, `balanceAfter`, and linked `CreditLog`.

## Secondary APIs (P1)

- Referral governance: GET `/admin-credits/referrals`, GET `/admin-credits/referrals/:id`, POST approve/revoke actions, freeze/unfreeze.
- Visibility governance: GET `/admin-credits/visibility/websites`, POST pause/restore/extend/grace-override.

## Configuration & analytics (P2)

- Central config endpoints: GET/PATCH `/admin-credits/config/*` for grace windows, referral rewards, feature toggles.
- Analytics and exports: GET `/admin-credits/analytics/registry`, supply-vs-demand, and export endpoints (CSV/PDF).

## Data model recommendations

- Add `AdminCreditAdjustment` model with fields: `id`, `adminId`, `targetType`, `targetId`, `walletId`, `creditLogId`, `bucket`, `action`, `amount`, `balanceBefore`, `balanceAfter`, `reasonCode`, `note`, `integrityHash`, `createdAt`.
- Add `sourceBucket` to `CreditLog` enum: `SUBSCRIPTION|PURCHASED|REFERRAL|EARNED|VISIBILITY` to avoid parsing provenance from notes.
- Consider `WebsiteVisibilityState` if visibility becomes a first-class governance model.

## Key risks

1. `CreditLog` provenance encoded in free-form notes — breaks analytics. Fix with `sourceBucket`.
2. Manual adjustments lack immutable forensic records — implement `AdminCreditAdjustment` with integrity hash.
3. Central config must not silently override existing subscription plan APIs — compose and keep responsibilities scoped.
4. Visibility status is not modeled — add `WebsiteVisibilityState` and action log for admin operations.

## Minimal implementation plan

1. Phase 1 (P0) — Read layer: scaffold `src/modules/credit/admin-credit` and implement P0 endpoints (`/overview`, `/ledger`, `/wallets/websites/:websiteId`, `/adjustments` create).
2. Phase 2 (P0-P1) — Actions & audit: forensic reversals, adjustment listing/details, generate integrity hash via Node `crypto`, add Prisma model and migration.
3. Phase 3 (P1) — Governance: referrals and visibility admin actions.
4. Phase 4 (P2) — Config, analytics, exports.

## Files created

- This file: `docs/admin-credit-summary.md` (concise, credit-focused).

---

If you'd like, I can now scaffold the `admin-credit` Nest module and implement the P0 read endpoints, or generate a PDF of this summary now.
