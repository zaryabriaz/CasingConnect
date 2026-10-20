-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'CREDIT');

-- CreateEnum
CREATE TYPE "CreditInstrument" AS ENUM ('NONE', 'CHEQUE', 'OTHER');

-- AlterTable
ALTER TABLE "MaterialReceipt"
  ADD COLUMN "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CASH',
  ADD COLUMN "cashPaidTo" TEXT,
  ADD COLUMN "creditInstrument" "CreditInstrument" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "chequeNumber" TEXT,
  ADD COLUMN "bankName" TEXT,
  ADD COLUMN "instrumentNote" TEXT;

-- CreateIndex
CREATE INDEX "MaterialReceipt_businessId_paymentMode_idx" ON "MaterialReceipt"("businessId", "paymentMode");
