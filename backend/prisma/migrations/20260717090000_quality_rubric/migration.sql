-- Spec §21: structured quality rubrics for provider ratings. Persisted when a
-- requester approves a submission so the historical quality is auditable and
-- feeds the provider's WebsiteMatchingProfile quality ratings.
CREATE TABLE "QualityRubric" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "providerWebsiteId" TEXT NOT NULL,
    "requesterWebsiteId" TEXT NOT NULL,
    "contentRelevance" INTEGER NOT NULL,
    "technicalQuality" INTEGER NOT NULL,
    "communication" INTEGER NOT NULL,
    "timeliness" INTEGER NOT NULL,
    "overallSatisfaction" INTEGER NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityRubric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QualityRubric_taskId_key" ON "QualityRubric"("taskId");
CREATE INDEX "QualityRubric_providerWebsiteId_idx" ON "QualityRubric"("providerWebsiteId");
CREATE INDEX "QualityRubric_requesterWebsiteId_idx" ON "QualityRubric"("requesterWebsiteId");
