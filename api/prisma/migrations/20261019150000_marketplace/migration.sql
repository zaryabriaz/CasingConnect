-- AlterEnum
ALTER TYPE "BusinessActivity" ADD VALUE 'BUYER';

-- CreateEnum
CREATE TYPE "MarketplaceInquiryStatus" AS ENUM ('OPEN', 'REPLIED', 'CLOSED');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "marketplaceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketplaceHeadline" TEXT,
ADD COLUMN     "marketplaceBio" TEXT,
ADD COLUMN     "marketplaceLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "casingTypeId" UUID,
    "qualityId" UUID,
    "qualityText" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "pricePerUnit" DECIMAL(14,2),
    "destinationHint" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceInquiry" (
    "id" UUID NOT NULL,
    "listingId" UUID,
    "toBusinessId" UUID NOT NULL,
    "fromUserId" UUID NOT NULL,
    "fromBusinessId" UUID,
    "message" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "status" "MarketplaceInquiryStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceListing_businessId_active_idx" ON "MarketplaceListing"("businessId", "active");

-- CreateIndex
CREATE INDEX "MarketplaceListing_currency_idx" ON "MarketplaceListing"("currency");

-- CreateIndex
CREATE INDEX "MarketplaceListing_qualityText_idx" ON "MarketplaceListing"("qualityText");

-- CreateIndex
CREATE INDEX "MarketplaceInquiry_toBusinessId_status_idx" ON "MarketplaceInquiry"("toBusinessId", "status");

-- CreateIndex
CREATE INDEX "MarketplaceInquiry_fromUserId_idx" ON "MarketplaceInquiry"("fromUserId");

-- CreateIndex
CREATE INDEX "MarketplaceInquiry_fromBusinessId_idx" ON "MarketplaceInquiry"("fromBusinessId");

-- CreateIndex
CREATE INDEX "MarketplaceInquiry_listingId_idx" ON "MarketplaceInquiry"("listingId");

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_casingTypeId_fkey" FOREIGN KEY ("casingTypeId") REFERENCES "CasingType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_qualityId_fkey" FOREIGN KEY ("qualityId") REFERENCES "Quality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceInquiry" ADD CONSTRAINT "MarketplaceInquiry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceInquiry" ADD CONSTRAINT "MarketplaceInquiry_toBusinessId_fkey" FOREIGN KEY ("toBusinessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceInquiry" ADD CONSTRAINT "MarketplaceInquiry_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceInquiry" ADD CONSTRAINT "MarketplaceInquiry_fromBusinessId_fkey" FOREIGN KEY ("fromBusinessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
