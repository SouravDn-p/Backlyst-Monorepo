-- CreateTable
CREATE TABLE "WebsiteMargetPlaceTag" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteMargetPlaceTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteMargetPlaceTag_tag_key" ON "WebsiteMargetPlaceTag"("tag");
