-- CreateEnum
CREATE TYPE "DirectTaskRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DIRECT_TASK_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'DIRECT_TASK_REQUEST_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'DIRECT_TASK_REQUEST_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'DIRECT_TASK_REQUEST_CANCELLED';

-- CreateTable
CREATE TABLE "DirectTaskRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requesterWebsiteId" TEXT NOT NULL,
    "targetProviderId" TEXT NOT NULL,
    "targetProviderWebsiteId" TEXT NOT NULL,
    "projectTitle" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "anchorText" TEXT NOT NULL,
    "placementGuidelines" TEXT,
    "requiredDomainRating" INTEGER,
    "placementType" "PlacementType" NOT NULL,
    "linkAttribute" "LinkAttribute" NOT NULL,
    "requestedDeadlineDays" INTEGER NOT NULL,
    "creditCost" INTEGER NOT NULL,
    "reservedCreditAmount" INTEGER NOT NULL,
    "walletType" "CreditWalletType" NOT NULL,
    "status" "DirectTaskRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdTaskId" TEXT,
    "rejectionReason" TEXT,
    "cancellationReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "supportDocuments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectTaskRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DirectTaskRequest_createdTaskId_key" ON "DirectTaskRequest"("createdTaskId");

-- CreateIndex
CREATE INDEX "DirectTaskRequest_requesterId_idx" ON "DirectTaskRequest"("requesterId");

-- CreateIndex
CREATE INDEX "DirectTaskRequest_targetProviderId_idx" ON "DirectTaskRequest"("targetProviderId");

-- CreateIndex
CREATE INDEX "DirectTaskRequest_status_idx" ON "DirectTaskRequest"("status");

-- AddForeignKey
ALTER TABLE "DirectTaskRequest" ADD CONSTRAINT "DirectTaskRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectTaskRequest" ADD CONSTRAINT "DirectTaskRequest_targetProviderId_fkey" FOREIGN KEY ("targetProviderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectTaskRequest" ADD CONSTRAINT "DirectTaskRequest_createdTaskId_fkey" FOREIGN KEY ("createdTaskId") REFERENCES "PlacementTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
