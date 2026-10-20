-- AlterTable
ALTER TABLE "MarketplaceProspect" ADD COLUMN "lastCampaignAt" TIMESTAMP(3),
ADD COLUMN "lastCampaignTemplate" TEXT,
ADD COLUMN "campaignSendCount" INTEGER NOT NULL DEFAULT 0;
