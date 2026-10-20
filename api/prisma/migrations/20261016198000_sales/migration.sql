-- CreateTable
CREATE TABLE "Sale" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "partnerId" UUID NOT NULL,
    "casingTypeId" UUID NOT NULL,
    "qualityId" UUID NOT NULL,
    "qualityText" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitId" UUID NOT NULL,
    "rate" DECIMAL(14,2),
    "currency" TEXT NOT NULL,
    "notes" TEXT,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CASH',
    "cashPaidTo" TEXT,
    "creditInstrument" "CreditInstrument" NOT NULL DEFAULT 'NONE',
    "chequeNumber" TEXT,
    "bankName" TEXT,
    "instrumentNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sale_businessId_reference_key" ON "Sale"("businessId", "reference");

-- CreateIndex
CREATE INDEX "Sale_businessId_date_idx" ON "Sale"("businessId", "date");

-- CreateIndex
CREATE INDEX "Sale_businessId_qualityId_idx" ON "Sale"("businessId", "qualityId");

-- CreateIndex
CREATE INDEX "Sale_businessId_paymentMode_idx" ON "Sale"("businessId", "paymentMode");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
