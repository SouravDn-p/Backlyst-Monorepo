/*
  Warnings:

  - You are about to drop the column `targetProviderWebsiteId` on the `DirectTaskRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DirectTaskRequest" DROP COLUMN "targetProviderWebsiteId";
