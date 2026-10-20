-- AlterTable: scope production entries to a casing type (sheep, beef, or any other)
ALTER TABLE "ProductionEntry" ADD COLUMN "casingTypeId" UUID;

-- Backfill existing rows to the business's SHEEP type (or first casing type)
UPDATE "ProductionEntry" pe
SET "casingTypeId" = ct.id
FROM "CasingType" ct
WHERE ct."businessId" = pe."businessId"
  AND ct.code = 'SHEEP';

UPDATE "ProductionEntry" pe
SET "casingTypeId" = ct.id
FROM (
  SELECT DISTINCT ON ("businessId") id, "businessId"
  FROM "CasingType"
  ORDER BY "businessId", "createdAt" ASC
) ct
WHERE pe."casingTypeId" IS NULL
  AND ct."businessId" = pe."businessId";

DELETE FROM "ProductionEntry" WHERE "casingTypeId" IS NULL;

ALTER TABLE "ProductionEntry" ALTER COLUMN "casingTypeId" SET NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "ProductionEntry_businessId_date_personName_key";

-- DropIndex
DROP INDEX IF EXISTS "ProductionEntry_businessId_date_idx";

-- CreateIndex
CREATE INDEX "ProductionEntry_businessId_date_casingTypeId_idx" ON "ProductionEntry"("businessId", "date", "casingTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionEntry_businessId_date_personName_casingTypeId_key" ON "ProductionEntry"("businessId", "date", "personName", "casingTypeId");

-- AddForeignKey
ALTER TABLE "ProductionEntry" ADD CONSTRAINT "ProductionEntry_casingTypeId_fkey" FOREIGN KEY ("casingTypeId") REFERENCES "CasingType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
