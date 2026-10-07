/*
  Warnings:

  - You are about to drop the column `primaryCategoryKey` on the `Website` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Website" DROP COLUMN "primaryCategoryKey",
ADD COLUMN     "categoryKey" TEXT;

-- CreateTable
CREATE TABLE "WebsiteCategoryKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteCategoryKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteCategoryKey_key_key" ON "WebsiteCategoryKey"("key");
