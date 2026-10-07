-- AlterTable
ALTER TABLE "WebsiteMatchingProfile" ADD COLUMN     "lastRiskEventAt" TIMESTAMP(3),
ADD COLUMN     "lastRiskReason" TEXT;
