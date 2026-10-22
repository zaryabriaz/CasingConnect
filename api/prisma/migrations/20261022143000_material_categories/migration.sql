-- Dynamic buying material categories (Roda / 18/UP / Quality + custom)

CREATE TABLE "MaterialCategory" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "requiresQuality" BOOLEAN NOT NULL DEFAULT false,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MaterialCategory_businessId_code_key" ON "MaterialCategory"("businessId", "code");
CREATE INDEX "MaterialCategory_businessId_active_idx" ON "MaterialCategory"("businessId", "active");

ALTER TABLE "MaterialCategory" ADD CONSTRAINT "MaterialCategory_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed system categories for every existing business
INSERT INTO "MaterialCategory" ("id", "businessId", "code", "name", "sortOrder", "active", "requiresQuality", "system", "createdAt", "updatedAt")
SELECT gen_random_uuid(), b."id", v.code, v.name, v."sortOrder", true, v."requiresQuality", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Business" b
CROSS JOIN (
  VALUES
    ('RODA', 'Roda', 1, false),
    ('EIGHTEEN_UP', '18/UP', 2, false),
    ('QUALITY', 'Quality', 3, true)
) AS v(code, name, "sortOrder", "requiresQuality");

ALTER TABLE "Batch" ADD COLUMN "materialCategoryId" UUID;
ALTER TABLE "MaterialReceipt" ADD COLUMN "materialCategoryId" UUID;
ALTER TABLE "StockOperationLine" ADD COLUMN "materialCategoryId" UUID;

UPDATE "Batch" b
SET "materialCategoryId" = c."id"
FROM "MaterialCategory" c
WHERE c."businessId" = b."businessId"
  AND c."code" = b."materialForm"::text;

UPDATE "MaterialReceipt" r
SET "materialCategoryId" = c."id"
FROM "MaterialCategory" c
WHERE c."businessId" = r."businessId"
  AND c."code" = r."materialForm"::text;

UPDATE "StockOperationLine" l
SET "materialCategoryId" = c."id"
FROM "StockOperation" o, "MaterialCategory" c
WHERE l."operationId" = o."id"
  AND c."businessId" = o."businessId"
  AND c."code" = l."materialForm"::text;

ALTER TABLE "Batch" ALTER COLUMN "materialCategoryId" SET NOT NULL;
ALTER TABLE "MaterialReceipt" ALTER COLUMN "materialCategoryId" SET NOT NULL;
ALTER TABLE "StockOperationLine" ALTER COLUMN "materialCategoryId" SET NOT NULL;

CREATE INDEX "Batch_materialCategoryId_idx" ON "Batch"("materialCategoryId");
CREATE INDEX "MaterialReceipt_materialCategoryId_idx" ON "MaterialReceipt"("materialCategoryId");
CREATE INDEX "StockOperationLine_materialCategoryId_idx" ON "StockOperationLine"("materialCategoryId");

ALTER TABLE "Batch" ADD CONSTRAINT "Batch_materialCategoryId_fkey"
  FOREIGN KEY ("materialCategoryId") REFERENCES "MaterialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_materialCategoryId_fkey"
  FOREIGN KEY ("materialCategoryId") REFERENCES "MaterialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockOperationLine" ADD CONSTRAINT "StockOperationLine_materialCategoryId_fkey"
  FOREIGN KEY ("materialCategoryId") REFERENCES "MaterialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
