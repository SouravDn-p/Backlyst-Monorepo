ALTER TABLE "PlacementTask"
ADD COLUMN "country" TEXT,
ADD COLUMN "language" TEXT;

ALTER TABLE "Website"
ADD COLUMN "language" TEXT,
ADD COLUMN "domainRating" INTEGER;

CREATE TABLE "MatchingAuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "websiteId" TEXT NOT NULL,
  "candidatesEval" INTEGER NOT NULL,
  "eligibleMatches" INTEGER NOT NULL,
  "relaxationLevel" INTEGER NOT NULL,
  "marketplaceMode" TEXT NOT NULL,
  "processingTimeMs" INTEGER NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,

  CONSTRAINT "MatchingAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlacementTask_country_idx" ON "PlacementTask"("country");
CREATE INDEX "PlacementTask_language_idx" ON "PlacementTask"("language");
CREATE INDEX "Website_country_idx" ON "Website"("country");
CREATE INDEX "Website_language_idx" ON "Website"("language");
CREATE INDEX "Website_domainRating_idx" ON "Website"("domainRating");
CREATE INDEX "MatchingAuditLog_userId_idx" ON "MatchingAuditLog"("userId");
CREATE INDEX "MatchingAuditLog_websiteId_idx" ON "MatchingAuditLog"("websiteId");
CREATE INDEX "MatchingAuditLog_timestamp_idx" ON "MatchingAuditLog"("timestamp");

INSERT INTO "MarketplaceScoringConfig" ("id", "createdAt", "updatedAt")
VALUES ('MARKETPLACE_SCORING_CONFIG', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
