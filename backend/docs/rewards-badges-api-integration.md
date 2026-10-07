# Rewards & Badges API Integration
This document summarizes the frontend-ready Rewards & Badges APIs.
## User APIs
### GET /rewards/me
Purpose: load the full Rewards & Badges dashboard.
Returns:
- summary
- profile
- adges.earned
- adges.active
- adges.locked
- adges.inactive
- adges.kickstarter
- adges.hallOfFame
- ctiveBenefits
- dditionalRewards
- ecentLedger
- 
extAchievements
### GET /rewards/me/profile
Purpose: load the reward profile only.
### GET /rewards/me/badges
Purpose: load grouped badge data.
Optional query:
- status
- category
Returns grouped arrays plus filtered ll/items.
### GET /rewards/me/additional-rewards
Purpose: load additional reward definitions with user eligibility/active state.
### GET /rewards/me/ledger
Purpose: reward history.
Optional query:
- 	ype
- ewardType
- adgeDefinitionId
- dateFrom
- dateTo
- page
- limit
## Admin APIs
### GET /admin/rewards/overview
Purpose: top cards and recent activity for admin Rewards page.
Returns:
- summary
- ecentLedger
- ecentAuditLogs
- outboxHealth
### GET /admin/rewards/badges
Purpose: badge definition table.
Optional query:
- search
- category
- oleScope
- ewardType
- 	riggerType
- isActive
- page
- limit
### GET /admin/rewards/badges/:id
Purpose: badge definition detail/edit page.
### POST /admin/rewards/badges
Purpose: create badge definition.
### PATCH /admin/rewards/badges/:id
Purpose: update badge definition.
### DELETE /admin/rewards/badges/:id
Purpose: soft disable a badge definition.
### POST /admin/rewards/seed-defaults
Purpose: seed default badge definitions and additional rewards.
### GET /admin/rewards/users/:userId
Purpose: admin reward detail page for one user.
Returns:
- user
- profile
- adges
- enefits
- ecentLedger
- ecentAuditLogs
- vailableManualBadges
- vailableKickstarterBadges
- vailableHallOfFameBadges
- ssignmentSummary
- summary
### POST /admin/rewards/users/:userId/badges/assign
Purpose: assign manual/Kickstarter/Hall of Fame badge.
Returns:
- userBadge
- adgeDefinition
- ctiveBenefit
- uditLogId
- lreadyAssigned
### POST /admin/rewards/users/:userId/badges/revoke
Purpose: revoke badge.
Returns:
- userBadge
- adgeDefinition
- ffectedBenefit
- uditLogId
- lreadyRevoked
### GET /admin/rewards/ledger
Purpose: admin reward ledger.
Optional query:
- userId
- 	ype
- ewardType
- adgeDefinitionId
- dateFrom
- dateTo
- search
- page
- limit
### GET /admin/rewards/outbox/health
Purpose: reward outbox health cards.
Returns:
- pendingCount
- processingCount
- ailedCount
- processedCount
- staleProcessingCount
- oldestPendingAt
- lastProcessedAt
### GET /admin/rewards/outbox
Purpose: reward outbox table.
Optional query:
- status
- eventType
- userId
- 	askId
- dateFrom
- dateTo
- page
- limit
### GET /admin/rewards/audit-logs
Purpose: audit log list.
Optional query:
- ction
- ctorType
- ctorId
- 	argetUserId
- adgeDefinitionId
- ewardBenefitId
- ewardOutboxId
- status
- source
- dateFrom
- dateTo
- search
- page
- limit
### GET /admin/rewards/audit-logs/:id
Purpose: full audit log detail.
## Notes
- All dates are returned as ISO strings.
- Empty collections return [].
- Admin-only endpoints require admin auth.
- No wallet payout or task-credit payout happens through these APIs.
