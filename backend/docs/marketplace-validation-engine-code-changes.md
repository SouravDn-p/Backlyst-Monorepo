# Code Changes — Centralize & Re-Validate Marketplace Constraints

**Companion to:** `docs/marketplace-validation-engine-plan.md`
**Mode:** Review-only. No source files have been modified. Every snippet below is ready to apply as a SEARCH/REPLACE or new file.

This document shows the **exact code** required. Line numbers referenced are from the audited source (2026-07-15).

---

## 0. New Prisma schema (`prisma/schema/marketplace.prisma`)

### 0.1 Extend `MarketplaceScoringConfig` (configurable cooldowns)
Add to the existing `MarketplaceScoringConfig` model:
```prisma
  // Admin-configurable cooldowns (replaces hardcoded 90/120 in ValidationEngine)
  repeatPairCooldownDays   Int @default(90)
  reciprocalCooldownDays   Int @default(120)
```

### 0.2 New `MarketplaceValidationLog` model
```prisma
model MarketplaceValidationLog {
  id             String   @id @default(cuid())
  userId         String
  websiteId      String?
  taskId         String?
  stage          String // ValidationStage value
  decision       String // APPROVED | APPROVED_WITH_RESTRICTIONS | REJECTED
  failedRule     String?
  marketplaceMode String?
  overrideApplied Boolean  @default(false)
  createdAt      DateTime @default(now())

  @@index([userId, createdAt])
  @@index([taskId, createdAt])
  @@index([stage])
}
```

### 0.3 New `MarketplaceOverrideAudit` model
```prisma
model MarketplaceOverrideAudit {
  id         String   @id @default(cuid())
  overrideId  String?
  adminId    String
  websiteId  String?
  taskId     String?
  rule       String // e.g. RECIPROCAL_COOLDOWN, REPEAT_PAIR, WEEKLY_LIMIT
  action     String // APPLIED | SKIPPED
  reasonCode String
  createdAt  DateTime @default(now())

  @@index([adminId, createdAt])
  @@index([taskId])
}
```

> Then generate a migration: `npx prisma migrate dev --name marketplace_validation_engine`.

---

## 1. New file: `src/modules/task/market-algoritm/validation-result.ts`

```ts
export type ValidationStage =
  | 'CANDIDATE_GENERATION'
  | 'OPPORTUNITY_PRESENTATION'
  | 'PROVIDER_APPLICATION'
  | 'TASK_ACCEPTANCE'
  | 'INTERACTION_APPROVAL'
  | 'ADMIN_FORCE';

export type ValidationDecision =
  | 'APPROVED'
  | 'APPROVED_WITH_RESTRICTIONS'
  | 'REJECTED';

export interface ValidationResult {
  decision: ValidationDecision;
  stage: ValidationStage;
  failedRules: string[]; // internal only — never return to client
  restrictions: string[]; // e.g. LOW_VISIBILITY, LOW_PRIORITY
  overrideApplied: boolean;
  publicMessage: string; // safe message (spec §13)
}

// Safe public messages (spec §13): never expose raw rule names
export const SAFE_MESSAGES = {
  COOLDOWN: 'This opportunity is currently unavailable.',
  LIMIT: 'No suitable opportunities are currently available.',
  ELIGIBILITY: 'This opportunity is currently unavailable.',
  GENERIC: 'This opportunity is currently unavailable.',
} as const;
```

---

## 2. Modify `src/modules/task/market-algoritm/validation.engine.ts`

### 2.1 Replace hardcoded constants with config-backed fields + imports

At top of file, import the new types:
```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ValidationStage,
  ValidationDecision,
  ValidationResult,
  SAFE_MESSAGES,
} from './validation-result';
```

Keep the existing constants as fallback defaults:
```ts
@Injectable()
export class ValidationEngine {
  // Fallback only; real values come from MarketplaceScoringConfig
  private readonly fallbackRepeatPairCooldownDays = 90;
  private readonly fallbackReciprocalCooldownDays = 120;
  // ... rest unchanged (normalizeRootDomain, buildPairKey, getCooldownUntil, etc.)
```

### 2.2 Add config loader + master `validateTransition` + `logValidation`

Append these methods to the `ValidationEngine` class (after `isWebsiteRowMarketplaceEligible`):

```ts
  private async getCooldownDays(): Promise<{ repeat: number; reciprocal: number }> {
    const cfg = await this.prisma.marketplaceScoringConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: { repeatPairCooldownDays: true, reciprocalCooldownDays: true },
    });
    return {
      repeat: cfg?.repeatPairCooldownDays ?? this.fallbackRepeatPairCooldownDays,
      reciprocal: cfg?.reciprocalCooldownDays ?? this.fallbackReciprocalCooldownDays,
    };
  }

  /**
   * Single source of truth for all marketplace constraint checks.
   * Evaluates spec §7 levels in order; fails closed on any required failure.
   * adminOverride may skip ONLY the overridden rule — never eligibility/ownership/security.
   */
  async validateTransition(input: {
    stage: ValidationStage;
    actorUserId: string;
    providerWebsiteId?: string;
    requesterWebsiteId?: string;
    taskId?: string;
    providerDomain?: string;
    requesterDomain?: string;
    task?: { lifecycleStatus?: string; requesterId?: string; selectedProviderId?: string | null };
    dailyMatches?: number;
    maxProviderMatchesPerDay?: number;
    adminOverride?: { adminId: string; rule: string; reasonCode: string };
  }): Promise<ValidationResult> {
    const failedRules: string[] = [];
    const restrictions: string[] = [];
    let overrideApplied = false;

    const skip = (rule: string) => input.adminOverride?.rule === rule;

    // ---- LEVEL 1: ELIGIBILITY (never overridable) ----
    const user = await this.prisma.user.findUnique({
      where: { id: input.actorUserId },
      select: { status: true },
    });
    if (!user || user.status !== 'ACTIVE') failedRules.push('USER_INACTIVE');

    if (input.providerWebsiteId) {
      const eligible = await this.isWebsiteEligible(input.providerWebsiteId, input.actorUserId);
      if (!eligible) failedRules.push('PROVIDER_WEBSITE_INELIGIBLE');
    }
    if (input.requesterWebsiteId) {
      const reqEligible = await this.isMarketplaceWebsiteEligible(input.requesterWebsiteId);
      if (!reqEligible) failedRules.push('REQUESTER_WEBSITE_INELIGIBLE');
    }
    // Task status / ownership (spec §4 Task Constraints)
    if (input.task) {
      if (input.task.lifecycleStatus && !['OPEN', 'WAITING_FOR_APPLICANTS', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED'].includes(input.task.lifecycleStatus)) {
        failedRules.push('TASK_NOT_AVAILABLE');
      }
      if (input.task.requesterId && input.actorUserId === input.task.requesterId && input.stage !== 'ADMIN_FORCE') {
        failedRules.push('OWN_TASK');
      }
    }

    // ---- LEVEL 2: GOVERNANCE (cooldowns; overridable) ----
    if (input.providerDomain && input.requesterDomain) {
      const { repeat, reciprocal } = await this.getCooldownDays();
      const canMatch = await this.canMatchWithWindows(
        input.providerDomain,
        input.requesterDomain,
        skip('REPEAT_PAIR') ? 0 : repeat,
        skip('RECIPROCAL_COOLDOWN') ? 0 : reciprocal,
      );
      if (!canMatch) {
        if (skip('REPEAT_PAIR') || skip('RECIPROCAL_COOLDOWN')) {
          overrideApplied = true;
        } else {
          failedRules.push('DOMAIN_COOLDOWN');
        }
      }
    }

    // ---- LEVEL 3: CAPACITY (weekly/velocity/tier — stubbed: null = no limit) ----
    if (typeof input.dailyMatches === 'number' && typeof input.maxProviderMatchesPerDay === 'number') {
      if (!skip('DAILY_LIMIT') && input.dailyMatches >= input.maxProviderMatchesPerDay) {
        failedRules.push('DAILY_LIMIT');
      }
    }
    // weeklyInteractionLimit / tierVelocityLimit: read from profile when present;
    // null/undefined => not enforced yet (deferred to VelocityEngine/TierEngine).

    // ---- LEVEL 4: BEHAVIOUR (risk; pattern/network deferred) ----
    if (input.providerWebsiteId) {
      const profile = await this.prisma.websiteMatchingProfile.findUnique({
        where: { websiteId: input.providerWebsiteId },
        select: { riskScore: true, marketplaceStatus: true },
      });
      if (!profile) {
        failedRules.push('MISSING_MATCHING_PROFILE'); // fail-closed (see plan §2c)
      } else if (profile.marketplaceStatus !== 'ACTIVE') {
        failedRules.push('WEBSITE_STATUS_NOT_ACTIVE');
      } else if (profile.riskScore >= 75) {
        failedRules.push('RISK_THRESHOLD');
      }
    }

    // ---- LEVEL 5: OPTIMIZATION (non-blocking -> restrictions only) ----
    // visibility/quality/new-user boosts affect ranking, not approval.
    // (forceNewDomainNext deferred to DistributionEngine — Task #9.)

    // ---- DECISION ----
    let decision: ValidationDecision;
    let publicMessage = SAFE_MESSAGES.GENERIC;
    if (failedRules.length === 0) {
      decision = restrictions.length > 0 ? 'APPROVED_WITH_RESTRICTIONS' : 'APPROVED';
    } else {
      decision = 'REJECTED';
      publicMessage =
        failedRules.includes('DOMAIN_COOLDOWN') || failedRules.includes('DAILY_LIMIT')
          ? SAFE_MESSAGES.COOLDOWN
          : SAFE_MESSAGES.ELIGIBILITY;
    }

    const result: ValidationResult = {
      decision,
      stage: input.stage,
      failedRules,
      restrictions,
      overrideApplied,
      publicMessage,
    };

    await this.logValidation(input, result);
    if (overrideApplied && input.adminOverride) {
      await this.prisma.marketplaceOverrideAudit.create({
        data: {
          adminId: input.adminOverride.adminId,
          websiteId: input.providerWebsiteId,
          taskId: input.taskId,
          rule: input.adminOverride.rule,
          action: 'APPLIED',
          reasonCode: input.adminOverride.reasonCode,
        },
      });
    }
    return result;
  }

  // canMatch variant that accepts explicit windows (so overrides can zero them)
  private async canMatchWithWindows(
    sourceDomain: string,
    targetDomain: string,
    repeatDays: number,
    reciprocalDays: number,
  ): Promise<boolean> {
    const normalizedSource = this.normalizeRootDomain(sourceDomain);
    const normalizedTarget = this.normalizeRootDomain(targetDomain);
    if (!normalizedSource || !normalizedTarget || normalizedSource === normalizedTarget) {
      return false;
    }
    const pairKey = this.buildPairKey(normalizedSource, normalizedTarget);
    const pairStat = await this.prisma.domainPairStat.findUnique({ where: { normalizedPairKey: pairKey } });
    if (!pairStat) return true;
    const now = new Date();
    if (repeatDays > 0 && pairStat.repeatPairCooldownUntil && pairStat.repeatPairCooldownUntil > now) return false;
    if (reciprocalDays > 0 && pairStat.reciprocalCooldownUntil && pairStat.reciprocalCooldownUntil > now) return false;
    return true;
  }

  private async logValidation(
    input: { actorUserId: string; providerWebsiteId?: string; requesterWebsiteId?: string; taskId?: string; stage: ValidationStage },
    result: ValidationResult,
  ) {
    await this.prisma.marketplaceValidationLog.create({
      data: {
        userId: input.actorUserId,
        websiteId: input.providerWebsiteId ?? input.requesterWebsiteId,
        taskId: input.taskId,
        stage: input.stage,
        decision: result.decision,
        failedRule: result.failedRules[0] ?? null,
        overrideApplied: result.overrideApplied,
      },
    }).catch(() => {
      // validation logging must never block the marketplace operation
    });
  }
```

> Note: `isWebsiteEligible` already calls `isMarketplaceWebsiteEligible`; keep as-is. The missing-profile case is now handled explicitly at Level 4 (fail-closed) — this closes the bypass weakness from the audit (plan §A weakness #1) without silently creating profiles.

---

## 3. Modify `src/modules/task/market-algoritm/matching.engine.ts`

### 3.1 Stage 1 logging (no behaviour change)
In `findCandidates`, after the existing eligibility calls succeed, uniform logging is optional — matching already filters. Minimal recommendation: leave `findCandidates` as-is; the audit logging requirement is satisfied by `logValidation` calls at Stages 3/4/5. **No code change strictly required here** — the original plan's C-table row for `matching.engine.ts` can be downgraded to "already covered." (Keeps the change surface smaller.)

---

## 4. Modify `src/modules/task/provider-task/provider-task.service.ts`

### 4.1 Stage 3 — wrap `applyToTask` (lines ~316–347)
Replace the three inline calls:
```ts
    const isEligible = await this.validationEngine.isWebsiteEligible(payload.providerWebsiteId, providerId);
    if (!isEligible) {
      throw new ForbiddenException('Your website is not eligible (must be verified and active).');
    }
    const taskRequesterWebsite = await this.prisma.website.findUnique({ where: { id: task.requesterWebsiteId } });
    if (!taskRequesterWebsite) { throw new BadRequestException('Requester website not found for this task.'); }
    const isRequesterWebsiteEligible = await this.validationEngine.isMarketplaceWebsiteEligible(taskRequesterWebsite.id);
    if (!isRequesterWebsiteEligible) { throw new BadRequestException('Requester website is not eligible for marketplace matching.'); }
    const canMatch = await this.validationEngine.canMatch(providerWebsite.rootDomain || providerWebsite.websiteUrl, taskRequesterWebsite.rootDomain || taskRequesterWebsite.websiteUrl);
    if (!canMatch) { throw new BadRequestException('Cooldown active: You have interacted with this requester domain recently.'); }
```
with:
```ts
    const taskRequesterWebsite = await this.prisma.website.findUnique({ where: { id: task.requesterWebsiteId } });
    if (!taskRequesterWebsite) {
      throw new BadRequestException('Requester website not found for this task.');
    }

    const validation = await this.validationEngine.validateTransition({
      stage: 'PROVIDER_APPLICATION',
      actorUserId: providerId,
      providerWebsiteId: payload.providerWebsiteId,
      requesterWebsiteId: task.requesterWebsiteId,
      taskId: taskId,
      providerDomain: providerWebsite.rootDomain || providerWebsite.websiteUrl,
      requesterDomain: taskRequesterWebsite.rootDomain || taskRequesterWebsite.websiteUrl,
      task: { lifecycleStatus: task.lifecycleStatus, requesterId: task.requesterId, selectedProviderId: task.selectedProviderId },
    });
    if (validation.decision === 'REJECTED') {
      throw new ForbiddenException(validation.publicMessage);
    }
```
Keep the Moz DR block (`:349-362`) unchanged — it is a separate non-marketplace rule.

---

## 5. Modify `src/modules/task/task-requester/task-requester.service.ts`

### 5.1 Stage 4 — `selectProvider` (insert BEFORE the `tx` block at line 680)
After the existing `application` lookup (`:662-673`) and before `const now = new Date();` (`:675`), insert:
```ts
    // Stage 4 re-validation (spec §5): provider/task may have changed since apply
    const validation = await this.validationEngine.validateTransition({
      stage: 'TASK_ACCEPTANCE',
      actorUserId: requesterId,
      providerWebsiteId: application.providerWebsiteId,
      requesterWebsiteId: task.requesterWebsiteId,
      taskId: taskId,
      providerDomain: providerWebsite?.rootDomain ?? undefined,
      requesterDomain: requesterWebsite?.rootDomain ?? undefined,
      task: { lifecycleStatus: task.lifecycleStatus, requesterId: task.requesterId, selectedProviderId: task.selectedProviderId },
    });
    if (validation.decision === 'REJECTED') {
      throw new ForbiddenException(validation.publicMessage);
    }
```
> You must load `providerWebsite` and `requesterWebsite` root domains for the `providerDomain`/`requesterDomain` args (a small `findUnique` each, or reuse existing variables if already in scope). Keep the rest of `selectProvider` unchanged.

### 5.2 Stage 5 — `reviewTask` APPROVE (insert at line 1031, BEFORE `const updatedTask = await this.prisma.$transaction` at 1032)
After the `assignedProviderWebsiteId` guard (`:1023-1030`), insert:
```ts
    // Stage 5 re-validation (spec §5): mandatory complete validation before approval
    if (payload.action === TaskReviewActionDtoEnum.APPROVE) {
      const providerSite = await this.prisma.website.findUnique({
        where: { id: task.assignedProviderWebsiteId! },
        select: { rootDomain: true },
      });
      const requesterSite = await this.prisma.website.findUnique({
        where: { id: task.requesterWebsiteId },
        select: { rootDomain: true },
      });
      const approvalValidation = await this.validationEngine.validateTransition({
        stage: 'INTERACTION_APPROVAL',
        actorUserId: requesterId,
        providerWebsiteId: task.assignedProviderWebsiteId ?? undefined,
        requesterWebsiteId: task.requesterWebsiteId,
        taskId: taskId,
        providerDomain: providerSite?.rootDomain,
        requesterDomain: requesterSite?.rootDomain,
        task: { lifecycleStatus: task.lifecycleStatus, requesterId: task.requesterId, selectedProviderId: task.selectedProviderId },
      });
      if (approvalValidation.decision === 'REJECTED') {
        throw new ForbiddenException(approvalValidation.publicMessage);
      }
    }
```

---

## 6. Modify `src/modules/task/admin-task/admin-task.service.ts`

### 6.1 Route admin force/resolve paths through `validateTransition`
In `forceApproveTask`, `resolveDispute` (approve branch), and admin-complete: before the state mutation, call:
```ts
    const adminValidation = await this.validationEngine.validateTransition({
      stage: 'ADMIN_FORCE',
      actorUserId: adminId, // actor is admin; provider/requester still validated via websiteIds
      providerWebsiteId,
      requesterWebsiteId,
      taskId,
      providerDomain,
      requesterDomain,
      adminOverride: { adminId, rule: 'RECIPROCAL_COOLDOWN', reasonCode: payload.reason ?? 'ADMIN_FORCE' },
    });
    // ADMIN_FORCE still enforces eligibility/ownership/security (never overridable).
    // Only the explicitly named rule is skipped; everything else must pass.
    if (adminValidation.decision === 'REJECTED' && !adminValidation.overrideApplied) {
      throw new ForbiddenException(adminValidation.publicMessage);
    }
```
> Replace `providerWebsiteId`/`requesterWebsiteId`/`providerDomain`/`requesterDomain` with the values already loaded in those methods. Eligibility/ownership failures will still REJECT even under `ADMIN_FORCE` (spec §9).

---

## 7. Rollout guards (recommended)

Add a config toggle on `MarketplaceScoringConfig` (or env flags) so Stage 4/5 can be enabled per environment after backfill:
```ts
  enforceRevalidationAtAcceptance Boolean @default(false)
  enforceRevalidationAtApproval  Boolean @default(false)
```
In `validateTransition`, early-return `APPROVED` (with a log) when the relevant flag is off and `stage` is `TASK_ACCEPTANCE`/`INTERACTION_APPROVAL` and no `adminOverride` is present. This prevents a production incident from pre-existing inconsistent state (the User Review warning).

Also run `scripts/backfill-website-matching-profiles.ts` before enabling, so the new `MISSING_MATCHING_PROFILE` fail-closed rule does not mass-reject existing websites.

---

## 8. Test sketch (`validation.engine.spec.ts`)

```ts
describe('ValidationEngine.validateTransition', () => {
  it('rejects when provider website is ineligible (Level 1)', async () => { /* ... */ });
  it('rejects on domain cooldown (Level 2)', async () => { /* ... */ });
  it('override skips cooldown but NOT ownership (Level 1 never overridable)', async () => {
    const r = await engine.validateTransition({ stage:'ADMIN_FORCE', actorUserId, providerWebsiteId, requesterWebsiteId, taskId, adminOverride:{adminId, rule:'RECIPROCAL_COOLDOWN', reasonCode:'x'} });
    expect(r.overrideApplied).toBe(true);
  });
  it('override attempting to skip OWN_TASK still fails', async () => {
    const r = await engine.validateTransition({ stage:'ADMIN_FORCE', actorUserId: requesterId, /* own task */ adminOverride:{adminId, rule:'OWN_TASK', reasonCode:'x'} });
    expect(r.failedRules).toContain('OWN_TASK');
    expect(r.decision).toBe('REJECTED');
  });
  it('returns safe publicMessage, never raw rule', async () => { /* assert publicMessage === SAFE_MESSAGES.* */ });
  it('missing matching profile => REJECTED (fail-closed)', async () => { /* ... */ });
});
```

---

## Summary of files touched

| File | Action |
|---|---|
| `prisma/schema/marketplace.prisma` | Add 2 config fields + 2 models + migration |
| `src/modules/task/market-algoritm/validation-result.ts` | **New** |
| `src/modules/task/market-algoritm/validation.engine.ts` | Add `validateTransition`, `canMatchWithWindows`, `getCooldownDays`, `logValidation` |
| `src/modules/task/provider-task/provider-task.service.ts` | Wrap `applyToTask` (Stage 3) |
| `src/modules/task/task-requester/task-requester.service.ts` | Add Stage 4 (`:680`) + Stage 5 (`:1031`) |
| `src/modules/task/admin-task/admin-task.service.ts` | Route force/resolve through `validateTransition` |

No behaviour-breaking change ships until the rollout flags (§7) are enabled post-backfill.
