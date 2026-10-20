-- CreateEnum
CREATE TYPE "IncomingMaterial" AS ENUM ('RODA', 'EIGHTEEN_UP', 'QUALITY');

-- CreateEnum
CREATE TYPE "Ownership" AS ENUM ('COMPANY', 'CUSTOMER');

-- CreateTable
CREATE TABLE "Sequence" (
    "businessId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("businessId","key")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "casingTypeId" UUID NOT NULL,
    "qualityId" UUID,
    "materialForm" "IncomingMaterial" NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'RAW',
    "ownership" "Ownership" NOT NULL,
    "partnerId" UUID,
    "locationId" UUID,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialReceipt" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "partnerId" UUID NOT NULL,
    "materialForm" "IncomingMaterial" NOT NULL,
    "casingTypeId" UUID NOT NULL,
    "qualityId" UUID,
    "qualityText" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitId" UUID NOT NULL,
    "rate" DECIMAL(14,2),
    "currency" TEXT NOT NULL,
    "ownership" "Ownership" NOT NULL DEFAULT 'COMPANY',
    "locationId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "batchId" UUID,
    "locationId" UUID,
    "ownership" "Ownership" NOT NULL,
    "stage" TEXT NOT NULL,
    "casingTypeId" UUID NOT NULL,
    "qualityId" UUID,
    "quantityDelta" DECIMAL(14,3) NOT NULL,
    "unitId" UUID NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Batch_businessId_idx" ON "Batch"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_businessId_reference_key" ON "Batch"("businessId", "reference");

-- CreateIndex
CREATE INDEX "MaterialReceipt_businessId_date_idx" ON "MaterialReceipt"("businessId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialReceipt_businessId_reference_key" ON "MaterialReceipt"("businessId", "reference");

-- CreateIndex
CREATE INDEX "InventoryMovement_businessId_batchId_idx" ON "InventoryMovement"("businessId", "batchId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_businessId_sourceKey_key" ON "InventoryMovement"("businessId", "sourceKey");

-- AddForeignKey
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

