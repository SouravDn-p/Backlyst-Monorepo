# Admin Dashboard Feature Control Audit

Date: 2026-08-04

Scope: backend NestJS API only. This repository does not include a visible frontend dashboard implementation, so this audit maps features that are controlled or surfaced by dashboard/admin APIs in the backend.

## Executive Summary

The application has a broad admin/dashboard control plane. The strongest control areas are marketplace operations, website verification/status, credit governance, referral governance, rewards, user governance, messaging moderation, analytics/reporting, legal documents, notifications, and community showcase curation.

There are also provider and requester dashboards, but those are mostly read-only participant metrics, not administrative controls.

## Primary Admin Dashboard Surfaces

| Area | Route prefix | Control level | Main purpose |
| --- | --- | --- | --- |
| Admin overview | `/admin/dashboard` | Read-only | Platform overview cards and marketplace health checks |
| Admin analytics | `/admin/analytics` | Read/write for saved reports and pattern-flag resolution | Analytics dashboards, reports, exports, saved snapshots, abuse/risk visibility |
| Platform feature toggles | `/admin/platform-feature-toggles` | Write | Runtime on/off switches for selected platform features |
| Marketplace config | `/admin/marketplace-config`, `/admin/marketplace/scoring-config` | Write | Matching/scoring/cooldown/quality thresholds |
| Marketplace mode | `/admin/marketplace-mode` | Write | Switch marketplace between `EARLY_STAGE` and `SCALING` |
| Marketplace overrides | `/admin/marketplace-overrides`, `/admin/marketplace/overrides` | Write | Website/task/account boosts, suppression, force match, score overrides, penalties |
| Manual match queue | `/admin/manual-match-queue` | Write | Manually queue and resolve marketplace matches |
| Website marketplace status | `/admin/website-status` | Write | Set website quality/marketplace status, tier limits, quality recompute/reset |
| Website verification admin | `/website-verification-admin` | Write | Approve/reject verifications, global meta tag config, force reverification |
| Website admin controls | `/website` admin routes | Write | List websites, lock wallets, flag/unflag websites |
| Credit governance | `/admin/credits`, `/admin-credits`, `/credits/admin/dashboard` | Mixed | Credit overview, wallet detail, manual credit add/remove, wallet lock |
| Referral governance | `/admin/referrals`, `/admin/referral-reward-config` | Write | Referral registry, approve/revoke credit, disable referrals, freeze program, tune rewards |
| User governance | `/admin-user`, `/admin/users` | Write | Suspend, ban, reactivate, delete, role change, password reset, force logout, notes |
| Task governance | `/admin-task`, `/admin/disputes` | Write | Task oversight, force actions, freeze, refunds/reversals, dispute resolution |
| Rewards admin | `/admin/rewards` | Write | Badge definitions, manual assign/revoke, outbox recovery, dynamic badge refresh |
| Community showcase admin | `/admin/community/showcase` | Write | Curate showcase entries, rankings, stats refresh |
| Messaging moderation | `/messaging/admin/*` | Write | Inspect chats, update registry status, review/delete message reports |
| Notifications admin | `/admin/notifications` | Write | Admin notifications, admin-wide send/broadcast, read state |
| Legal documents | `/legal-docs` admin routes | Write | Create versions, activate versions, delete inactive versions, list docs |
| Compliance dashboard | `/admin/dashboard/compliance` | Read-only | Consent, governance notes, abuse reports, task disputes, financial records |
| Contact enquiries | `/contact/admin/*` | Write | List, inspect, update, delete contact enquiries |
| Blog CMS | `/blog/admin/*`, `/blog`, `/blog/markdown` | Write but guard issue | Admin-like blog create/update/delete/list controls |
| Marketplace taxonomy | `/admin/taxonomy` | Write | Categories, tags, category relations |
| Niche caps | `/admin/niche-caps` | Write | Distribution caps by marketplace category/scope |
| Domain pair inspection | `/admin/domain-pair-inspection`, `/admin/analytics/domain-pairs*` | Read-only | Inspect domain interaction/cooldown/risk history |
| Forensic audit | `/admin/forensic-audit-logs` | Read-only | Unified admin audit ledger |

## Dashboard-Controlled Feature Inventory

### 1. Platform Feature Toggles

Admin can fetch and bulk update these toggles:

- `USER_REVIEWS_RATINGS`
- `REFERRAL_ENGINE_INCENTIVES`
- `VISIBILITY_DISCOVERY_REWARDS`
- `INTERNAL_ENTITY_MESSAGING`
- `EXTERNAL_NODE_API_ACCESS`
- `SELF_SERVICE_DISPUTE_CENTER`

Runtime enforcement found:

- `INTERNAL_ENTITY_MESSAGING` gates messaging endpoints.
- `SELF_SERVICE_DISPUTE_CENTER` gates dispute open/list flows.
- `REFERRAL_ENGINE_INCENTIVES` gates referral reward behavior.
- `VISIBILITY_DISCOVERY_REWARDS` is checked inside referral reward behavior.

Potentially weak/unused toggles:

- `USER_REVIEWS_RATINGS` and `EXTERNAL_NODE_API_ACCESS` are defined but no enforcement point was found in `src/modules`.

### 2. Marketplace Engine Controls

Admin can tune marketplace scoring and eligibility behavior:

- Compatibility, opportunity, visibility, reputation, boost weights.
- Minimum viable matches and maximum relaxation level.
- Repeat-pair cooldown and reciprocal cooldown windows.
- Network concentration cap and window.
- Max provider matches per day.
- New website boost factor.
- Risk penalty dispute weight.
- Neglected/force-match timing thresholds.
- Low-priority score factor.
- Quality engine weight, status thresholds, sub-signal weights, premium-access threshold.
- Restricted/under-review visibility factors and restricted daily-cap factor.
- Active/inactive scoring config state.

Admin can also switch marketplace mode:

- `EARLY_STAGE`
- `SCALING`
- Optional preset JSON for relaxation/velocity behavior.

Admin can apply targeted overrides:

- `BOOST`
- `SUPPRESS`
- `FORCE_MATCH`
- `SCORE_OVERRIDE`
- `PENALTY`
- `LIMIT_BYPASS`
- `RISK_BYPASS`
- `PRIORITY`
- `MANUAL_ASSIGNMENT`
- `RESTRICTION`

Override targets may be website, task, or account depending on payload.

### 3. Manual Marketplace Intervention

Admin can:

- List manual match queue rows.
- Enqueue a manual requester/provider match.
- Resolve a queue row as `APPLIED`, `RESOLVED`, or `CANCELLED`.

This supports LOW_POOL or low-liquidity marketplace intervention.

### 4. Marketplace Distribution and Taxonomy Controls

Admin can:

- Create/update/list marketplace categories.
- Create/update/list marketplace tags.
- Create category relations.
- Create/update/deactivate niche distribution caps.
- Filter caps by scope and active state.

Niche cap controls include:

- `categoryKey`
- `scope`: `PRIMARY` or `SECONDARY`
- `maxPerWindow`
- `windowDays`
- `isActive`
- `note`

### 5. Website Verification and Website Governance

Admin can:

- Approve website verification.
- Reject website verification.
- List pending/manual verification requests.
- View verification details with proof metadata.
- Add/update global website verification meta tag.
- Force reverification for a previously verified website.
- List all websites with filters.
- Flag/unflag a website.
- Lock/unlock a website wallet.

Verification approval also creates/upserts the website matching profile and unlocks website-verified referral stage rewards.

### 6. Website Marketplace Status and Quality Controls

Admin can set website marketplace status:

- `ACTIVE`
- `LOW_PRIORITY`
- `LIMITED_ACCESS`
- `UNDER_REVIEW`
- `RESTRICTED`
- `SUSPENDED`

Admin can also:

- Set per-website daily cap for limited/restricted access.
- Set `weeklyInteractionLimit`.
- Set `tierVelocityLimit`.
- View internal quality metrics.
- View quality status history.
- Reset quality score.
- Trigger quality recompute.
- View quality trends.

### 7. Credit Governance Controls

Read-only dashboard features:

- Platform credit overview.
- Credit governance summary.
- User master wallet profile.
- Website wallet profile.
- Website credit/subscription detail with ledger transactions.
- Credit admin dashboard panel at `/credits/admin/dashboard`.

Write controls:

- Add earned task credits directly to a website.
- Add visibility credits directly to a website.
- Remove earned task credits from a website.
- Lock/unlock website wallet with audit reason.

Manual credit adjustments require amount, reason, and idempotency key.

### 8. Referral Governance Controls

Admin can:

- View referral attribution registry.
- View referral detail modal data.
- Approve referral credit.
- Revoke referral credit and reverse settlement.
- Disable referral activity for referrer or referred user.
- Emergency-freeze referral program.
- Configure reward amount, max user referral pool, and one-credit-per-user enforcement.

Audit note: the controller summary says freeze or unfreeze all referral activity, but the current service implementation only sets `referralsFrozen: true`; no unfreeze path was found.

### 9. Subscription and Plan Controls

Admin can:

- Create subscription plans.
- List all plans by active state or tier.
- Update plan pricing/configuration.
- Mark a plan inactive.
- View all subscriptions with status counts and active subscription revenue.

Plan controls include:

- Tier
- Name/description
- Price
- Billing interval
- Task credits per cycle
- Max task credit capacity
- Max websites
- Visibility credit capacity
- Feature JSON
- Active state

### 10. User Governance Controls

Admin can:

- List users with filters/search.
- View user registry rows and profile details.
- Ban/block users.
- Suspend users with duration and reason.
- Reactivate users.
- Delete users.
- Change user role.
- Trigger password reset.
- Force logout all active sessions.
- Append internal governance notes.

There are duplicate/overlapping route families:

- `/admin-user/*`
- `/admin/users/*`

### 11. Task Governance and Dispute Controls

Admin dashboard exposes:

- Task oversight dashboard.
- Task lifecycle dashboard.
- Task lifecycle panel with backlink trust ratio.
- Full admin task ledger with filters.
- Admin task detail with requester, provider, applications, and flow history.

Admin task actions:

- `FREEZE`
- `FORCE_APPROVE`
- `FORCE_REJECT`
- `CREDIT_REFUND`
- `CREDIT_REVERSE`
- `RESOLVE_DISPUTE`
- `FLAG_ABUSE_PATTERN`

Dispute controls:

- Admin resolves disputes through `/admin/disputes/:id/resolve`.
- User self-service dispute center is gated by `SELF_SERVICE_DISPUTE_CENTER`.

### 12. Rewards and Badge Controls

Admin can:

- Create badge definitions.
- Update badge definitions.
- Soft-disable badge definitions.
- Seed default badges and additional reward definitions.
- View one user's reward state.
- Assign a badge to a user.
- Revoke a badge from a user.
- Refresh due dynamic badges.
- Expire stale benefits.
- View reward ledger.
- View reward audit logs.
- View/recover reward outbox processing state.

Badge definition controls include:

- Code/name/description.
- Category, scope, role scope.
- Trigger type.
- Thresholds.
- Persistent/active state.
- Reward type/value/meta.
- Validity, refresh window, grace period.

### 13. Community Showcase Controls

Admin can:

- List showcase entries.
- Create showcase entries.
- Update showcase entries.
- Hide showcase entries.
- Recalculate ranking snapshots.
- Refresh user/website showcase stats.

Controlled fields include section, entity type, entity id, title/subtitle/description, visibility, featured state, sort order, priority, featured date window, external link behavior, and reason.

### 14. Messaging Moderation Controls

Admin can:

- View chat between two users by id or email.
- List message registry records.
- Download one message evidence PDF.
- Update registry status.
- List message reports.
- Review message reports.
- Delete message reports.

Registry status changes require a `MessageRegistryStatus`; report review uses `REVIEWED`, `DISMISSED`, or `ACTION_TAKEN`.

### 15. Notifications Controls

Admin can:

- View own admin notifications.
- View own unread admin notification count.
- Mark one notification read.
- Mark all admin notifications read.
- Send an admin-wide notification.
- Broadcast an admin-wide notification.

Notification payload supports type, category, title/body, data, actor, entity type/id, priority, and idempotency key.

### 16. Legal, Compliance, Contact, and CMS Controls

Legal document controls:

- Create legal document versions.
- Activate a version.
- Delete inactive versions.
- List legal documents with filters.

Compliance dashboard is read-only:

- Consent records.
- Governance-note records.
- Abuse reports.
- Task dispute/freeze/abuse events.
- Subscription and paid-credit ledger records.

Contact enquiry controls:

- List enquiries.
- View enquiry detail.
- Update enquiry.
- Delete enquiry.

Blog/CMS controls:

- Admin list all posts.
- Admin view single post by id.
- Create block-based blog post.
- Create markdown blog post.
- Update markdown blog post.
- Delete blog post.

Security caveat: create/update/delete blog routes currently have admin guard lines commented out, despite admin labels.

### 17. Analytics, Reporting, and Forensic Audit Controls

Admin analytics supports:

- Overview cards.
- Marketplace liquidity snapshot.
- Notification delivery metrics.
- Marketplace analytics dashboard.
- Domain pair stats and pair inspection.
- Coordinated-exchange pattern flags.
- Pattern-flag resolution.
- Fixed report registry.
- Live report detail.
- PDF/CSV export for one report.
- PDF/CSV export for all reports.
- Saved report creation.
- Saved report listing/detail.
- Saved report regenerate.
- Saved report name/description update.
- Saved report soft delete.
- Saved report PDF/CSV export.
- Forensic audit ledger listing.

Report types:

- `WEBSITES_TASKS_SUMMARY`
- `CREDIT_USAGE_SUMMARY`
- `DAILY_PLATFORM_ACTIVITY`
- `FOLLOW_NOFOLLOW_LINKS`
- `USER_RETENTION_GROWTH`
- `TASK_LIFECYCLE_RISK`
- `PROVIDER_PERFORMANCE`
- `GOVERNANCE_RISK`
- `FULL_PLATFORM_SUMMARY`

## Participant Dashboards

Provider dashboard:

- Summary of applications, tasks, performance, and contribution.
- Task control counters.
- Activity feed.

Requester dashboard:

- Task counts.
- Credit spend summary.
- Requester performance rates.

These are authenticated user dashboards, not admin control surfaces.

## Main Gaps and Risks Found

1. Blog admin mutation routes are not protected in code.
   The controller has `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('ADMIN')` commented out for create/update/delete blog operations.

2. Referral freeze endpoint is one-way.
   `/admin/referrals/freeze` is documented as freeze/unfreeze, but the service only freezes the program.

3. Some feature toggles are defined but not enforced.
   `USER_REVIEWS_RATINGS` and `EXTERNAL_NODE_API_ACCESS` have no enforcement usage found under `src/modules`.

4. Admin user APIs are duplicated.
   `/admin-user` and `/admin/users` expose overlapping registry/action functionality. This can confuse frontend integration and permission documentation.

5. Credit admin APIs are split.
   `/admin/credits` contains newer mutation/governance endpoints, while `/admin-credits` contains read-only overview/wallet endpoints. A dashboard should treat these as one feature family, but API clients need both prefixes.

6. Some controls are read-only despite dashboard naming.
   `/admin/dashboard/compliance`, `/admin/marketplace-visibility`, `/admin/domain-pair-inspection`, and `/admin/forensic-audit-logs` are inspection surfaces, not direct control surfaces.

## Suggested Dashboard Navigation Grouping

- Overview: platform overview, marketplace health, active users/websites, task oversight, credit simulation.
- Marketplace Ops: scoring config, mode, overrides, manual match queue, niche caps, taxonomy, visibility list, domain-pair inspection.
- Websites: verification queue, website registry, status/quality controls, wallet lock, force reverification.
- Credits: governance summary, wallet detail, manual task/visibility credits, transaction ledger.
- Users: user registry, profile, status actions, force logout, governance notes.
- Tasks: task dashboard, task ledger, admin actions, disputes.
- Referrals: registry, credit approval/revocation, entity referral disable, freeze, reward config.
- Rewards: badge definitions, user badge assignment, ledger, audit logs, outbox recovery.
- Community: showcase curation, ranking recalculation, stats refresh.
- Messaging: chat inspection, registry, evidence PDF, report review.
- Notifications: admin notifications, broadcast/send.
- Content and Compliance: blog CMS, legal docs, contact enquiries, compliance records, forensic audit.
