-- CreateEnum
CREATE TYPE "Destination" AS ENUM ('FACTORY', 'STORE');

-- CreateEnum
CREATE TYPE "PackageKind" AS ENUM ('BAG', 'DRUM');

-- AlterTable
ALTER TABLE "MaterialReceipt" ADD COLUMN     "destination" "Destination" NOT NULL DEFAULT 'FACTORY';

-- CreateTable
CREATE TABLE "MaterialPackage" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "receiptId" UUID NOT NULL,
    "kind" "PackageKind" NOT NULL,
    "packageNumber" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "MaterialPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialPackage_receiptId_idx" ON "MaterialPackage"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialPackage_businessId_kind_packageNumber_key" ON "MaterialPackage"("businessId", "kind", "packageNumber");

-- AddForeignKey
ALTER TABLE "MaterialPackage" ADD CONSTRAINT "MaterialPackage_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "MaterialReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPackage" ADD CONSTRAINT "MaterialPackage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

