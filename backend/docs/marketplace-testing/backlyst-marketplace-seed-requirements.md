# Backlyst Marketplace Seed Requirements

## Document identity

- Branch: `fix/prisma-migration-history`
- Base commit: `285028080233238c214cdc9231a292fda390ea1f`
- Source state: base commit plus uncommitted working-tree changes
- Workflow catalogue coverage: `77` workflows
- Distinct required seed scenarios: `67`
- Status: `SEED_SPECIFICATION_ONLY` — this document does not implement seed code.

## Safety and determinism

1. Use a dedicated disposable PostgreSQL database whose name contains `_test` or `e2e`.
2. Refuse destructive reset unless `NODE_ENV=test` and an explicit reset flag are set.
3. Apply Prisma migrations; do not use `prisma db push` as the test schema source.
4. Generate a single `runId` per test run and include it in emails, domains, task titles and correlation identifiers.
5. Use a frozen clock for cooldown, expiry, weekly, daily, impression and override-boundary scenarios.
6. Seed the minimum records required by each scenario. Do not share mutable scenario state across parallel tests.
7. Delete records in dependency order; never delete shared taxonomy/config rows without restoring them.
8. Hash test passwords with the same algorithm used by the application.
9. Do not log access tokens, password hashes or complete database URLs.

## Baseline reusable actors

| Fixture | Required state | Notes |
|---|---|---|
| `providerA` | Active verified `UserRole.USER`; verified visible website; active matching profile | Primary provider for opportunity and application tests |
| `providerB` | Same as providerA with a different root domain | Reciprocal and concurrency counterpart |
| `requesterA` | Active verified user; verified website; funded `UserCreditWallet` | Owns most test tasks |
| `requesterB` | Separate account/domain | Multi-requester and exposure tests |
| `admin` | Active verified `UserRole.ADMIN` | Admin routes and override/audit ownership |
| `disabledUser` | `SUSPENDED`, `BANNED`, `DELETED`, or `isDeleted=true` depending test | Keep each failure cause isolated |

## Required singleton configuration

- `MarketplaceScoringConfig` must exist and be restored after every mutating test.
- `MarketplaceModeConfig` must exist when mode-dependent matching is tested.
- `WebsiteVerificationConfig` must exist for meta-tag verification tests.
- Tests that change cooldowns, caps, thresholds or weights must snapshot and restore prior values.

## Seed catalogue

### SEED-ACTOR-ADMIN

- **Category:** `ACTOR`
- **Purpose:** Verified active administrator account
- **Used by workflows:** `WF-003; WF-005; WF-055; WF-056`
- **Required records/resources:** User
- **Required starting state:** role=ADMIN; status=ACTIVE; isVerified=true; isDeleted=false; password hash set
- **Implementation notes:** Create before admin-owned overrides, resolutions, and action logs.
- **Cleanup/restore:** Delete dependent admin records first, then User.

### SEED-ACTOR-AUTHENTICATED

- **Category:** `ACTOR`
- **Purpose:** Generic authenticated actor for logout/session tests
- **Used by workflows:** `WF-004`
- **Required records/resources:** User, Session
- **Required starting state:** status=ACTIVE; isVerified=true; valid non-expired session/JWT
- **Implementation notes:** Can reuse providerA or requesterA when isolation is preserved.
- **Cleanup/restore:** Delete Session, then User only when scenario owns the actor.

### SEED-ACTOR-PROVIDER-A

- **Category:** `ACTOR`
- **Purpose:** Primary provider actor
- **Used by workflows:** `WF-001`
- **Required records/resources:** User, Website, WebsiteMatchingProfile
- **Required starting state:** User status=ACTIVE; verified; owned Website verified and visible; matching profile marketplaceStatus=ACTIVE; isSuppressed=false
- **Implementation notes:** Use deterministic email/domain and a known password.
- **Cleanup/restore:** Delete impressions/applications/interactions/profile/website, then user.

### SEED-ACTOR-REQUESTER-A

- **Category:** `ACTOR`
- **Purpose:** Primary requester actor
- **Used by workflows:** `WF-002; WF-018`
- **Required records/resources:** User, Website, WebsiteMatchingProfile, UserCreditWallet
- **Required starting state:** User status=ACTIVE; verified; owned verified Website; sufficient task credits
- **Implementation notes:** Requester and provider are both UserRole.USER; business role is derived from workflow/ownership.
- **Cleanup/restore:** Delete tasks and credit logs before wallet/website/user.

### SEED-ACTOR-USER

- **Category:** `ACTOR`
- **Purpose:** Generic active normal user
- **Used by workflows:** `WF-008`
- **Required records/resources:** User
- **Required starting state:** role=USER; status=ACTIVE; isVerified=true; isDeleted=false
- **Implementation notes:** Use for website-registration flows before provider/requester state exists.
- **Cleanup/restore:** Delete owned records, then User.

### SEED-CONCURRENT-PAIR-RACE

- **Category:** `CONCURRENCY`
- **Purpose:** Normalized pair candidates for simultaneous requests
- **Used by workflows:** `WF-076`
- **Required records/resources:** Provider/requester actors, websites, open tasks
- **Required starting state:** Multiple API contexts; same pair, reverse pair and unrelated control pairs; no prior blocking state unless scenario requires
- **Implementation notes:** Use distinct task IDs and idempotency identities.
- **Cleanup/restore:** Delete race-created applications/interactions/events/tasks.

### SEED-DEADLINE-REQUEST-PENDING

- **Category:** `TASK_DEADLINE`
- **Purpose:** Pending provider deadline extension
- **Used by workflows:** `WF-043`
- **Required records/resources:** PlacementTask, TaskDeadlineExtension
- **Required starting state:** extension status=PENDING; requestedById=provider; respondedById=null; newDeadline after previousDeadline
- **Implementation notes:** Requester owns the task.
- **Cleanup/restore:** Delete extension row, then task.

### SEED-DISPUTE-OPEN

- **Category:** `DISPUTE`
- **Purpose:** Open dispute awaiting admin resolution
- **Used by workflows:** `WF-054`
- **Required records/resources:** MarketplaceDispute/Dispute model, PlacementTask, participants
- **Required starting state:** status=OPEN; reason/evidence set; resolvedAt=null
- **Implementation notes:** Use actual dispute model name from generated Prisma client in implementation.
- **Cleanup/restore:** Delete credit adjustment/risk/dispute/task dependents.

### SEED-DOMAIN-PAIR-HISTORY

- **Category:** `DOMAIN_RULE`
- **Purpose:** Inspectable normalized domain relationship history
- **Used by workflows:** `WF-060`
- **Required records/resources:** DomainInteraction, DomainRelationshipEvent
- **Required starting state:** Canonical root domains; orderedPairKey and normalizedPairKey consistent; mixed statuses/timestamps
- **Implementation notes:** Include A→B and optional B→A events.
- **Cleanup/restore:** Delete relationship events and interactions.

### SEED-GOOGLE-OAUTH

- **Category:** `EXTERNAL_AUTH`
- **Purpose:** Google OAuth test identity and callback configuration
- **Used by workflows:** `WF-007`
- **Required records/resources:** User/AuthProviderAccount after successful callback
- **Required starting state:** Dedicated non-production OAuth client; test redirect URI; unique providerId
- **Implementation notes:** Environment-dependent; do not fake as verified browser coverage.
- **Cleanup/restore:** Delete AuthProviderAccount and created User.

### SEED-IMPRESSION-THRESHOLD

- **Category:** `SCORING`
- **Purpose:** Opportunity impressions around penalty threshold
- **Used by workflows:** `WF-032`
- **Required records/resources:** OpportunityImpression[], tasks, provider/requester websites
- **Required starting state:** Candidates have 0, threshold-1, threshold, threshold+1 impressions within lookback window
- **Implementation notes:** shownAt controlled; include expired impressions outside lookback.
- **Cleanup/restore:** Delete impressions/tasks.

### SEED-MAINTENANCE-DUE-RECORDS

- **Category:** `BACKGROUND_JOB`
- **Purpose:** Records due for maintenance actions
- **Used by workflows:** `WF-077`
- **Required records/resources:** Expired overrides, old impressions/events, decaying boosts, overdue tasks, quality profiles
- **Required starting state:** Timestamps older/newer than each configured cutoff
- **Implementation notes:** Use direct worker invocation for deterministic tests plus one queue-to-worker test.
- **Cleanup/restore:** Delete due/control rows; restore config and clock.

### SEED-MANUAL-MATCH-CANDIDATE

- **Category:** `ADMIN_MATCH`
- **Purpose:** Pending manual-match queue entry
- **Used by workflows:** `WF-061`
- **Required records/resources:** ManualMatchQueue, PlacementTask, provider/requester Websites
- **Required starting state:** status=PENDING; createdById=admin; task and both websites valid
- **Implementation notes:** No duplicate active queue entry if service prohibits it.
- **Cleanup/restore:** Delete queue entry, then task/websites.

### SEED-MARKETPLACE-ANALYTICS

- **Category:** `ANALYTICS`
- **Purpose:** Marketplace records across analytics windows
- **Used by workflows:** `WF-066`
- **Required records/resources:** Tasks, applications, impressions, profiles, interactions, flags, optional audit logs
- **Required starting state:** Controlled timestamps and statuses for non-empty dashboard/liquidity results
- **Implementation notes:** Include empty-window control period.
- **Cleanup/restore:** Delete all analytics source records.

### SEED-MARKETPLACE-HEALTH

- **Category:** `ENVIRONMENT`
- **Purpose:** Healthy and degraded dependency states
- **Used by workflows:** `WF-067`
- **Required records/resources:** Database/config; Redis/worker as environment resources
- **Required starting state:** Healthy DB migration state and active config; optionally isolated unavailable Redis scenario
- **Implementation notes:** Do not simulate production outage destructively.
- **Cleanup/restore:** Restore services/config; no persistent business records required.

### SEED-MARKETPLACE-LOW-SUPPLY

- **Category:** `MATCHING`
- **Purpose:** Candidate pool below strict minimum
- **Used by workflows:** `WF-028`
- **Required records/resources:** Provider and small task pool
- **Required starting state:** Strict level returns fewer than MarketplaceScoringConfig.minViableMatches; later relaxation levels have candidates
- **Implementation notes:** Config maxRelaxationLevel must allow tested levels.
- **Cleanup/restore:** Restore singleton config; delete tasks/profiles.

### SEED-MARKETPLACE-NO-VALID-CANDIDATES

- **Category:** `MATCHING`
- **Purpose:** All candidates fail hard filters
- **Used by workflows:** `WF-029`
- **Required records/resources:** Provider and candidate tasks
- **Required starting state:** Candidates are own task, duplicate application, inactive/unverified/suppressed/deleted/terminal as appropriate
- **Implementation notes:** Keep at least one candidate per exclusion reason.
- **Cleanup/restore:** Delete all scenario records.

### SEED-MARKETPLACE-NORMAL-SUPPLY

- **Category:** `MATCHING`
- **Purpose:** Sufficient valid candidate pool
- **Used by workflows:** `WF-023`
- **Required records/resources:** Provider website/profile; requester tasks/websites/profiles; taxonomy
- **Required starting state:** At least minViableMatches valid candidates; varied scores; no hard restrictions
- **Implementation notes:** Use deterministic createdAt and IDs for stable ordering.
- **Cleanup/restore:** Delete impressions/applications/tasks/taxonomy links/profiles.

### SEED-MARKETPLACE-PAGINATED

- **Category:** `MATCHING`
- **Purpose:** More valid opportunities than one page
- **Used by workflows:** `WF-030`
- **Required records/resources:** Provider; 2+ pages of PlacementTask and requester websites
- **Required starting state:** All candidates eligible; unique deterministic score/tie-break fields
- **Implementation notes:** Record baseline order before impressions if needed.
- **Cleanup/restore:** Delete impressions and tasks.

### SEED-MATCH-BROAD-CATEGORY

- **Category:** `MATCHING`
- **Purpose:** Broad fallback candidate
- **Used by workflows:** `WF-027`
- **Required records/resources:** Category hierarchy/relations, task and website joins
- **Required starting state:** No exact or related candidate sufficient; broad-compatible candidate remains valid
- **Implementation notes:** Document actual relationship type used by service during implementation.
- **Cleanup/restore:** Delete taxonomy joins/relations.

### SEED-MATCH-EXACT-CATEGORY

- **Category:** `MATCHING`
- **Purpose:** Exact canonical category match
- **Used by workflows:** `WF-025`
- **Required records/resources:** Marketplace category records and website/task category joins
- **Required starting state:** Provider primary category equals task/requester category; no stronger exclusion
- **Implementation notes:** Use normalized taxonomy relations, not removed legacy arrays.
- **Cleanup/restore:** Delete join rows and scenario records.

### SEED-MATCH-HARD-FILTER-MATRIX

- **Category:** `MATCHING`
- **Purpose:** One candidate per hard eligibility rule
- **Used by workflows:** `WF-024`
- **Required records/resources:** Provider, multiple requesters/websites/tasks, application/history records
- **Required starting state:** Include valid control plus own, applied, unverified, hidden, suppressed, inactive, terminal and malformed relationship candidates
- **Implementation notes:** Do not combine multiple failure causes in one candidate.
- **Cleanup/restore:** Delete all candidate-specific records.

### SEED-MATCH-RELATED-CATEGORY

- **Category:** `MATCHING`
- **Purpose:** Related-category candidate
- **Used by workflows:** `WF-026`
- **Required records/resources:** Category records, relation record, website/task joins
- **Required starting state:** No sufficient exact pool; explicit active category relation connects provider and task categories
- **Implementation notes:** Retain a broad/unrelated control candidate.
- **Cleanup/restore:** Delete relation/join rows.

### SEED-NICHE-CAP-SCOPE

- **Category:** `NICHE`
- **Purpose:** Active and inactive niche cap configurations
- **Used by workflows:** `WF-058`
- **Required records/resources:** NicheDistributionCap[]
- **Required starting state:** Primary/secondary scopes; category keys; maxPerWindow/windowDays boundaries
- **Implementation notes:** Include one inactive cap and one duplicate-like scope test target.
- **Cleanup/restore:** Delete cap rows.

### SEED-NICHE-DISTRIBUTION-BOUNDARY

- **Category:** `NICHE`
- **Purpose:** Interaction history below, at and above niche cap
- **Used by workflows:** `WF-073`
- **Required records/resources:** NicheDistributionCap, DomainInteraction/DomainRelationshipEvent[]
- **Required starting state:** Same category window counts: cap-1, cap, cap+1; primary and secondary category keys set
- **Implementation notes:** Freeze time within windowDays.
- **Cleanup/restore:** Delete events/interactions/cap.

### SEED-OVERRIDE-MATRIX

- **Category:** `OVERRIDE`
- **Purpose:** Active, expired, revoked and conflicting overrides
- **Used by workflows:** `WF-034`
- **Required records/resources:** MarketplaceOverride[], AdminActionLog, target entities
- **Required starting state:** Cover BOOST, SUPPRESS, FORCE_MATCH, SCORE_OVERRIDE and relevant status/time boundaries
- **Implementation notes:** reasonCode required; use activeFrom/activeUntil around frozen time.
- **Cleanup/restore:** Delete action logs and overrides; restore target profile.

### SEED-OVERRIDE-TARGET-WEBSITE

- **Category:** `OVERRIDE`
- **Purpose:** Website eligible for one admin override
- **Used by workflows:** `WF-057`
- **Required records/resources:** Admin, target Website/Profile
- **Required starting state:** No existing active conflicting override
- **Implementation notes:** Target can be website-, task-, or account-scoped depending DTO.
- **Cleanup/restore:** Delete override/admin log/profile/website.

### SEED-PAIR-COOLDOWN-ACTIVE

- **Category:** `DOMAIN_RULE`
- **Purpose:** Repeat-pair interaction within cooldown
- **Used by workflows:** `WF-069`
- **Required records/resources:** DomainInteraction, DomainRelationshipEvent, config
- **Required starting state:** A→B completed recently; repeatPairCooldownUntil in future or createdAt within repeatPairCooldownDays
- **Implementation notes:** Use normalized roots, not raw URL variants.
- **Cleanup/restore:** Delete events/interactions; restore config.

### SEED-PAIR-RECIPROCAL-ACTIVE

- **Category:** `DOMAIN_RULE`
- **Purpose:** Reverse pair within reciprocal cooldown
- **Used by workflows:** `WF-070`
- **Required records/resources:** DomainRelationshipEvent
- **Required starting state:** Existing A→B event; B→A attempt before reciprocalCooldownUntil/reciprocalCooldownDays
- **Implementation notes:** Keep ordered and unordered pair keys accurate.
- **Cleanup/restore:** Delete events.

### SEED-PATTERN-FLAGS

- **Category:** `PATTERN`
- **Purpose:** Open and resolved pattern flags
- **Used by workflows:** `WF-065`
- **Required records/resources:** PatternFlag[]
- **Required starting state:** Types CLUSTER_CONCENTRATION, RECIPROCAL_RING, REPEAT_BURST; LOW/MEDIUM/HIGH; OPEN and RESOLVED statuses
- **Implementation notes:** memberDomains include seeded website roots.
- **Cleanup/restore:** Delete flags.

### SEED-PATTERN-MEDIUM-HIGH

- **Category:** `PATTERN`
- **Purpose:** Comparable MEDIUM and HIGH open pattern flags
- **Used by workflows:** `WF-074`
- **Required records/resources:** PatternFlag[], websites/profiles
- **Required starting state:** Same pattern type/window with severity MEDIUM vs HIGH and unresolved state
- **Implementation notes:** Associate through memberDomains because PatternFlag has no website FK.
- **Cleanup/restore:** Delete flags/profiles/websites.

### SEED-REQUESTER-MULTI-STATUS-TASKS

- **Category:** `TASK_SETUP`
- **Purpose:** Requester owns tasks across lifecycle states
- **Used by workflows:** `WF-020`
- **Required records/resources:** User, Website, PlacementTask[]
- **Required starting state:** At least DRAFT, OPEN, SELECTED, IN_PROGRESS, SUBMITTED, COMPLETED, CANCELLED, EXPIRED tasks
- **Implementation notes:** Each task uses valid enum values and required credit fields.
- **Cleanup/restore:** Delete flows/applications/deadlines/tasks.

### SEED-REQUESTER-WEBSITE-CREDITS

- **Category:** `TASK_SETUP`
- **Purpose:** Requester website and funded wallet
- **Used by workflows:** `WF-019`
- **Required records/resources:** User, UserCreditWallet, Website, WebsiteMatchingProfile
- **Required starting state:** Requester active; website verified; profile ACTIVE; wallet has sufficient selected CreditWalletType balance
- **Implementation notes:** Keep credit balances high enough to avoid unrelated insufficiency.
- **Cleanup/restore:** Delete task/credit logs, then wallets/profile/website/user.

### SEED-SAME-DAY-BOUNDARY

- **Category:** `DOMAIN_RULE`
- **Purpose:** Daily interaction history around configured cap
- **Used by workflows:** `WF-072`
- **Required records/resources:** WebsiteMatchingProfile, DomainInteraction/Event[]
- **Required starting state:** Current-day count at allowed boundary; events just before/after day boundary
- **Implementation notes:** Freeze application timezone and database timestamps.
- **Cleanup/restore:** Delete events/interactions.

### SEED-SCORING-CONTROLLED-CANDIDATES

- **Category:** `SCORING`
- **Purpose:** Candidates with controlled score components
- **Used by workflows:** `WF-031`
- **Required records/resources:** WebsiteMatchingProfile[], tasks, config
- **Required starting state:** Set visibility/opportunity/reputation/boost/internalPriority/risk/behaviour/diversity/quality values explicitly
- **Implementation notes:** Use one-variable-at-a-time pairs and deterministic ties.
- **Cleanup/restore:** Restore singleton config and delete candidates.

### SEED-TASK-ACTIVE-SELECTED

- **Category:** `TASK_DEADLINE`
- **Purpose:** Active selected task
- **Used by workflows:** `WF-044`
- **Required records/resources:** PlacementTask
- **Required starting state:** selected provider fields set; lifecycleStatus=SELECTED/ASSIGNED/IN_PROGRESS; deliveryDeadline future
- **Implementation notes:** No terminal state.
- **Cleanup/restore:** Delete deadline extensions and task.

### SEED-TASK-ALREADY-APPLIED

- **Category:** `APPLICATION`
- **Purpose:** Task with existing application from provider
- **Used by workflows:** `WF-037`
- **Required records/resources:** PlacementTask, PlacementApplication
- **Required starting state:** task OPEN; application unique(providerId, placementTaskId) already exists with status=APPLIED
- **Implementation notes:** ProviderWebsiteId must belong to provider.
- **Cleanup/restore:** Delete application, then task.

### SEED-TASK-DEADLINE-MATRIX

- **Category:** `EXPIRY`
- **Purpose:** Tasks around deadline and expiry boundaries
- **Used by workflows:** `WF-052`
- **Required records/resources:** PlacementTask[]
- **Required starting state:** One before deadline, one at boundary, one overdue, one already EXPIRED; controlled timestamps
- **Implementation notes:** Freeze test clock; avoid wall-clock sleeps.
- **Cleanup/restore:** Delete task flows and tasks.

### SEED-TASK-DISPUTABLE

- **Category:** `DISPUTE`
- **Purpose:** Task eligible for dispute opening
- **Used by workflows:** `WF-053`
- **Required records/resources:** PlacementTask, requester/provider websites
- **Required starting state:** participants valid; lifecycle state accepted by DisputeService; no existing open duplicate dispute
- **Implementation notes:** Provide valid OpenDisputeDto evidence.
- **Cleanup/restore:** Delete dispute/risk/task records.

### SEED-TASK-IN-PROGRESS

- **Category:** `COMPLETION`
- **Purpose:** Provider is actively executing task
- **Used by workflows:** `WF-045`
- **Required records/resources:** PlacementTask, TaskFlow
- **Required starting state:** lifecycleStatus=IN_PROGRESS; selected provider/website set; submissionStatus=NOT_SUBMITTED
- **Implementation notes:** deliveryDeadline should permit submission.
- **Cleanup/restore:** Delete proof files externally when applicable; delete flows/task.

### SEED-TASK-IN-PROGRESS-DEADLINE

- **Category:** `TASK_DEADLINE`
- **Purpose:** In-progress task eligible for extension request
- **Used by workflows:** `WF-042`
- **Required records/resources:** PlacementTask
- **Required starting state:** IN_PROGRESS; deliveryDeadline future; extension counters below limits
- **Implementation notes:** Selected provider owns assignedProviderWebsiteId.
- **Cleanup/restore:** Delete extension rows and task.

### SEED-TASK-LIFECYCLE-MATRIX

- **Category:** `ADMIN_TASK`
- **Purpose:** Representative task for every admin-supported lifecycle action
- **Used by workflows:** `WF-068`
- **Required records/resources:** PlacementTask[]
- **Required starting state:** Tasks cover states accepted/rejected by admin action DTO/service
- **Implementation notes:** Include frozen and disputed states.
- **Cleanup/restore:** Delete admin logs/flows/tasks.

### SEED-TASK-OPEN-ELIGIBLE

- **Category:** `TASK`
- **Purpose:** Open task eligible for application
- **Used by workflows:** `WF-036`
- **Required records/resources:** Requester/provider, websites, PlacementTask
- **Required starting state:** OPEN; provider does not own requester task; no duplicate application; website verified and active; limits not reached
- **Implementation notes:** Ensure requiredDomainRating/country/language do not accidentally exclude.
- **Cleanup/restore:** Delete application/interactions/task.

### SEED-TASK-OPEN-NO-SELECTION

- **Category:** `TASK`
- **Purpose:** Open task with no selected provider
- **Used by workflows:** `WF-022; WF-050`
- **Required records/resources:** Requester, requester Website, PlacementTask
- **Required starting state:** lifecycleStatus=OPEN or WAITING_FOR_APPLICANTS; selectedProviderId=null; selectedApplicationId=null; assignedProviderWebsiteId=null
- **Implementation notes:** publishedAt set; future deadline where relevant.
- **Cleanup/restore:** Delete applications/flows, then task.

### SEED-TASK-OPEN-VISIBLE

- **Category:** `TASK`
- **Purpose:** Open opportunity visible to provider
- **Used by workflows:** `WF-035`
- **Required records/resources:** Requester/provider actors and websites, PlacementTask
- **Required starting state:** task OPEN; requester website verified/visible; provider eligible; no hard-filter history
- **Implementation notes:** Category/tag compatibility should be explicit.
- **Cleanup/restore:** Delete impressions/applications/task.

### SEED-TASK-OWNED-BY-PROVIDER-ACTOR

- **Category:** `APPLICATION`
- **Purpose:** Actor is both requester owner and attempted provider
- **Used by workflows:** `WF-038`
- **Required records/resources:** User, Website, PlacementTask
- **Required starting state:** task.requesterId equals applying actor; task OPEN
- **Implementation notes:** Use separate owned websites only if service permits; same account remains the key condition.
- **Cleanup/restore:** Delete task and owned websites.

### SEED-TASK-PROVIDER-SELECTED

- **Category:** `ASSIGNMENT`
- **Purpose:** Selected provider can start work
- **Used by workflows:** `WF-041`
- **Required records/resources:** PlacementTask, PlacementApplication, Users/Websites
- **Required starting state:** lifecycleStatus=SELECTED or ASSIGNED as service expects; selectedProviderId, selectedApplicationId, assignedProviderWebsiteId set
- **Implementation notes:** assignedAt set where required.
- **Cleanup/restore:** Delete flows/application/task.

### SEED-TASK-REQUESTER-OWNED

- **Category:** `TASK`
- **Purpose:** Single task owned by requester
- **Used by workflows:** `WF-021`
- **Required records/resources:** Requester User/Website, PlacementTask
- **Required starting state:** requesterId and requesterWebsiteId match actor; task not deleted; chosen lifecycleStatus valid for read route
- **Implementation notes:** No provider assignment unless needed.
- **Cleanup/restore:** Delete task dependents, then task.

### SEED-TASK-REVISION-REQUESTED

- **Category:** `COMPLETION`
- **Purpose:** Task awaiting provider resubmission
- **Used by workflows:** `WF-047`
- **Required records/resources:** PlacementTask, TaskFlow
- **Required starting state:** lifecycleStatus=REVISION_REQUESTED; submissionStatus=REVISION_REQUESTED; selected provider set
- **Implementation notes:** Revision reason should be represented in flow/event metadata if service expects it.
- **Cleanup/restore:** Delete flows/task.

### SEED-TASK-SELECTED

- **Category:** `CANCELLATION`
- **Purpose:** Task after provider selection
- **Used by workflows:** `WF-051`
- **Required records/resources:** PlacementTask, PlacementApplication
- **Required starting state:** selected provider/application fields set; cancellationRequestStatus=NONE
- **Implementation notes:** Use non-terminal state.
- **Cleanup/restore:** Delete cancellation flow/application/task.

### SEED-TASK-SUBMITTED

- **Category:** `COMPLETION`
- **Purpose:** Submitted task awaiting requester decision
- **Used by workflows:** `WF-046`
- **Required records/resources:** PlacementTask, TaskFlow
- **Required starting state:** lifecycleStatus=SUBMITTED; submissionStatus=SUBMITTED; submittedAt set; provider proof documents present as required
- **Implementation notes:** Requester and selected provider relationships valid.
- **Cleanup/restore:** Delete quality/dispute/flow records, then task.

### SEED-TASK-SUBMITTED-APPROVABLE

- **Category:** `COMPLETION`
- **Purpose:** Clean submitted task eligible for approval
- **Used by workflows:** `WF-048`
- **Required records/resources:** PlacementTask, application, users/websites, optional QualityRubric
- **Required starting state:** SUBMITTED; no open dispute/freeze/cancellation; requester owns task
- **Implementation notes:** Wallet and reward state should allow completion side effects.
- **Cleanup/restore:** Delete quality/credit/interaction/flow/application/task records.

### SEED-TASK-SUBMITTED-REJECTABLE

- **Category:** `COMPLETION`
- **Purpose:** Submitted task eligible for rejection/dispute path
- **Used by workflows:** `WF-049`
- **Required records/resources:** PlacementTask and participants
- **Required starting state:** SUBMITTED; rejection reason/evidence can be supplied; no terminal state
- **Implementation notes:** Prepare risk/quality profile for observable penalty effects if tested.
- **Cleanup/restore:** Delete dispute/risk/quality/task dependents.

### SEED-TASK-WITH-APPLICANTS

- **Category:** `ASSIGNMENT`
- **Purpose:** Requester task with multiple applicants
- **Used by workflows:** `WF-039`
- **Required records/resources:** PlacementTask, provider Users/Websites, PlacementApplication[]
- **Required starting state:** task OPEN/APPLIED; at least two valid applications; requester owns task
- **Implementation notes:** Vary trust/quality values for applicant display.
- **Cleanup/restore:** Delete applications, then task/providers if scenario-owned.

### SEED-TASK-WITH-ELIGIBLE-APPLICANT

- **Category:** `ASSIGNMENT`
- **Purpose:** Task ready for provider selection
- **Used by workflows:** `WF-040`
- **Required records/resources:** PlacementTask, PlacementApplication, provider Website
- **Required starting state:** application belongs to task; provider and website active/verified; task in selectable state
- **Implementation notes:** No existing selectedApplicationId.
- **Cleanup/restore:** Delete flows/application/task.

### SEED-TAXONOMY-BASE

- **Category:** `TAXONOMY`
- **Purpose:** Canonical categories, tags and relations
- **Used by workflows:** `WF-059`
- **Required records/resources:** Marketplace category/tag/relation models and joins
- **Required starting state:** Primary/secondary categories; active tags; one related-category relation; deterministic keys
- **Implementation notes:** Use actual normalized model names from Prisma schema during seed implementation.
- **Cleanup/restore:** Delete task/website joins, relations, tags, categories.

### SEED-UNUSED-EMAIL

- **Category:** `IDENTITY`
- **Purpose:** Email not present in User table
- **Used by workflows:** `WF-006`
- **Required records/resources:** None initially
- **Required starting state:** Unique run-scoped email; no matching User row
- **Implementation notes:** Used to prove public registration behavior/conflict.
- **Cleanup/restore:** Delete any User created by the tested route.

### SEED-VERIFICATION-FAILED

- **Category:** `VERIFICATION`
- **Purpose:** Failed automatic verification eligible for manual review
- **Used by workflows:** `WF-014`
- **Required records/resources:** User, Website, WebsiteVerification
- **Required starting state:** Website verificationStatus=VERIFICATION_FAILED; verification row status=VERIFICATION_FAILED; errorMessage populated
- **Implementation notes:** Use deterministic failed DNS/meta/screenshot evidence.
- **Cleanup/restore:** Delete verification row and website.

### SEED-VERIFICATION-PENDING

- **Category:** `VERIFICATION`
- **Purpose:** Pending website verification request
- **Used by workflows:** `WF-015; WF-016`
- **Required records/resources:** User, Website, WebsiteVerification
- **Required starting state:** Website verificationStatus=PENDING; verification row status=PENDING or REQUESTED_FOR_MANUAL_REVIEW; requestedByUserId set
- **Implementation notes:** Select verification type matching the route under test.
- **Cleanup/restore:** Delete WebsiteVerification, then Website when scenario-owned.

### SEED-WEBSITE-OWNED

- **Category:** `WEBSITE`
- **Purpose:** Active website owned by authenticated actor
- **Used by workflows:** `WF-009; WF-010`
- **Required records/resources:** User, Website, WebsiteMatchingProfile
- **Required starting state:** Website.authorId=actor; isDeleted=false; verificationStatus=VERIFIED; marketplaceVisibilityStatus=VISIBLE; profile ACTIVE
- **Implementation notes:** Use a unique canonical rootDomain.
- **Cleanup/restore:** Delete dependent marketplace records, profile, website.

### SEED-WEBSITE-QUALITY-DEGRADED

- **Category:** `QUALITY`
- **Purpose:** Low quality website eligible for admin reset
- **Used by workflows:** `WF-064`
- **Required records/resources:** WebsiteMatchingProfile, quality history
- **Required starting state:** qualityScore below limited/restricted threshold; marketplace status non-active as produced by implementation
- **Implementation notes:** Capture previous values for reset assertions.
- **Cleanup/restore:** Delete logs/history/profile.

### SEED-WEBSITE-QUALITY-HISTORY

- **Category:** `QUALITY`
- **Purpose:** Website with interaction and quality history
- **Used by workflows:** `WF-063`
- **Required records/resources:** WebsiteMatchingProfile, QualityScoreHistory/QualityStatusLog, task outcomes
- **Required starting state:** At least qualityMinInteractionsForStatus; mix success/failure/rating/activity/diversity inputs
- **Implementation notes:** Timestamps controlled for recomputation.
- **Cleanup/restore:** Delete history/logs/profile.

### SEED-WEBSITE-QUALITY-VARIANTS

- **Category:** `QUALITY`
- **Purpose:** Active, low-priority, limited, under-review and restricted profiles
- **Used by workflows:** `WF-033`
- **Required records/resources:** WebsiteMatchingProfile[]
- **Required starting state:** Explicit qualityScore values around config thresholds and matching marketplaceStatus
- **Implementation notes:** Include premiumQualityAccessEligible boundaries.
- **Cleanup/restore:** Delete profiles/websites.

### SEED-WEBSITE-UNVERIFIED

- **Category:** `WEBSITE`
- **Purpose:** Owned website awaiting verification
- **Used by workflows:** `WF-011; WF-012; WF-013`
- **Required records/resources:** User, Website
- **Required starting state:** verificationStatus=PENDING; verifiedAt=null; verifiedMethod=null; isDeleted=false
- **Implementation notes:** No active verification row unless scenario explicitly creates one.
- **Cleanup/restore:** Delete WebsiteVerification rows, then Website.

### SEED-WEBSITE-VERIFIED

- **Category:** `WEBSITE`
- **Purpose:** Verified marketplace-capable website
- **Used by workflows:** `WF-017; WF-062`
- **Required records/resources:** User, Website, WebsiteMatchingProfile
- **Required starting state:** verificationStatus=VERIFIED; verifiedAt set; marketplaceVisibilityStatus=VISIBLE; profile marketplaceStatus=ACTIVE
- **Implementation notes:** Add canonical categories/tags where matching requires them.
- **Cleanup/restore:** Delete profile/category/tag relations, then Website.

### SEED-WEEKLY-ONE-SLOT-LEFT

- **Category:** `CONCURRENCY`
- **Purpose:** Exactly one weekly interaction slot remains
- **Used by workflows:** `WF-075`
- **Required records/resources:** Provider profile and completed interactions/events
- **Required starting state:** Current count=weeklyInteractionLimit-1; ten independent eligible targets prepared
- **Implementation notes:** Each concurrent request must otherwise be valid.
- **Cleanup/restore:** Delete all race outcomes and baseline histories.

### SEED-WEEKLY-QUOTA-BOUNDARY

- **Category:** `DOMAIN_RULE`
- **Purpose:** Weekly interaction usage below, at and above limit
- **Used by workflows:** `WF-071`
- **Required records/resources:** WebsiteMatchingProfile, DomainInteraction/Event[]
- **Required starting state:** Profile weeklyInteractionLimit set; histories create limit-1 and limit states within same week
- **Implementation notes:** Freeze week boundary and timezone.
- **Cleanup/restore:** Delete histories; restore profile limit.

## Seed dependency order

1. Singleton configs and taxonomy.
2. Users and authentication/session records.
3. User credit wallets.
4. Websites and verification records.
5. Website matching profiles and taxonomy joins.
6. Placement tasks.
7. Applications, assignments, task flows and deadline extensions.
8. Impressions, interactions, relationship events, flags and overrides.
9. Disputes, quality/risk histories, admin logs and maintenance-due records.

## Validation requirements

- Every `required_seed` value in the workflow catalogue must have exactly one heading in this document.
- Every seed must reference at least one workflow.
- Scenario creation must be idempotent or isolated by `runId`.
- Seed validation must assert ownership, verification, lifecycle, profile status and time boundaries before a test begins.
- A failed seed invariant must stop the test suite before browser/API actions run.
- Concurrency scenarios must use independently valid requests and real PostgreSQL transactions.

## Known source limitations

- This catalogue defines seed requirements from the uploaded Prisma schema, routes and regenerated workflows; it does not prove that current `test/marketplace-seed.ts` creates them.
- Existing seed code covers only a requester, one active provider and one restricted provider. It is insufficient for the 67-scenario catalogue.
- Some internal rule scenarios require direct Prisma setup because no public API creates historical interactions, pattern flags or impression counts.
- Google OAuth, external MOZ calls, Redis workers and file-upload storage remain environment-dependent.
