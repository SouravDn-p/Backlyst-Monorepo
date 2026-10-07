-- Spec P5b: first-class behaviour-pattern tracking, separate from RiskEngine
-- (penalties) and PatternMonitorService (graph clusters / reciprocal rings).
-- Adds anomalous-interaction-cadence detection storage: a BehaviourPattern
-- table per website window, plus a behaviourScore signal column on the
-- WebsiteMatchingProfile.

-- Enums for behaviour pattern classification + severity.
CREATE TYPE "BehaviourPatternType" AS ENUM ('ERRATIC_TIMING', 'RATING_CLUSTERING', 'BURST_IDLE_SWITCH');
CREATE TYPE "BehaviourPatternSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- BehaviourPattern table (per-website anomalous cadence records).
CREATE TABLE "BehaviourPattern" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "patternType" "BehaviourPatternType" NOT NULL,
    "severity" "BehaviourPatternSeverity" NOT NULL DEFAULT 'MEDIUM',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "evidenceJson" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BehaviourPattern_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BehaviourPattern_websiteId_windowEnd_idx" ON "BehaviourPattern"("websiteId", "windowEnd");
CREATE INDEX "BehaviourPattern_patternType_idx" ON "BehaviourPattern"("patternType");
CREATE INDEX "BehaviourPattern_severity_idx" ON "BehaviourPattern"("severity");
CREATE INDEX "BehaviourPattern_resolvedAt_idx" ON "BehaviourPattern"("resolvedAt");

ALTER TABLE "BehaviourPattern" ADD CONSTRAINT "BehaviourPattern_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- behaviourScore signal column on WebsiteMatchingProfile.
ALTER TABLE "WebsiteMatchingProfile" ADD COLUMN "behaviourScore" DOUBLE PRECISION NOT NULL DEFAULT 50;
ALTER TABLE "WebsiteMatchingProfile" ADD COLUMN "lastBehaviourScoredAt" TIMESTAMP(3);
CREATE INDEX "WebsiteMatchingProfile_behaviourScore_idx" ON "WebsiteMatchingProfile"("behaviourScore");
