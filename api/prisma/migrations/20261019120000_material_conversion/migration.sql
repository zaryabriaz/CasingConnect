-- AlterEnum
ALTER TYPE "StockOpType" ADD VALUE 'CONVERT';

-- CreateTable
CREATE TABLE "MaterialConversion" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "membershipId" UUID,
    "personName" TEXT NOT NULL,
    "fromForm" "IncomingMaterial" NOT NULL,
    "fromQuantity" DECIMAL(14,3) NOT NULL,
    "toForm" "IncomingMaterial",
    "casingTypeId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialConversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialConversionHank" (
    "id" UUID NOT NULL,
    "conversionId" UUID NOT NULL,
    "qualityId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "MaterialConversionHank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialConversion_businessId_reference_key" ON "MaterialConversion"("businessId", "reference");

-- CreateIndex
CREATE INDEX "MaterialConversion_businessId_date_idx" ON "MaterialConversion"("businessId", "date");

-- CreateIndex
CREATE INDEX "MaterialConversion_membershipId_idx" ON "MaterialConversion"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialConversionHank_conversionId_qualityId_key" ON "MaterialConversionHank"("conversionId", "qualityId");

-- CreateIndex
CREATE INDEX "MaterialConversionHank_qualityId_idx" ON "MaterialConversionHank"("qualityId");

-- AddForeignKey
ALTER TABLE "MaterialConversion" ADD CONSTRAINT "MaterialConversion_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialConversion" ADD CONSTRAINT "MaterialConversion_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialConversionHank" ADD CONSTRAINT "MaterialConversionHank_conversionId_fkey" FOREIGN KEY ("conversionId") REFERENCES "MaterialConversion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialConversionHank" ADD CONSTRAINT "MaterialConversionHank_qualityId_fkey" FOREIGN KEY ("qualityId") REFERENCES "Quality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
