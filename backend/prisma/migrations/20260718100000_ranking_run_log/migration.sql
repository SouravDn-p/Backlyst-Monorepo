-- CreateTable
CREATE TABLE "RankingRunLog" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "candidatesIn" INTEGER NOT NULL,
    "candidatesOut" INTEGER NOT NULL,
    "marketplaceMode" TEXT NOT NULL,
    "lowPoolActive" BOOLEAN NOT NULL DEFAULT false,
    "processingTimeMs" INTEGER NOT NULL,
    "topScores" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RankingRunLog_providerId_createdAt_idx" ON "RankingRunLog"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "RankingRunLog_marketplaceMode_idx" ON "RankingRunLog"("marketplaceMode");

-- CreateIndex
CREATE INDEX "RankingRunLog_createdAt_idx" ON "RankingRunLog"("createdAt");
