-- CreateEnum
CREATE TYPE "PatternFlagType" AS ENUM ('CLUSTER_CONCENTRATION', 'RECIPROCAL_RING', 'REPEAT_BURST');

-- CreateEnum
CREATE TYPE "PatternSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "PatternFlagStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "PatternFlag" (
    "id" TEXT NOT NULL,
    "type" "PatternFlagType" NOT NULL,
    "severity" "PatternSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "PatternFlagStatus" NOT NULL DEFAULT 'OPEN',
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "domainCount" INTEGER NOT NULL,
    "memberDomains" TEXT[],
    "evidenceJson" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatternFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatternFlag_type_idx" ON "PatternFlag"("type");

-- CreateIndex
CREATE INDEX "PatternFlag_status_idx" ON "PatternFlag"("status");

-- CreateIndex
CREATE INDEX "PatternFlag_windowEnd_idx" ON "PatternFlag"("windowEnd");
