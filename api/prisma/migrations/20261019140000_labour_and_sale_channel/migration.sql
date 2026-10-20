-- AlterTable
ALTER TABLE "MaterialConversion" ADD COLUMN "labourRate" DECIMAL(14,2),
ADD COLUMN "labourAmount" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "DailyExpense" ADD COLUMN "membershipId" UUID;

-- CreateIndex
CREATE INDEX "DailyExpense_membershipId_idx" ON "DailyExpense"("membershipId");

-- AddForeignKey
ALTER TABLE "DailyExpense" ADD CONSTRAINT "DailyExpense_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "SaleChannel" AS ENUM ('LOCAL', 'EXPORT');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "channel" "SaleChannel" NOT NULL DEFAULT 'LOCAL',
ADD COLUMN "destinationCountry" TEXT,
ADD COLUMN "exportRef" TEXT;

-- CreateIndex
CREATE INDEX "Sale_businessId_channel_idx" ON "Sale"("businessId", "channel");
