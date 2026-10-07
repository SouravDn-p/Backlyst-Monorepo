-- AlterTable
ALTER TABLE "Website" ADD COLUMN     "marketplaceTagKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "primaryCategoryKey" TEXT,
ADD COLUMN     "rootDomain" TEXT;
