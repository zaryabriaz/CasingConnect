-- CreateTable
CREATE TABLE "DailyExpense" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "particulars" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidTo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyExpense_businessId_date_idx" ON "DailyExpense"("businessId", "date");

-- AddForeignKey
ALTER TABLE "DailyExpense" ADD CONSTRAINT "DailyExpense_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
