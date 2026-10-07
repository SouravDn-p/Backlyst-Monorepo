# MARKETPLACE PATTERN MONITORING AUDIT

**Date:** 2026-07-20
**Target:** Section 14 - Pattern Monitoring

## Executive Summary

The marketplace Pattern Monitoring specifications (Section 14) have been audited against the current implementation in the `market-algoritm` module (`pattern-monitor.service.ts`, `behaviour-pattern.service.ts`, and `validation.engine.ts`).

The system successfully implements the majority of the specification, including active monitoring and detection of interaction concentration, repeated bursts, reciprocal rings, and anomalous timing cadences. These detections feed directly into Risk calculations and Validation rules.

There is, however, a critical philosophical misalignment between the spec's directive ("DO NOT BLOCK -> Monitor Behaviour -> Reduce Priority -> Reduce Visibility") and the recent R10 implementation which forces a **real-time hard rejection** for `HIGH` severity pattern flags.

## 1. Repeated Interaction Monitoring
**Spec Requirement:** Identify repeated domain relationships, excessive marketplace repetition, and relationship concentration.
**Implementation Status:** **COMPLIANT**
- Implemented in `PatternMonitorService.detectRepeatBursts()`.
- Detects the same ordered pair appearing ≥ 3 times in a rolling window.
- Persists as `REPEAT_BURST` pattern flags (MEDIUM or HIGH severity based on count).

## 2. Reciprocal Pattern Monitoring
**Spec Requirement:** Identify reciprocal behaviour patterns and repeated reciprocal exchanges.
**Implementation Status:** **COMPLIANT**
- Implemented in `PatternMonitorService.detectReciprocalRings()`.
- Detects directed cycles of lengths 3–10 using an inline Tarjan SCC algorithm.
- Persists as `RECIPROCAL_RING` pattern flags (MEDIUM or HIGH severity).

## 3. Interaction Concentration Monitoring
**Spec Requirement:** Monitor excessive interaction networks, limited opportunity diversity. Encourage interaction diversity.
**Implementation Status:** **COMPLIANT**
- Implemented in `PatternMonitorService.findSccs()`.
- Detects strongly connected components (size ≥ 4).
- Persists as `CLUSTER_CONCENTRATION` flags.

## 4. Interaction Velocity Monitoring
**Spec Requirement:** Monitor interaction frequency, clustering, marketplace concentration.
**Implementation Status:** **COMPLIANT**
- Implemented via `BehaviourPatternService` (cadence analysis).
- Detects `ERRATIC_TIMING`, `BURST_IDLE_SWITCH`, and `RATING_CLUSTERING`.
- Computes a `behaviourScore` (0-100) that feeds into the risk scoring engine.

## 5. Multi-Domain Monitoring & "DO NOT BLOCK" Rule
**Spec Requirement:**
> "Multi-domain users should NOT be automatically blocked solely because multiple domains exist."
> "DO NOT BLOCK -> Monitor Behaviour -> Reduce Priority -> Reduce Visibility"
> "Pattern Monitoring influences marketplace behaviour without necessarily blocking users."

**Implementation Status:** **NON-COMPLIANT (Overly Strict)**
- In `validation.engine.ts` (Level 2 checks), if a candidate's domain is in an `OPEN`, `HIGH`-severity pattern flag (`CLUSTER_CONCENTRATION`, `RECIPROCAL_RING`, `REPEAT_BURST`), the engine fails the interaction with `PATTERN_FLAG_BLOCKED`.
- While the spec says "without necessarily blocking users", it also says "Before marketplace interactions are approved the Validation Engine must verify: ... pattern monitoring flags".
- The hard-block approach (R10) prevents users from completing tasks if they are flagged, rather than just reducing priority/visibility (which happens natively by the flag's effect on `riskScore` and ranking).
- **Recommendation:** We must clarify if the `PATTERN_FLAG_BLOCKED` hard-rejection is intended given the R10 audit, or if it violates the explicit "DO NOT BLOCK" directive for multi-domain pattern monitoring.

## 6. Limited Domain Pool Monitoring
**Spec Requirement:** Determine unique domain counts and interaction diversity to penalize over-reliance on limited domain pools.
**Implementation Status:** **PARTIAL**
- `CLUSTER_CONCENTRATION` detects extreme isolated pools.
- General "unique domain count" tracking across a user's portfolio doesn't have a distinct penalty outside of standard distribution and network concentration limits.
- **Recommendation:** No immediate action required, as `DistributionEngine` and `PatternMonitorService` adequately limit domain isolation.

---

## Conclusion & Action Items

The Pattern Monitoring infrastructure is highly robust and compliant with Section 14, actively computing complex behavioral anomalies and network structures.

**Next Steps:**
1. Request confirmation on whether `HIGH` severity pattern flags should continue to hard-block interactions in `ValidationEngine` (`PATTERN_FLAG_BLOCKED`), or if they should solely degrade priority/visibility via scoring as suggested by the "DO NOT BLOCK" multi-domain guidance.
