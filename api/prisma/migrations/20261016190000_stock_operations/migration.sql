-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('IN_STORE', 'IN_FACTORY', 'ISSUED');

-- CreateEnum
CREATE TYPE "StockOpType" AS ENUM ('STORE_TO_FACTORY', 'ISSUE_TO_PERSON');

-- AlterTable
ALTER TABLE "MaterialPackage" ADD COLUMN "status" "PackageStatus" NOT NULL DEFAULT 'IN_STORE',
ADD COLUMN "issuedTo" TEXT;

-- CreateTable
CREATE TABLE "StockOperation" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" "StockOpType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockOperationLine" (
    "id" UUID NOT NULL,
    "operationId" UUID NOT NULL,
    "personName" TEXT NOT NULL,
    "materialForm" "IncomingMaterial" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "StockOperationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockOperationPackage" (
    "id" UUID NOT NULL,
    "operationId" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "StockOperationPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialPackage_businessId_status_idx" ON "MaterialPackage"("businessId", "status");

-- CreateIndex
CREATE INDEX "StockOperation_businessId_date_idx" ON "StockOperation"("businessId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StockOperation_businessId_reference_key" ON "StockOperation"("businessId", "reference");

-- CreateIndex
CREATE INDEX "StockOperationLine_operationId_idx" ON "StockOperationLine"("operationId");

-- CreateIndex
CREATE INDEX "StockOperationPackage_packageId_idx" ON "StockOperationPackage"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "StockOperationPackage_operationId_packageId_key" ON "StockOperationPackage"("operationId", "packageId");

-- AddForeignKey
ALTER TABLE "StockOperation" ADD CONSTRAINT "StockOperation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOperationLine" ADD CONSTRAINT "StockOperationLine_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "StockOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOperationPackage" ADD CONSTRAINT "StockOperationPackage_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "StockOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOperationPackage" ADD CONSTRAINT "StockOperationPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "MaterialPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
