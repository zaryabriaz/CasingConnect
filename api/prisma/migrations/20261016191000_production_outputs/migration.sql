-- CreateTable
CREATE TABLE "ProductionEntry" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOutputLine" (
    "id" UUID NOT NULL,
    "entryId" UUID NOT NULL,
    "qualityId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "ProductionOutputLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionEntry_businessId_date_idx" ON "ProductionEntry"("businessId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionEntry_businessId_date_personName_key" ON "ProductionEntry"("businessId", "date", "personName");

-- CreateIndex
CREATE INDEX "ProductionOutputLine_qualityId_idx" ON "ProductionOutputLine"("qualityId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOutputLine_entryId_qualityId_key" ON "ProductionOutputLine"("entryId", "qualityId");

-- AddForeignKey
ALTER TABLE "ProductionEntry" ADD CONSTRAINT "ProductionEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOutputLine" ADD CONSTRAINT "ProductionOutputLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ProductionEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOutputLine" ADD CONSTRAINT "ProductionOutputLine_qualityId_fkey" FOREIGN KEY ("qualityId") REFERENCES "Quality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
