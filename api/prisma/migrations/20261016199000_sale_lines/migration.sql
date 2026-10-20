-- CreateTable
CREATE TABLE "SaleLine" (
    "id" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "casingTypeId" UUID NOT NULL,
    "qualityId" UUID NOT NULL,
    "qualityText" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitId" UUID NOT NULL,
    "rate" DECIMAL(14,2),

    CONSTRAINT "SaleLine_pkey" PRIMARY KEY ("id")
);

-- Move existing single-line sales into SaleLine
INSERT INTO "SaleLine" ("id", "saleId", "casingTypeId", "qualityId", "qualityText", "quantity", "unitId", "rate")
SELECT gen_random_uuid(), "id", "casingTypeId", "qualityId", "qualityText", "quantity", "unitId", "rate"
FROM "Sale";

-- DropIndex
DROP INDEX IF EXISTS "Sale_businessId_qualityId_idx";

-- AlterTable
ALTER TABLE "Sale"
  DROP COLUMN "casingTypeId",
  DROP COLUMN "qualityId",
  DROP COLUMN "qualityText",
  DROP COLUMN "quantity",
  DROP COLUMN "unitId",
  DROP COLUMN "rate";

-- CreateIndex
CREATE INDEX "SaleLine_saleId_idx" ON "SaleLine"("saleId");
CREATE INDEX "SaleLine_qualityId_idx" ON "SaleLine"("qualityId");

-- AddForeignKey
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
