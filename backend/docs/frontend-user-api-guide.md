# Frontend API Guide: User Side

This document is for frontend implementation of the Backlyst user-facing app. It groups routes by product area and explains when each route should be used.

## Base Rules

| Item | Rule |
| --- | --- |
| Base API URL | Use the backend API base URL, for example `http://localhost:5001`. |
| API docs | Swagger is available at `/api/docs`. |
| Auth header | Send `Authorization: Bearer <accessToken>` for all protected user routes. |
| User login | Users log in through `POST /auth/login`. |
| User role | Normal app users use role `USER`. |
| Webhooks | Stripe webhook routes are backend/Stripe-only; frontend must not call them. |

## User Auth And Session Flow

| Step | Method | Route | Purpose |
| --- | --- | --- | --- |
| 1 | `POST` | `/auth/register` | Create a user account and send email verification OTP. |
| 2 | `POST` | `/auth/verify-register-otp` | Verify registration OTP. |
| 3 | `POST` | `/auth/login` | Login user and receive access token. |
| Optional | `POST` | `/auth/resend-register-otp` | Resend registration OTP. |
| Optional | `GET` | `/auth/google` | Start Google auth. |
| Optional | `GET` | `/auth/google/callback` | Google auth callback. |

Account/session routes:

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/auth/me` | App shell/profile | Get current user. |
| `GET` | `/auth/dashboard-statics` | Dashboard | Auth/dashboard stats. |
| `PATCH` | `/auth/change-password` | Account security | Change current password. |
| `POST` | `/auth/forgotten-password` | Forgot password | Send reset OTP. |
| `POST` | `/auth/verify-forgotten-password-otp` | Forgot password | Verify reset OTP. |
| `POST` | `/auth/temp-password-reset` | Forgot password | Reset password after OTP. |
| `POST` | `/auth/logout` | App shell | Logout current session. |
| `POST` | `/auth/logout-all` | Account security | Logout all own sessions. |
| `GET` | `/auth/sessions` | Account security | List own sessions. |
| `DELETE` | `/auth/sessions/:sessionId` | Account security | Revoke one session. |

## User Profile And Preferences

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `PATCH` | `/user/update-profile` | Profile settings | Update profile fields. |
| `PATCH` | `/user/update-notification-preferences` | Notification settings | Legacy/update notification preference fields. |
| `PATCH` | `/user/update-task-defaults` | Task settings | Update task defaults. |
| `GET` | `/user/export-data` | Privacy/account | Export user data. |
| `DELETE` | `/user/delete-myself-account` | Privacy/account | Delete own account. |
| `GET` | `/user/:id` | Public/profile detail | Get user by id. |

## User Notifications

Use these for the notification bell/drawer. Recent backend notification phases now store credit, website verification, visibility, referral, reward/milestone, and subscription/payment notifications.

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/notifications` | Notification drawer | List current user notifications. |
| `GET` | `/notifications/unread-count` | Notification badge | Get unread count. |
| `PATCH` | `/notifications/:id/read` | Notification drawer | Mark one notification as read. |
| `PATCH` | `/notifications/read-all` | Notification drawer | Mark all notifications as read. |
| `GET` | `/notifications/preferences` | Notification settings | Get notification preferences. |
| `PATCH` | `/notifications/preferences` | Notification settings | Update notification preferences. |

Frontend notification categories to show:

| Category | Typical Trigger |
| --- | --- |
| `CREDIT_BALANCE` | Credit added, deducted, refunded, rewarded, subscription credits added. |
| `SECURITY` | Website verified/rejected/reverification. |
| `MARKETPLACE` | Visibility grace/expired/restored. |
| `REWARD` | Referral rewards, badges, milestones, weekly contribution, streak. |
| `SYSTEM_ANNOUNCEMENT` | Subscription/payment status changes. |
| `MESSAGE` | Message-related notifications. |
| `TASK_STATUS` | Task lifecycle notifications. |

## Website Management

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `POST` | `/website` | Add website | Create website. |
| `GET` | `/website` | Website discovery/list | List websites. |
| `GET` | `/website/my-websites` | My websites | List current user's websites. |
| `GET` | `/website/:id` | Website detail | Get website detail. |
| `PATCH` | `/website/:id` | Website edit | Update website. |
| `DELETE` | `/website/:id` | Website settings | Delete own website. |
| `GET` | `/website/:id/trust` | Website trust panel | Get trust/status data. |
| `GET` | `/websites/:websiteId/streak` | Website streak panel | Get weekly contribution streak. |

Note: `PATCH /website/:id/lock` and `PATCH /website/:id/flag` are moderation/admin-style actions. Do not expose them to normal users unless product explicitly allows it.

## Website Verification

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `POST` | `/website-verification/screenshot/request` | Verify website | Submit screenshot verification request. |
| `GET` | `/website-verification/details/:id` | Verification detail | Get one verification request detail. |
| `GET` | `/website-verification/my-requests` | Verification history | List current user's verification requests. |
| `GET` | `/website-verification/meta-tags` | Verification setup | Get required meta tag config. |
| `POST` | `/website-verification/meta-tag/request/:websiteId` | Verify website | Attempt meta-tag verification. |
| `POST` | `/website-verification/dns/request/:websiteId` | Verify website | Attempt DNS verification. |
| `POST` | `/website-verification/manual-review/request/:websiteId` | Verify website | Request manual review. |

Frontend flow:

| Step | Route | Expected UI Behavior |
| --- | --- | --- |
| 1 | `POST /website` | Create website. |
| 2 | `GET /website-verification/meta-tags` | Show required meta tag/DNS data. |
| 3 | `POST /website-verification/meta-tag/request/:websiteId` or `POST /website-verification/dns/request/:websiteId` | Try automatic verification. |
| 4 | `POST /website-verification/screenshot/request` or `POST /website-verification/manual-review/request/:websiteId` | Use manual route if automatic verification fails. |
| 5 | `GET /website-verification/my-requests` | Show status history. |

## Subscription Plans And User Subscription

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/user-subscription-plan/all` | Pricing page | Get active plans. |
| `POST` | `/user-subscription/checkout` | Pricing checkout | Create Stripe subscription checkout session. |
| `GET` | `/user-subscription/checkout-success?sessionId=...` | Subscription success page | Confirm Stripe session and fetch subscription. |
| `GET` | `/user-subscription/my-active-subscription` | Billing page | Current active/past-due subscription with credits. |
| `GET` | `/user-subscription/my-subscription-history` | Billing page | Subscription history. |
| `PATCH` | `/user-subscription/cancel` | Billing page | Cancel at period end. |
| `PATCH` | `/user-subscription/resume` | Billing page | Resume auto-renewal. |

Frontend subscription flow:

| Step | Route | Expected UI Behavior |
| --- | --- | --- |
| 1 | `GET /user-subscription-plan/all` | Render plan cards. |
| 2 | `POST /user-subscription/checkout` | Redirect user to Stripe checkout URL. |
| 3 | Stripe redirect | Frontend receives `session_id`. |
| 4 | `GET /user-subscription/checkout-success?sessionId=...` | Confirm payment and show plan. |
| 5 | `GET /credits/subscription` and `GET /credits/master` | Show subscription credits in wallet. |

## Credit Overview

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/credits/me` | Wallet overview | Combined current user credit overview. |
| `GET` | `/credits/dashboard/summary` | Dashboard cards | Credit summary cards. |
| `GET` | `/credits/master` | Master wallet | Master/account wallet balances. |
| `GET` | `/credits/master/statement` | Master wallet | Master wallet statement. |
| `GET` | `/credits/statement` | Wallet statement | Full current user statement. |
| `GET` | `/credits/earned` | Earned credits | Aggregated earned task credits across owned websites. |

Credit scope summary:

| Credit Type | First Stored In | Then Used From |
| --- | --- | --- |
| Subscription task credits | Master wallet | Allocate to website before task usage. |
| Purchased task credits | Master wallet | Allocate to website before task usage. |
| Referral task credits | Master wallet or website depending reward stage | Allocate if in master. |
| Earned task credits | Website wallet | Website-bound. |
| Visibility credits | Master wallet | Allocate to website to extend visibility. |

## Purchased Task Credits

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `POST` | `/credits/purchased/buy` | Buy credits | Create Stripe checkout for purchased task credits. |
| `GET` | `/credits/purchased/checkout-success?sessionId=...` | Buy credits success | Confirm checkout and add credits to master wallet. |
| `POST` | `/credits/purchased/allocate` | Wallet allocation | Move purchased credits from master wallet to website wallet. |

Frontend flow:

| Step | Route | Expected UI Behavior |
| --- | --- | --- |
| 1 | `POST /credits/purchased/buy` | User chooses any quantity; backend calculates most cost-effective Stripe amount. |
| 2 | Stripe checkout | Redirect user to Stripe URL. |
| 3 | `GET /credits/purchased/checkout-success?sessionId=...` | Confirm and add master credits. |
| 4 | `POST /credits/purchased/allocate` | Allocate credits to a website. |
| 5 | `GET /credits/websites/:websiteId/wallet` | Confirm website wallet balance. |

## Subscription Credits

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/credits/subscription` | Wallet overview | Current user's subscription task credits. |
| `POST` | `/credits/subscription/allocate` | Wallet allocation | Allocate subscription credits from master wallet to website wallet. |

## Referral Credits And Referral Progress

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/credits/referrers/summary` | Referral dashboard | Referral code/link and summary metrics. |
| `GET` | `/credits/referrers/progress` | Referral dashboard | Referral progress rows and stage rewards. |
| `POST` | `/credits/referral/allocate` | Wallet allocation | Allocate referral credits from master wallet to website wallet. |

Referral stage flow:

| Stage | Trigger | Reward Behavior |
| --- | --- | --- |
| Signed up | User2 registers with User1 referral code | Referrer sees referral progress row. |
| Website verified | Referred user verifies a website | Stage 1 reward/progress. |
| First backlink accepted | Referred user completes first verified backlink | Stage 2 reward/progress. |
| Paid subscription | Referred user buys paid subscription | Stage 3 task/visibility reward/progress. |

## Visibility Credits

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `POST` | `/credits/visibility/buy` | Buy visibility credits | Create Stripe checkout for visibility credits. |
| `GET` | `/credits/visibility/checkout-success?sessionId=...` | Visibility success | Confirm checkout and add visibility credits to master wallet. |
| `POST` | `/credits/visibility/allocate` | Visibility allocation | Allocate visibility credits to a website. |
| `GET` | `/credits/visibility/me` | Visibility wallet | Master + website visibility balances. |
| `GET` | `/credits/visibility/statement` | Visibility statement | Visibility credit statement. |

Visibility rule:

| Rule | Meaning |
| --- | --- |
| 1 visibility credit | Adds 7 days of website visibility. |
| Credits stack | New days are added to remaining active visibility period. |
| Website status | Website can be `VISIBLE`, `GRACE_PERIOD`, or `HIDDEN`. |

## Website Credit Wallet

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/credits/websites/:websiteId/wallet` | Website wallet | Final website wallet balances. |
| `GET` | `/credits/websites/:websiteId/summary` | Website wallet | Credit activity summary for website. |
| `GET` | `/credits/websites/:websiteId/statement` | Website wallet | Statement for one owned website. |

## Task Credits Internal Operations

These routes exist, but frontend should normally use task creation/completion routes instead of calling them directly.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/credits/tasks/deduct` | Deduct/reserve requester website task credits. |
| `POST` | `/credits/tasks/refund` | Refund reserved credits to requester website wallet. |
| `POST` | `/credits/tasks/reward-provider` | Add earned credits to provider website after completion. |

Frontend recommendation: do not expose direct buttons for these APIs. Task modules should call these internally during task lifecycle.

## Requester Task Flow

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `POST` | `/task-requester/moz-stats` | Task create helper | Fetch MOZ stats for target/domain. |
| `POST` | `/task-requester` | Create task | Create requester task. |
| `GET` | `/task-requester/my-tasks` | Requester dashboard | Current user's requested tasks. |
| `GET` | `/task-requester/:taskId` | Task detail | Requester task detail. |
| `GET` | `/task-requester/:taskId/applicants` | Task applicants | Applicants list. |
| `PATCH` | `/task-requester/:taskId/select-provider` | Task applicants | Select provider. |
| `PATCH` | `/task-requester/:taskId/cancel` | Task detail | Cancel task. |
| `PATCH` | `/task-requester/:taskId/review` | Task review | Approve/reject/request revision. |
| `GET` | `/task-requester/:taskId/timeline` | Task detail | Task timeline. |
| `PATCH` | `/task-requester/:taskId/deadline` | Task deadline | Update deadline. |
| `POST` | `/task-requester/:taskId/extend-deadline` | Task deadline | Request/extend deadline. |
| `PATCH` | `/task-requester/:taskId/deadline-extension-requests/:requestId/respond` | Deadline request | Respond to provider extension request. |
| `GET` | `/task-requester/provider-trust/:providerWebsiteId` | Provider profile panel | Provider trust details. |
| `POST` | `/task-requester/:taskId/quality-rubric` | Task quality | Submit quality rubric. |
| `GET` | `/requester/dashboard/summary` | Requester dashboard | Requester dashboard summary. |

Task create note:

| Field | Meaning |
| --- | --- |
| `walletType` | Which website wallet bucket should pay: `SUBSCRIPTION`, `PURCHASED`, `REFERRAL`, or `EARNED`. |
| `requesterWebsiteId` | Website that creates/requester task. |
| Task credit cost | Backlink usually 1 credit, guest post usually 2 credits unless task rules override. |

## Provider Task Flow

| Method | Route | UI Section | Purpose |
| --- | --- | --- | --- |
| `GET` | `/provider-task/opportunities` | Provider opportunities | Available tasks for provider. Supports filters. |
| `GET` | `/provider-task/tasks` | Provider dashboard | Provider task list. |
| `GET` | `/provider-task/provider/:id` | Provider profile | Provider detail. |
| `POST` | `/provider-task/:id/apply` | Opportunity detail | Apply to task. |
| `POST` | `/provider-task/:id/deadline-extension-request` | Task detail | Request deadline extension. |
| `PATCH` | `/provider-task/:id/start-work` | Task detail | Start selected work. |
| `PATCH` | `/provider-task/:id/respond-cancel-request` | Task detail | Accept/reject cancellation request. |
| `PATCH` | `/provider-task/:id/submit` | Task submission | Submit proof/work. |
| `PATCH` | `/provider-task/:id/resubmit` | Task submission | Resubmit after revision. |
| `GET` | `/provider-task/deadline-status` | Provider dashboard | Deadline status overview. |
| `GET` | `/provider-task/match-history` | Provider dashboard | Match history. |
| `GET` | `/provider/dashboard/summary` | Provider dashboard | Summary cards. |
| `GET` | `/provider/dashboard/task-control` | Provider dashboard | Task control panel. |
| `GET` | `/provider/dashboard/activity` | Provider dashboard | Provider activity. |

Provider opportunities filters:

| Filter | Meaning |
| --- | --- |
| Country | Filter available tasks by task country. |
| Industry/company category | Filter by website/category where available. |
| Provider website | Only show tasks compatible with selected provider website. |
| Availability | Tasks already assigned to a provider should not show as available opportunities. |

## Direct Task Requests

| Method | Route | UI Section | Purpose |
| --- | --- | --- |
| `POST` | `/task-request` | Direct request | Create direct task request. |
| `GET` | `/task-request/sent` | Direct requests | Sent requests. |
| `GET` | `/task-request/received` | Direct requests | Received requests. |
| `GET` | `/task-request/:id` | Direct request detail | Detail. |
| `PATCH` | `/task-request/:id/accept` | Direct request action | Accept request. |
| `PATCH` | `/task-request/:id/reject` | Direct request action | Reject request. |
| `PATCH` | `/task-request/:id/cancel` | Direct request action | Cancel request. |

## Disputes

| Method | Route | UI Section | Purpose |
| --- | --- | --- |
| `POST` | `/tasks/:taskId/disputes` | Task detail | Create dispute for task. |
| `GET` | `/disputes` | Dispute list | User/admin dispute list depending auth. |

If `SELF_SERVICE_DISPUTE_CENTER=false`, frontend should hide dispute creation UI.

## Messaging

| Method | Route | UI Section | Purpose |
| --- | --- | --- |
| `GET` | `/messaging` | Inbox | Conversation overview. |
| `GET` | `/messaging/chat/:recipientId` | Chat | Chat with one user. |
| `POST` | `/messaging/send` | Chat | Send message. |
| `DELETE` | `/messaging/delete/:messageId` | Chat | Delete own message where allowed. |
| `POST` | `/messaging/messages/:messageId/report` | Chat/report | Report message. |

If `INTERNAL_ENTITY_MESSAGING=false`, frontend should hide/disable messaging UI.

## Rewards And Badges

| Method | Route | UI Section | Purpose |
| --- | --- | --- |
| `GET` | `/rewards/me` | Rewards dashboard | Rewards overview. |
| `GET` | `/rewards/me/profile` | Rewards profile | User reward profile. |
| `GET` | `/rewards/me/badges` | Rewards badges | User badge list. |
| `GET` | `/rewards/me/additional-rewards` | Rewards benefits | Additional rewards. |
| `GET` | `/rewards/me/ledger` | Reward ledger | User reward ledger. |

Reward notifications are visible through `/notifications`.

## Public Community Showcase

| Method | Route | UI Section | Purpose |
| --- | --- | --- |
| `GET` | `/community/showcase/sections` | Community showcase | Section data. |
| `GET` | `/community/showcase` | Community showcase | Showcase entries. |
| `GET` | `/community/members/:slug` | Public member profile | Member detail. |
| `GET` | `/community/websites/:slug` | Public website profile | Website detail. |

## Blog, Legal Docs, Contact, Company

| Method | Route | UI Section | Purpose |
| --- | --- | --- |
| `GET` | `/blog` | Blog list | Public blog list. |
| `GET` | `/blog/:id` | Blog detail | Public blog detail. |
| `POST` | `/blog` | Blog create | Create blog if user/admin allowed. |
| `POST` | `/blog/markdown` | Blog create | Create markdown blog if allowed. |
| `GET` | `/legal-docs` | Legal pages | List legal docs. |
| `GET` | `/legal-docs/me` | Legal acceptance | Current user's acceptance status. |
| `POST` | `/legal-docs/types/:type/accept` | Legal acceptance | Accept legal doc type. |
| `GET` | `/legal-docs/documents/:id` | Legal detail | Legal document detail. |
| `POST` | `/contact` | Contact page | Submit contact enquiry. |
| `GET` | `/company` | Company page | Company list/info. |
| `GET` | `/company/:id` | Company page | Company detail. |
| `POST` | `/publisher` | Publisher profile | Create publisher profile. |
| `GET` | `/publisher` | Publisher profile | Get/list publisher profile. |
| `GET` | `/publisher/:userId` | Publisher profile | Public publisher detail. |
| `PATCH` | `/publisher` | Publisher profile | Update publisher profile. |

## Uploads

| Method | Route | UI Section | Purpose |
| --- | --- | --- |
| `POST` | `/upload-s3/presign` | Upload forms | Get presigned upload URL. |
| `POST` | `/upload-s3/direct` | Upload forms | Upload directly through backend. |

Use S3 upload routes for profile images, website evidence, task proof documents, blog images, and other file uploads where the UI needs files.

## Public Taxonomy Lists

| Method | Route | UI Section | Purpose |
| --- | --- | --- |
| `GET` | `/website-category-keys` | Website/task forms | Category key options. |
| `GET` | `/website-marketplace-tags` | Website/task forms | Marketplace tag options. |
| `GET` | `/website-marketplace-tags/:id` | Website/task forms | One marketplace tag. |

## Frontend Implementation Prompt

Use this prompt when building the user frontend:

```text
Build the Backlyst user-facing frontend using docs/frontend-user-api-guide.md.
Use POST /auth/register -> POST /auth/verify-register-otp -> POST /auth/login for authentication.
Store the access token and send Authorization: Bearer <token> on protected requests.
Use /website and /website-verification routes for website onboarding and verification.
Use /user-subscription-plan/all and /user-subscription/checkout for subscription purchase.
Use /credits/me, /credits/master, /credits/websites/:websiteId/wallet, and /credits/statement for wallet UI.
Use /credits/purchased/buy and /credits/visibility/buy for Stripe credit purchases.
Use allocation routes before task creation when credits are still in master wallet.
Use /task-requester routes for requester task lifecycle.
Use /provider-task routes for provider opportunities and task delivery.
Use /notifications routes for notification drawer and unread count.
Use /credits/referrers/summary and /credits/referrers/progress for referral UI.
Use /rewards/me routes for badges/rewards UI.
Never call Stripe webhook routes from frontend.
Do not directly call /credits/tasks/deduct, /credits/tasks/refund, or /credits/tasks/reward-provider from normal UI unless explicitly building an internal tool.
```

