/*
  Warnings:

  - You are about to drop the column `categoryKey` on the `Website` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Website" DROP COLUMN "categoryKey",
ADD COLUMN     "primaryCategoryKey" TEXT;

-- AddForeignKey
ALTER TABLE "Website" ADD CONSTRAINT "Website_primaryCategoryKey_fkey" FOREIGN KEY ("primaryCategoryKey") REFERENCES "WebsiteCategoryKey"("key") ON DELETE SET NULL ON UPDATE CASCADE;
