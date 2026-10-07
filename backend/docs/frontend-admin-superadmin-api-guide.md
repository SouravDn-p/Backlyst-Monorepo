# Frontend API Guide: Admin And Superadmin

This document is for frontend implementation of the Backlyst admin portal. It separates superadmin-only routes from general admin routes and explains which UI sections should use each API group.

## Base Rules

| Item | Rule |
| --- | --- |
| Base API URL | Use the backend API base URL, for example `http://localhost:5001`. |
| API docs | Swagger is available at `/api/docs`. |
| Auth header | Send `Authorization: Bearer <accessToken>` for all protected admin routes. |
| Admin login | Admins and superadmins log in through `POST /auth/admin-login`. |
| Superadmin | Has full access to all admin sections and can create/manage normal admins. |
| Normal admin | Access depends on the permission matrix configured by superadmin. |

## Permission Model

Admin permissions are section-based.

| Permission Field | Meaning |
| --- | --- |
| `section` | Admin area, for example `USERS`, `CREDITS`, `TASKS`, `REWARDS`. |
| `canCreate` | Can create/add records in that section. |
| `canRead` | Can view/list records in that section. |
| `canUpdate` | Can update/approve/resolve records in that section. |
| `canDelete` | Can delete/revoke/remove records in that section. |

Superadmin should call:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/admin/authorization/sections` | Get all admin sections and allowed actions. |
| `GET` | `/admin/authorization/admins` | List admin accounts. |
| `POST` | `/admin/authorization/admins` | Create a normal admin. |
| `GET` | `/admin/authorization/admins/:id` | Get one admin and permissions. |
| `PATCH` | `/admin/authorization/admins/:id` | Update normal admin account. |
| `DELETE` | `/admin/authorization/admins/:id` | Soft delete normal admin. |
| `PUT` | `/admin/authorization/admins/:id/permissions` | Replace permission matrix. |

Frontend guidance:

| UI Behavior | Rule |
| --- | --- |
| Superadmin sidebar | Show every admin section. |
| Normal admin sidebar | Show sections where the admin has at least `canRead=true`. |
| Create buttons | Show only if `canCreate=true`. |
| Edit/approve buttons | Show only if `canUpdate=true`. |
| Delete/revoke buttons | Show only if `canDelete=true`. |

## Superadmin/Admin Auth Routes

| Method | Route | Used By | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/admin-login` | Admin login page | Login admin or superadmin. |
| `GET` | `/auth/me` | Admin shell | Get current logged-in admin profile. |
| `POST` | `/auth/logout` | Admin shell | Logout current session. |
| `POST` | `/auth/logout-all` | Admin account menu | Logout all own sessions. |
| `GET` | `/auth/sessions` | Account security page | List own active sessions. |
| `DELETE` | `/auth/sessions/:sessionId` | Account security page | Revoke one own session. |

## Admin Dashboard

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin/dashboard/overview` | Admin Dashboard cards | Active users, website status, task oversight, credit simulation. |
| `GET` | `/admin/dashboard/marketplace/health` | Admin Dashboard marketplace health | Marketplace health/summary metrics. |
| `GET` | `/credits/admin/dashboard` | Credit/admin dashboard | Credit dashboard summary. |

## Users And Accounts

Use these for user registry, moderation, and account control.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/admin/users/registry` | User registry list. |
| `GET` | `/admin/users/registry/:userId` | User registry detail. |
| `POST` | `/admin/users/registry/:userId/reset-password` | Admin reset user password. |
| `PATCH` | `/admin/users/registry/:userId/suspend` | Suspend user. |
| `PATCH` | `/admin/users/registry/:userId/ban` | Ban user. |
| `POST` | `/admin/users/registry/:userId/force-logout` | Force logout all user sessions. |
| `POST` | `/admin/users/registry/:userId/notes` | Add governance note. |
| `GET` | `/admin-user/registry` | Legacy/admin user registry. |
| `GET` | `/admin-user/registry/:userId` | Legacy/admin user detail. |
| `POST` | `/admin-user/registry/:userId/suspend` | Legacy suspend. |
| `POST` | `/admin-user/registry/:userId/ban` | Legacy ban. |
| `POST` | `/admin-user/registry/:userId/reset-password` | Legacy reset password. |
| `POST` | `/admin-user/registry/:userId/force-logout` | Legacy force logout. |
| `POST` | `/admin-user/registry/:userId/governance-notes` | Legacy governance note. |
| `PATCH` | `/admin-user/block-user/:userId` | Block user. |
| `PATCH` | `/admin-user/suspend-user/:userId` | Suspend user. |
| `PATCH` | `/admin-user/reactivate-user/:userId` | Reactivate user. |
| `DELETE` | `/admin-user/admin/delete-user/:id` | Delete user. |
| `PATCH` | `/admin-user/change-role/:id` | Change user role. |
| `GET` | `/admin-user` | Legacy all users list. |
| `PATCH` | `/admin-user/force-logout/:userId` | Legacy force logout. |

Frontend note: prefer `/admin/users/registry...` for new UI. Treat `/admin-user...` as legacy unless the screen already depends on it.

## Websites And Verification

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/website` | Website list | List websites. |
| `GET` | `/website/:id` | Website profile | Website detail. |
| `PATCH` | `/website/:id/lock` | Website moderation | Lock/unlock website. |
| `PATCH` | `/website/:id/flag` | Website moderation | Flag/unflag website. |
| `GET` | `/website/:id/trust` | Website trust panel | Trust/status details. |
| `GET` | `/website-verification-admin/pending` | Verification queue | Pending verification requests. |
| `GET` | `/website-verification-admin/details/:id` | Verification detail | Request detail. |
| `PATCH` | `/website-verification-admin/screenshot/approve` | Verification action | Approve screenshot verification. |
| `PATCH` | `/website-verification-admin/screenshot/reject` | Verification action | Reject screenshot verification. |
| `PATCH` | `/website-verification-admin/approve` | Verification action | Generic approve. |
| `PATCH` | `/website-verification-admin/reject` | Verification action | Generic reject. |
| `POST` | `/website-verification-admin/meta-tag` | Verification settings | Create/update meta tag config. |
| `GET` | `/website-verification-admin/meta-tag` | Verification settings | Get meta tag config. |
| `PATCH` | `/website-verification-admin/websites/:websiteId/force-reverification` | Website moderation | Force website re-verification. |

## Website Status And Marketplace Visibility

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin/marketplace-visibility` | Marketplace Visibility page | List website visibility/compliance status. |
| `POST` | `/admin/website-status` | Website status config | Create/update website status record. |
| `PATCH` | `/admin/website-status/:websiteId/tier-limits` | Website limits | Update website tier limits. |
| `GET` | `/admin/website-status/:websiteId/quality-metrics` | Website quality panel | Current quality metrics. |
| `GET` | `/admin/website-status/:websiteId/quality-history` | Website quality panel | Quality history. |
| `POST` | `/admin/website-status/:websiteId/reset-quality-score` | Website quality action | Reset quality score. |
| `POST` | `/admin/website-status/:websiteId/recompute` | Website quality action | Recompute website status. |
| `GET` | `/admin/website-status/:websiteId/quality-trend` | Website quality chart | Quality trend. |

## Credits And Wallet Governance

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin/credits/governance-summary` | Credit Governance Ledger | Aggregate subscription/referral/visibility/earned/usage totals. |
| `POST` | `/admin/credits/websites/:websiteId/task-credits` | Admin website credit action | Add task credits to any website. |
| `POST` | `/admin/credits/websites/:websiteId/task-credits/remove` | Admin website credit action | Remove task credits from website. |
| `POST` | `/admin/credits/websites/:websiteId/visibility-credits` | Admin website credit action | Add visibility credits to website. |
| `PATCH` | `/admin/credits/websites/:websiteId/wallet-lock` | Admin wallet control | Lock/unlock website wallet. |
| `GET` | `/admin/credits/websites/:websiteId/details` | Website credit detail | Full website credit detail for admin. |
| `GET` | `/admin-credits/overview` | Legacy credit admin | Credit overview. |
| `GET` | `/admin-credits/wallets/users/:userId` | Legacy credit admin | User wallet detail. |
| `GET` | `/admin-credits/wallets/websites/:websiteId` | Legacy credit admin | Website wallet detail. |

## Tasks And Disputes

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin-task/dashboard/oversight` | Task dashboard | Task oversight metrics. |
| `GET` | `/admin-task/dashboard/lifecycle` | Task dashboard | Lifecycle metrics. |
| `GET` | `/admin-task/dashboard/lifecycle-panel` | Task dashboard | Lifecycle panel data. |
| `GET` | `/admin-task/all` | Admin task list | List all tasks. |
| `GET` | `/admin-task/:id` | Admin task detail | One task detail. |
| `POST` | `/admin-task/:id/action` | Admin task action | Force/admin task action. |
| `POST` | `/admin/disputes/:id/resolve` | Dispute management | Resolve dispute. |
| `GET` | `/disputes` | Dispute list | List disputes. |
| `GET` | `/admin/manual-match-queue` | Manual match queue | List queue. |
| `POST` | `/admin/manual-match-queue` | Manual match queue | Add queue entry. |
| `POST` | `/admin/manual-match-queue/:id/resolve` | Manual match queue | Resolve queue entry. |

## Referrals

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin/referrals/registry` | Referral registry | List referral relationships/rewards. |
| `GET` | `/admin/referrals/:referralId` | Referral detail | Get one referral detail. |
| `POST` | `/admin/referrals/:referralId/approve-credit` | Referral action | Approve referral credit. |
| `POST` | `/admin/referrals/:referralId/revoke-credit` | Referral action | Revoke referral credit. |
| `POST` | `/admin/referrals/:referralId/disable-entity-referrals` | Referral control | Disable referrals for entity. |
| `POST` | `/admin/referrals/freeze` | Referral control | Freeze referral activity. |
| `GET` | `/admin/referral-reward-config` | Referral settings | Get referral reward config. |
| `PATCH` | `/admin/referral-reward-config` | Referral settings | Update referral reward config. |

## Subscriptions And Plans

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin-subscription/all` | Subscription admin | List subscriptions. |
| `POST` | `/admin-subscription-plan` | Plan management | Create subscription plan. |
| `GET` | `/admin-subscription-plan/all` | Plan management | List all plans for admin. |
| `PATCH` | `/admin-subscription-plan/make-plan-inactive` | Plan management | Mark plan inactive. |
| `PATCH` | `/admin-subscription-plan/:id` | Plan management | Update plan. |

## Rewards And Badges

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin/rewards/badges` | Reward config | List badge definitions. |
| `GET` | `/admin/rewards/badges/:id` | Reward config | Get one badge. |
| `POST` | `/admin/rewards/badges` | Reward config | Create badge definition. |
| `PATCH` | `/admin/rewards/badges/:id` | Reward config | Update badge definition. |
| `DELETE` | `/admin/rewards/badges/:id` | Reward config | Disable/delete badge definition. |
| `POST` | `/admin/rewards/seed-defaults` | Reward ops | Seed default reward definitions. |
| `GET` | `/admin/rewards/users/:userId` | User reward admin | View user reward state. |
| `POST` | `/admin/rewards/users/:userId/badges/assign` | User reward admin | Assign badge. |
| `POST` | `/admin/rewards/users/:userId/badges/revoke` | User reward admin | Revoke badge. |
| `POST` | `/admin/rewards/dynamic-refresh` | Reward ops | Refresh due dynamic badges. |
| `POST` | `/admin/rewards/expire-benefits` | Reward ops | Expire stale benefits. |
| `GET` | `/admin/rewards/ledger` | Reward ledger | Reward ledger rows. |
| `GET` | `/admin/rewards/audit-logs` | Reward audit | Audit logs. |
| `GET` | `/admin/rewards/audit-logs/:id` | Reward audit | One audit log. |
| `GET` | `/admin/rewards/outbox/health` | Reward ops | Reward outbox health. |
| `GET` | `/admin/rewards/outbox` | Reward ops | Outbox rows. |
| `POST` | `/admin/rewards/outbox/recover-stale` | Reward ops | Recover stale outbox rows. |

## Messaging And Reports

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/messaging/admin/chat` | Admin messaging | Admin chat view. |
| `GET` | `/messaging/admin/registry` | Message registry | Message moderation registry. |
| `GET` | `/messaging/admin/registry/:id/evidence-pdf` | Message evidence | Download evidence PDF. |
| `PATCH` | `/messaging/admin/registry/:id/status` | Message moderation | Update message status. |
| `GET` | `/messaging/admin/message-reports` | Message reports | List reports. |
| `DELETE` | `/messaging/admin/message-reports/:id` | Message reports | Delete report. |
| `PATCH` | `/messaging/admin/message-reports/:id/review` | Message reports | Review report. |

## Admin Notifications

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin/notifications` | Admin notification drawer | List admin notifications. |
| `GET` | `/admin/notifications/unread-count` | Admin notification badge | Unread count. |
| `PATCH` | `/admin/notifications/:id/read` | Admin notification drawer | Mark one read. |
| `PATCH` | `/admin/notifications/read-all` | Admin notification drawer | Mark all read. |
| `POST` | `/admin/notifications/send` | Admin notification action | Send admin notification. |
| `POST` | `/admin/notifications/broadcast` | Admin notification action | Broadcast notification. |

## Analytics And Reports

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin/analytics/overview` | Analytics dashboard | Overview analytics. |
| `GET` | `/admin/analytics/marketplace` | Marketplace analytics | Marketplace analytics. |
| `GET` | `/admin/analytics/marketplace-liquidity` | Liquidity analytics | Marketplace liquidity. |
| `GET` | `/admin/analytics/notifications/metrics` | Notification analytics | Notification metrics. |
| `GET` | `/admin/analytics/domain-pairs` | Domain pair analytics | Domain pair list. |
| `GET` | `/admin/analytics/domain-pairs/:pairKey` | Domain pair detail | Domain pair detail. |
| `GET` | `/admin/analytics/pattern-flags` | Risk flags | Pattern flags. |
| `PATCH` | `/admin/analytics/pattern-flags/:id/resolve` | Risk flags | Resolve pattern flag. |
| `GET` | `/admin/analytics/report-registry` | Reports | Report registry. |
| `GET` | `/admin/analytics/reports/:reportType` | Reports | One report type. |
| `POST` | `/admin/analytics/saved-reports` | Saved reports | Create saved report. |
| `GET` | `/admin/analytics/saved-reports` | Saved reports | List saved reports. |
| `GET` | `/admin/analytics/saved-reports/:id` | Saved reports | One saved report. |
| `PATCH` | `/admin/analytics/saved-reports/:id` | Saved reports | Update saved report. |
| `DELETE` | `/admin/analytics/saved-reports/:id` | Saved reports | Delete saved report. |
| `POST` | `/admin/analytics/saved-reports/:id/regenerate` | Saved reports | Regenerate report. |
| `GET` | `/admin/analytics/export/all/pdf` | Export | Export all PDF. |
| `GET` | `/admin/analytics/export/all/csv` | Export | Export all CSV. |
| `GET` | `/admin/analytics/export/:reportType/pdf` | Export | Export report PDF. |
| `GET` | `/admin/analytics/export/:reportType/csv` | Export | Export report CSV. |
| `GET` | `/admin/analytics/saved-reports/:id/export/pdf` | Export | Export saved report PDF. |
| `GET` | `/admin/analytics/saved-reports/:id/export/csv` | Export | Export saved report CSV. |

## Marketplace Configuration

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin/marketplace-config` | Marketplace scoring config | Get config. |
| `PATCH` | `/admin/marketplace-config` | Marketplace scoring config | Update config. |
| `GET` | `/admin/marketplace/scoring-config` | Alternate scoring config path | Get config. |
| `PATCH` | `/admin/marketplace/scoring-config` | Alternate scoring config path | Update config. |
| `GET` | `/admin/marketplace-mode` | Marketplace mode | Get mode. |
| `PUT` | `/admin/marketplace-mode` | Marketplace mode | Update mode. |
| `GET` | `/admin/marketplace-overrides` | Marketplace overrides | List overrides. |
| `POST` | `/admin/marketplace-overrides` | Marketplace overrides | Create override. |
| `PATCH` | `/admin/marketplace-overrides/:id` | Marketplace overrides | Update override. |
| `DELETE` | `/admin/marketplace-overrides/:id` | Marketplace overrides | Delete override. |
| `GET` | `/admin/marketplace/overrides` | Alternate override path | List overrides. |
| `POST` | `/admin/marketplace/overrides` | Alternate override path | Create override. |
| `PATCH` | `/admin/marketplace/overrides/:id` | Alternate override path | Update override. |
| `DELETE` | `/admin/marketplace/overrides/:id` | Alternate override path | Delete override. |
| `GET` | `/admin/niche-caps` | Niche caps | List caps. |
| `POST` | `/admin/niche-caps` | Niche caps | Create cap. |
| `PATCH` | `/admin/niche-caps/:id` | Niche caps | Update cap. |
| `DELETE` | `/admin/niche-caps/:id` | Niche caps | Delete cap. |
| `GET` | `/admin/domain-pair-inspection` | Domain-pair inspection | Inspect domain pairs. |

## Platform Feature Toggles

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin/platform-feature-toggles` | System settings | Get platform feature toggles. |
| `PATCH` | `/admin/platform-feature-toggles` | System settings | Update feature toggles. |

Current toggles used by backend:

| Toggle | Backend Effect |
| --- | --- |
| `REFERRAL_ENGINE_INCENTIVES` | Controls referral reward grants. |
| `VISIBILITY_DISCOVERY_REWARDS` | Controls visibility reward grants/restores. |
| `INTERNAL_ENTITY_MESSAGING` | Controls messaging availability where wired. |
| `SELF_SERVICE_DISPUTE_CENTER` | Controls user dispute route where wired. |
| `USER_REVIEWS_RATINGS` | Stored for frontend/UI usage; no backend blocking required currently. |
| `EXTERNAL_NODE_API_ACCESS` | Stored for frontend/UI usage; no backend blocking required currently. |

## Community Showcase

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin/community/showcase` | Showcase admin | List showcase entries. |
| `POST` | `/admin/community/showcase/entries` | Showcase admin | Create entry. |
| `PATCH` | `/admin/community/showcase/entries/:id` | Showcase admin | Update entry. |
| `DELETE` | `/admin/community/showcase/entries/:id` | Showcase admin | Delete entry. |
| `POST` | `/admin/community/showcase/rankings/recalculate` | Showcase admin | Recalculate rankings. |
| `POST` | `/admin/community/showcase/stats/refresh` | Showcase admin | Refresh stats. |

## Legal Docs, Contact, Blog, Taxonomy

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `POST` | `/legal-docs` | Legal admin | Create legal document/version. |
| `PATCH` | `/legal-docs/versions/:id/activate` | Legal admin | Activate version. |
| `DELETE` | `/legal-docs/versions/:id` | Legal admin | Delete version. |
| `GET` | `/legal-docs/versions/:id` | Legal admin | Get version. |
| `GET` | `/legal-docs/documents/:id` | Legal admin | Get document. |
| `GET` | `/contact/admin/all` | Contact admin | List contacts. |
| `GET` | `/contact/admin/:id` | Contact admin | Contact detail. |
| `PATCH` | `/contact/admin/:id` | Contact admin | Update contact. |
| `DELETE` | `/contact/admin/:id` | Contact admin | Delete contact. |
| `GET` | `/blog/admin/all` | Blog admin | List all blog posts. |
| `GET` | `/blog/admin/:id` | Blog admin | Blog admin detail. |
| `PATCH` | `/blog/admin/markdown/:id` | Blog admin | Update markdown blog. |
| `DELETE` | `/blog/admin/:id` | Blog admin | Delete blog. |
| `POST` | `/admin/taxonomy/categories` | Taxonomy | Create category. |
| `GET` | `/admin/taxonomy/categories` | Taxonomy | List categories. |
| `PATCH` | `/admin/taxonomy/categories/:id` | Taxonomy | Update category. |
| `POST` | `/admin/taxonomy/tags` | Taxonomy | Create tag. |
| `GET` | `/admin/taxonomy/tags` | Taxonomy | List tags. |
| `PATCH` | `/admin/taxonomy/tags/:id` | Taxonomy | Update tag. |
| `POST` | `/admin/taxonomy/categories/:id/relations` | Taxonomy | Manage category relations. |
| `POST` | `/admin/website-category-keys` | Website taxonomy | Create website category key. |
| `GET` | `/website-category-keys` | Website taxonomy | List category keys. |
| `PATCH` | `/admin/website-category-keys/:id` | Website taxonomy | Update category key. |
| `DELETE` | `/admin/website-category-keys/:id` | Website taxonomy | Delete category key. |
| `POST` | `/admin/website-marketplace-tags` | Website tags | Create marketplace tag. |
| `GET` | `/website-marketplace-tags` | Website tags | List tags. |
| `GET` | `/website-marketplace-tags/:id` | Website tags | Tag detail. |
| `PATCH` | `/admin/website-marketplace-tags/:id` | Website tags | Update tag. |
| `DELETE` | `/admin/website-marketplace-tags/:id` | Website tags | Delete tag. |

## Compliance And Audit

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin/dashboard/compliance/consents` | Compliance dashboard | Consent records. |
| `GET` | `/admin/dashboard/compliance/governance-records` | Compliance dashboard | Governance records. |
| `GET` | `/admin/dashboard/compliance/abuse-reports` | Compliance dashboard | Abuse reports. |
| `GET` | `/admin/dashboard/compliance/task-disputes` | Compliance dashboard | Task disputes. |
| `GET` | `/admin/dashboard/compliance/financial-records` | Compliance dashboard | Financial records. |
| `GET` | `/admin/forensic-audit-logs` | Audit logs | Forensic audit logs. |

## Uploads And Webhooks

| Method | Route | Used By | Purpose |
| --- | --- | --- | --- |
| `POST` | `/upload-s3/presign` | Admin upload forms | Get presigned S3 upload URL. |
| `POST` | `/upload-s3/direct` | Admin upload forms | Direct upload. |
| `POST` | `/stripe/webhook` | Stripe only | Unified Stripe webhook. Do not call from frontend. |
| `POST` | `/user-subscription/webhook` | Stripe legacy/direct | Stripe subscription webhook. Do not call from frontend. |
| `POST` | `/credits/purchased/webhook` | Stripe legacy/direct | Purchased credit webhook. Do not call from frontend. |
| `POST` | `/credits/visibility/webhook` | Stripe legacy/direct | Visibility credit webhook. Do not call from frontend. |

## Frontend Implementation Prompt

Use this prompt when building the admin frontend:

```text
Build the Backlyst admin/superadmin frontend using the API groups in docs/frontend-admin-superadmin-api-guide.md.
Use POST /auth/admin-login for login. Store the access token and attach Authorization: Bearer <token> to every protected request.
If the logged-in role is SUPER_ADMIN, show all admin sections.
If the logged-in role is ADMIN, fetch/admin-load the permission matrix and show only sections/actions allowed by canCreate/canRead/canUpdate/canDelete.
Use /admin/authorization/* only for SUPER_ADMIN admin-management screens.
Use /admin/dashboard/overview for dashboard cards.
Use /admin/users/registry for account management.
Use /admin/credits/* for credit governance and wallet actions.
Use /admin-task/* for task oversight.
Use /admin/referrals/* for referral governance.
Use /admin/rewards/* for rewards and badges.
Use /admin/notifications/* for admin notification drawer.
Never call Stripe webhook routes from the frontend.
```

