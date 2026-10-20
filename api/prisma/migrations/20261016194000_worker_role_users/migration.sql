-- AlterEnum (must commit before the value can be used in later statements)
DO $$ BEGIN
  ALTER TYPE "MemberRole" ADD VALUE 'WORKER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: add membership links
ALTER TABLE "StockOperationLine" ADD COLUMN IF NOT EXISTS "membershipId" UUID;
ALTER TABLE "ProductionEntry" ADD COLUMN IF NOT EXISTS "membershipId" UUID;
