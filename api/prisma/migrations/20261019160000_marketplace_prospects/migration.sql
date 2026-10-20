-- CreateEnum
CREATE TYPE "MarketplaceProspectStatus" AS ENUM ('NEW', 'REVIEWED', 'DISMISSED', 'IMPORTED');

-- CreateTable
CREATE TABLE "MarketplaceProspect" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "website" TEXT,
    "email" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "sourceLabel" TEXT,
    "snippet" TEXT,
    "status" "MarketplaceProspectStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceProspect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceProspect_status_idx" ON "MarketplaceProspect"("status");

-- CreateIndex
CREATE INDEX "MarketplaceProspect_country_idx" ON "MarketplaceProspect"("country");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceProspect_name_sourceUrl_key" ON "MarketplaceProspect"("name", "sourceUrl");
