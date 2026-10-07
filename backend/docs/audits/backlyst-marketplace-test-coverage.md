# BACKLYST MARKETPLACE TEST COVERAGE

## Hard Eligibility

| ID | Requirement | Test File | Test Case Name | Test Level | Status | Remaining Gap |
|---|---|---|---|---|---|---|
| HE-01 | unauthenticated request | N/A | N/A | E2E | NOT_IMPLEMENTED | Missing E2E API tests |
| HE-02 | inactive account | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| HE-03 | banned account | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| HE-04 | suspended website | validation.engine.spec.ts | treats SUSPENDED as ineligible for browsing | Unit | IMPLEMENTED | None |
| HE-05 | deleted website | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| HE-06 | unverified provider website | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| HE-07 | own task excluded | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| HE-08 | already-applied task excluded | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| HE-09 | cancelled task excluded | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| HE-10 | expired task excluded | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| HE-11 | assigned task excluded | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| HE-12 | completed task excluded | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| HE-13 | suppressed requester/provider excluded | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |

## Domain and Relationship

| ID | Requirement | Test File | Test Case Name | Test Level | Status | Remaining Gap |
|---|---|---|---|---|---|---|
| DAR-01 | root-domain normalization | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| DAR-02 | www and non-www equality | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| DAR-03 | subdomain handling | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| DAR-04 | reciprocal restriction | validation.engine.spec.ts | EARLY_STAGE applies tighter 90d reciprocal / 60d repeat when no explicit config | Unit | IMPLEMENTED | None |
| DAR-05 | reverse pair | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| DAR-06 | repeated pair | validation.engine.spec.ts | EARLY_STAGE applies tighter 90d reciprocal / 60d repeat when no explicit config | Unit | IMPLEMENTED | None |
| DAR-07 | exact cooldown boundary | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| DAR-08 | different websites on same root domain | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| DAR-09 | interaction recording | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| DAR-10 | historical slug normalization | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |

## Velocity and Tiers

| ID | Requirement | Test File | Test Case Name | Test Level | Status | Remaining Gap |
|---|---|---|---|---|---|---|
| VAT-01 | Free weekly maximum | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| VAT-02 | Silver weekly maximum | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| VAT-03 | Gold weekly maximum | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| VAT-04 | Platinum weekly maximum | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| VAT-05 | Enterprise per-domain maximum | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| VAT-06 | absolute five-per-domain maximum | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| VAT-07 | strictest limit wins | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| VAT-08 | same-day clustering | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| VAT-09 | concurrent final-slot requests | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| VAT-10 | transaction rollback | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| VAT-11 | idempotent completion retry | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |

## Taxonomy

| ID | Requirement | Test File | Test Case Name | Test Level | Status | Remaining Gap |
|---|---|---|---|---|---|---|
| T-01 | exact primary category | matching-relaxation.engine.spec.ts | EXACT (level 0) requires category+tags exact... | Unit | IMPLEMENTED | None |
| T-02 | exact secondary category | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| T-03 | related category | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| T-04 | relationship direction | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| T-05 | broad parent | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| T-06 | approved ancestor behavior | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| T-07 | tag overlap | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| T-08 | no tags | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| T-09 | canonical taxonomy precedence | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| T-10 | legacy fallback only when taxonomy absent | matching-relaxation.engine.spec.ts | FALLBACK (level 4) passes anything | Unit | IMPLEMENTED | None |
| T-11 | unrelated final fallback | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| T-12 | deterministic primary role | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| T-13 | array order has no effect | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |

## Ranking

| ID | Requirement | Test File | Test Case Name | Test Level | Status | Remaining Gap |
|---|---|---|---|---|---|---|
| R-01 | compatibility score | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| R-02 | opportunity score | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| R-03 | visibility score | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| R-04 | reputation score | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| R-05 | onboarding boost | boost.service.spec.ts | stamps firstSuccessAt once and clears the one-time boost on first success | Unit | IMPLEMENTED | None |
| R-06 | underserved boost | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| R-07 | admin boost | ranking.service.spec.ts | ACTIVE uses default boost (2.5) | Unit | PARTIALLY_IMPLEMENTED | Needs override coverage |
| R-08 | boost decay | scoring.utils.spec.ts | decays boost while respecting minimum value | Unit | IMPLEMENTED | None |
| R-09 | exposure penalty | ranking.service.spec.ts | surfaces every sub-signal on the returned metrics | Unit | PARTIALLY_IMPLEMENTED | Needs explicit penalty coverage |
| R-10 | risk penalty | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| R-11 | deterministic tie-break | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| R-12 | stable pagination | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| R-13 | no double-counted taxonomy signal | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |

## Distribution

| ID | Requirement | Test File | Test Case Name | Test Level | Status | Remaining Gap |
|---|---|---|---|---|---|---|
| D-01 | same-niche cap | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| D-02 | adjacent/broad minimum | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| D-03 | insufficient-history behavior | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| D-04 | low-pool behavior | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| D-05 | concentration detection | quality-status.engine.spec.ts | detects a single 4-node cycle as one SCC of size 4 | Unit | IMPLEMENTED | None |
| D-06 | forced diversification | quality-status.engine.spec.ts | separates disjoint cycles into distinct SCCs | Unit | IMPLEMENTED | None |
| D-07 | historical legacy normalization | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |

## Lifecycle

| ID | Requirement | Test File | Test Case Name | Test Level | Status | Remaining Gap |
|---|---|---|---|---|---|---|
| L-01 | generate | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| L-02 | apply | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| L-03 | accept | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| L-04 | assign | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| L-05 | admin assign | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| L-06 | approve | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| L-07 | complete | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| L-08 | webhook complete | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| L-09 | retry | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| L-10 | reconciliation | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| L-11 | direct-update bypass blocked | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |

## Overrides and Audit

| ID | Requirement | Test File | Test Case Name | Test Level | Status | Remaining Gap |
|---|---|---|---|---|---|---|
| OAA-01 | unauthorized access | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| OAA-02 | permission enforcement | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| OAA-03 | reason required | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| OAA-04 | expiry required | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| OAA-05 | expired override rejected synchronously | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| OAA-06 | creation audit | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| OAA-07 | update audit | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| OAA-08 | revocation audit | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| OAA-09 | expiry audit | validation.engine.spec.ts | records affectedDomains (both root domains) + expiry when overriding | Unit | IMPLEMENTED | None |
| OAA-10 | atomic rollback | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| OAA-11 | force-match audit | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| OAA-12 | immutable audit record | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |

## BullMQ

| ID | Requirement | Test File | Test Case Name | Test Level | Status | Remaining Gap |
|---|---|---|---|---|---|---|
| B-01 | schedule registered once | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| B-02 | duplicate job delivery | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| B-03 | retry | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| B-04 | idempotency | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| B-05 | multiple worker instances | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| B-06 | processor restart | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| B-07 | batch resume | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| B-08 | boost decay once per period | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| B-09 | cleanup boundary | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| B-10 | override expiry audit | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| B-11 | old cron disabled | Source inspection | Grep for @Cron | Static | IMPLEMENTED | Static evidence only |

## Backend/Frontend Contract

| ID | Requirement | Test File | Test Case Name | Test Level | Status | Remaining Gap |
|---|---|---|---|---|---|---|
| BC-01 | standard result | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| BC-02 | fallback result | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| BC-03 | empty result | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| BC-04 | verification state | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| BC-05 | pagination | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| BC-06 | safe error code | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| BC-07 | no internal-score exposure | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| BC-08 | frontend loading | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| BC-09 | frontend retry | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| BC-10 | selected website preservation | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| BC-11 | fallback notice | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |
| BC-12 | empty state | N/A | N/A | Unit/E2E | NOT_IMPLEMENTED | Test genuinely missing |

