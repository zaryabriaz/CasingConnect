-- CreateTable
CREATE TABLE "Worker" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "StockOperationLine" ADD COLUMN "workerId" UUID;

-- AlterTable
ALTER TABLE "ProductionEntry" ADD COLUMN "workerId" UUID;

-- CreateIndex
CREATE INDEX "Worker_businessId_active_idx" ON "Worker"("businessId", "active");

-- CreateIndex
CREATE INDEX "Worker_businessId_name_idx" ON "Worker"("businessId", "name");

-- CreateIndex
CREATE INDEX "StockOperationLine_workerId_idx" ON "StockOperationLine"("workerId");

-- CreateIndex
CREATE INDEX "ProductionEntry_workerId_idx" ON "ProductionEntry"("workerId");

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOperationLine" ADD CONSTRAINT "StockOperationLine_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionEntry" ADD CONSTRAINT "ProductionEntry_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed workers from names already used on issues / production, then link them
INSERT INTO "Worker" ("id", "businessId", "name", "active", "createdAt", "updatedAt")
SELECT gen_random_uuid(), x."businessId", x.name, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT o."businessId", trim(l."personName") AS name
  FROM "StockOperationLine" l
  JOIN "StockOperation" o ON o.id = l."operationId"
  WHERE trim(l."personName") <> ''
  UNION
  SELECT DISTINCT pe."businessId", trim(pe."personName") AS name
  FROM "ProductionEntry" pe
  WHERE trim(pe."personName") <> ''
) x
WHERE NOT EXISTS (
  SELECT 1 FROM "Worker" w
  WHERE w."businessId" = x."businessId"
    AND lower(w.name) = lower(x.name)
);

UPDATE "StockOperationLine" l
SET "workerId" = w.id
FROM "StockOperation" o, "Worker" w
WHERE o.id = l."operationId"
  AND w."businessId" = o."businessId"
  AND lower(w.name) = lower(trim(l."personName"))
  AND l."workerId" IS NULL;

UPDATE "ProductionEntry" pe
SET "workerId" = w.id
FROM "Worker" w
WHERE w."businessId" = pe."businessId"
  AND lower(w.name) = lower(trim(pe."personName"))
  AND pe."workerId" IS NULL;
