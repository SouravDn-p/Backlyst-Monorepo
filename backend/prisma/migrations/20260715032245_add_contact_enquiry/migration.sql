/*
  Warnings:

  - You are about to drop the column `status` on the `BlogPost` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'RESOLVED', 'ARCHIVED');

-- DropIndex
DROP INDEX "BlogPost_status_publishedAt_idx";

-- AlterTable
ALTER TABLE "BlogPost" DROP COLUMN "status",
ALTER COLUMN "publishedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- DropEnum
DROP TYPE "BlogStatus";

-- CreateTable
CREATE TABLE "ContactEnquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactEnquiry_status_idx" ON "ContactEnquiry"("status");

-- CreateIndex
CREATE INDEX "ContactEnquiry_isRead_idx" ON "ContactEnquiry"("isRead");

-- CreateIndex
CREATE INDEX "ContactEnquiry_createdAt_idx" ON "ContactEnquiry"("createdAt");

-- CreateIndex
CREATE INDEX "BlogPost_publishedAt_idx" ON "BlogPost"("publishedAt");
