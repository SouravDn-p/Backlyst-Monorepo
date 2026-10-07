-- DropForeignKey
ALTER TABLE "Website" DROP CONSTRAINT "Website_primaryCategoryKey_fkey";

-- AddForeignKey
ALTER TABLE "Website" ADD CONSTRAINT "Website_primaryCategoryKey_fkey" FOREIGN KEY ("primaryCategoryKey") REFERENCES "WebsiteCategoryKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
