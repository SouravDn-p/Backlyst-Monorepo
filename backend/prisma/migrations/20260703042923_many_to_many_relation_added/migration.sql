/*
  Warnings:

  - You are about to drop the column `marketplaceTagKeys` on the `Website` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Website" DROP COLUMN "marketplaceTagKeys";

-- CreateTable
CREATE TABLE "_WebsiteToWebsiteMargetPlaceTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_WebsiteToWebsiteMargetPlaceTag_AB_unique" ON "_WebsiteToWebsiteMargetPlaceTag"("A", "B");

-- CreateIndex
CREATE INDEX "_WebsiteToWebsiteMargetPlaceTag_B_index" ON "_WebsiteToWebsiteMargetPlaceTag"("B");

-- AddForeignKey
ALTER TABLE "_WebsiteToWebsiteMargetPlaceTag" ADD CONSTRAINT "_WebsiteToWebsiteMargetPlaceTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WebsiteToWebsiteMargetPlaceTag" ADD CONSTRAINT "_WebsiteToWebsiteMargetPlaceTag_B_fkey" FOREIGN KEY ("B") REFERENCES "WebsiteMargetPlaceTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
