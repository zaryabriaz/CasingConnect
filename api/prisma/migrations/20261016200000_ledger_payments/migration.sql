-- CreateEnum
CREATE TYPE "LedgerPaymentDirection" AS ENUM ('RECEIVED', 'PAID');

-- CreateTable
CREATE TABLE "LedgerPayment" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "direction" "LedgerPaymentDirection" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "method" "CreditInstrument" NOT NULL DEFAULT 'NONE',
    "cashPaidTo" TEXT,
    "chequeNumber" TEXT,
    "bankName" TEXT,
    "instrumentNote" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LedgerPayment_businessId_reference_key" ON "LedgerPayment"("businessId", "reference");

-- CreateIndex
CREATE INDEX "LedgerPayment_businessId_partnerId_date_idx" ON "LedgerPayment"("businessId", "partnerId", "date");

-- CreateIndex
CREATE INDEX "LedgerPayment_partnerId_idx" ON "LedgerPayment"("partnerId");

-- AddForeignKey
ALTER TABLE "LedgerPayment" ADD CONSTRAINT "LedgerPayment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerPayment" ADD CONSTRAINT "LedgerPayment_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
