-- AlterTable
ALTER TABLE "Business" ADD COLUMN "exportLetterheadUrl" TEXT;

-- CreateEnum
CREATE TYPE "ExportDocumentType" AS ENUM ('COMMERCIAL_INVOICE', 'PACKING_LIST');

-- CreateTable
CREATE TABLE "ExportDocument" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "type" "ExportDocumentType" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "title" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerAddress" TEXT,
    "documentDate" DATE NOT NULL,
    "payload" JSONB NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "createdByMembershipId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExportDocument_businessId_createdAt_idx" ON "ExportDocument"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "ExportDocument_businessId_type_idx" ON "ExportDocument"("businessId", "type");

-- AddForeignKey
ALTER TABLE "ExportDocument" ADD CONSTRAINT "ExportDocument_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportDocument" ADD CONSTRAINT "ExportDocument_createdByMembershipId_fkey" FOREIGN KEY ("createdByMembershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
