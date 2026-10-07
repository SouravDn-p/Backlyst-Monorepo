# BACKLYST MARKETPLACE CONFIRMED REMEDIATION

## MC-003
- **Gap**: Validation is enforced at application and completion, but match generation lacks full validation.
- **Action**: Wire validation engine into the match generation flow (Opportunity API).

## MC-006
- **Gap**: Distribution engine exists but is not fully integrated into the matching/ranking flow.
- **Action**: Wire DistributionEngine into RankingService.rank().

## MC-007
- **Gap**: Niche distribution limits (40% / 60%) not found in validation engine or schema.
- **Action**: Implement niche limits in ValidationEngine and DomainPairStat.

## MC-008
- **Gap**: Velocity limits exist but same-day clustering prevention is missing.
- **Action**: Add same-day clustering check in ValidationEngine.validateVelocity().

## MC-009
- **Gap**: Pattern monitor exists but restriction actions (reduce priority, restrict new) are not triggered automatically.
- **Action**: Implement automatic penalization in PatternMonitorService and wire to BullMQ maintenance.

## MC-010
- **Gap**: Risk score calculation exists but visibility reduction threshold is not actively enforced.
- **Action**: Wire RiskEngine output to VisibilityControlService adjustments.

## MC-011
- **Gap**: Matching Engine Rules overriding final match assignment not found.
- **Action**: Implement final match assignment override in Opportunity API.

## MC-012
- **Gap**: Validation engine misses niche rules and pattern flags checks during validation.
- **Action**: Add niche rules and pattern flags to ValidationEngine.validate().

## MC-013
- **Gap**: Tier system defines limits but priority levels (low/medium/high) are not fully integrated into ranking.
- **Action**: Wire tier priority into RankingService.

## MC-016
- **Gap**: Override creation exists but overrides are not fully respected by ValidationEngine.
- **Action**: Read overrides in ValidationEngine.validate().

## MC-017
- **Gap**: Early-stage mode configuration missing.
- **Action**: Add early-stage mode toggle to MarketplaceScoringConfig and adjust limits accordingly.

## MC-018
- **Gap**: Scaling mode configuration missing.
- **Action**: Add scaling mode toggle to MarketplaceScoringConfig and adjust limits accordingly.

## MC-019
- **Gap**: Valid options are shown, but automatic guidance to valid matches is missing.
- **Action**: Implement guidance messaging in Opportunity API response.

## QC-004
- **Gap**: Visibility score adjusts ordering weight but frequency control is not enforced.
- **Action**: Enforce frequency control using OpportunityImpression logs.

## QC-005
- **Gap**: Matching logic handles ranking but distribution control (Step 4) and Tier Priority (Step 5) are not fully weighted.
- **Action**: Add tier and distribution factors to ScoringUtils.calculateFinalScore().

## QC-006
- **Gap**: Penalty system exists but escalation to Restricted/Suspended is not automatic.
- **Action**: Trigger automatic escalation in GraduatedPenaltyService based on repeated negative behavior.

## QC-007
- **Gap**: Low-pool mode is missing.
- **Action**: Implement low-pool mode in RankingService when available matches are below threshold.

## QC-008
- **Gap**: Multi-domain control (account level) missing.
- **Action**: Track interactions across all domains per user and apply visibility reductions.

## QC-009
- **Gap**: Override creation exists but some admin controls (enable low-pool mode) are missing.
- **Action**: Add missing admin controls to MarketplaceOverrideService.

## QC-010
- **Gap**: Fallback matches and specific UX messaging on empty results are not implemented in the API.
- **Action**: Return fallback matches and correct UX messages in Opportunity API.

## IP-003
- **Gap**: WebsiteMatchingProfile is used, but qualityRating validation (1-5) is not strict in the service.
- **Action**: Add strict qualityRating validation (1-5) in ScoringService.

## IP-006
- **Gap**: Candidate pool selection applies hard filters but relaxation levels are not fully integrated.
- **Action**: Wire MatchingRelaxationEngine into Candidate Pool Selection.

## IP-007
- **Gap**: Engine exists but is not used to stop when minViableMatches is reached.
- **Action**: Add loop in Opportunity API to relax until minViableMatches is reached.

## IP-008
- **Gap**: Compatibility score logic based on exact/related category and tag overlap is missing.
- **Action**: Implement Compatibility Score in ScoringUtils.

## IP-009
- **Gap**: Opportunity Score calculation based on applicant count, age, and exposure is missing.
- **Action**: Implement Opportunity Score in ScoringUtils.

## IP-010
- **Gap**: Visibility Score is used but not combined with contribution streak or active participation.
- **Action**: Include contribution streak in Visibility Score calculation.

## IP-012
- **Gap**: Boost service exists, but decay is not triggered automatically by BullMQ maintenance job.
- **Action**: Wire Boost decay into BullMQ MARKETPLACE_MAINTENANCE worker.

## IP-013
- **Gap**: Exposure Penalty based on OpportunityImpression logs is missing.
- **Action**: Implement Exposure Penalty in ScoringUtils using OpportunityImpression.

## IP-014
- **Gap**: Risk score is calculated but suppressed websites are not fully excluded in ranking.
- **Action**: Exclude suppressed websites in Candidate Pool Selection unless force-matched.

## IP-016
- **Gap**: Override API and Config API exist but do not strictly validate reasonCode and expiration dates.
- **Action**: Add strict validation to Marketplace Override API for reasonCode and activeUntil.

## IP-017
- **Gap**: GET /provider-task/opportunities flow handles scoring and sorting but misses impression logging.
- **Action**: Add OpportunityImpression logging to the Opportunity API.

## IP-018
- **Gap**: ImpressionService exists but is not called when returning ranked tasks in Opportunity API.
- **Action**: Call ImpressionService.logImpressions() in Opportunity API.

## IP-019
- **Gap**: Hooks exist for task completion but not for select, apply, or dispute events.
- **Action**: Add event listeners for apply, select, and dispute events to update matching profiles.

## IP-020
- **Gap**: BullMQ jobs are registered but logic inside the worker for decay, expiration, and cleanup is empty/stubbed.
- **Action**: Implement the handlers for maintenance jobs in MarketplaceMaintenanceWorker.

## IP-021
- **Gap**: Scores are clamped, but Quality rating 1-5 constraint is not fully enforced in the data layer.
- **Action**: Enforce Quality rating 1-5 validation strictly.

