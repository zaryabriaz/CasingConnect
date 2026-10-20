-- Create users + WORKER memberships from the old Worker table (if present)
DO $$
DECLARE
  w RECORD;
  new_user_id UUID;
  new_membership_id UUID;
  email_slug TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Worker') THEN
    FOR w IN SELECT * FROM "Worker" LOOP
      email_slug := 'worker.' || replace(w.id::text, '-', '') || '@users.casingconnect.local';
      SELECT id INTO new_user_id FROM "User" WHERE email = email_slug;
      IF new_user_id IS NULL THEN
        new_user_id := gen_random_uuid();
        INSERT INTO "User" ("id", "name", "email", "passwordHash", "createdAt", "updatedAt")
        VALUES (
          new_user_id,
          w.name,
          email_slug,
          '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        );
      END IF;

      SELECT id INTO new_membership_id
      FROM "Membership"
      WHERE "businessId" = w."businessId" AND "userId" = new_user_id;

      IF new_membership_id IS NULL THEN
        new_membership_id := gen_random_uuid();
        INSERT INTO "Membership" ("id", "businessId", "userId", "role", "title", "active", "createdAt", "updatedAt")
        VALUES (
          new_membership_id,
          w."businessId",
          new_user_id,
          'WORKER',
          NULL,
          w.active,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        );
      ELSE
        UPDATE "Membership"
        SET role = 'WORKER', active = w.active, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = new_membership_id;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'StockOperationLine' AND column_name = 'workerId'
      ) THEN
        UPDATE "StockOperationLine" SET "membershipId" = new_membership_id WHERE "workerId" = w.id;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ProductionEntry' AND column_name = 'workerId'
      ) THEN
        UPDATE "ProductionEntry" SET "membershipId" = new_membership_id WHERE "workerId" = w.id;
      END IF;
    END LOOP;
  END IF;
END $$;

-- Also link any leftover name-only issue/production rows to WORKER memberships by name
UPDATE "StockOperationLine" l
SET "membershipId" = m.id
FROM "StockOperation" o
JOIN "Membership" m ON m."businessId" = o."businessId" AND m.role = 'WORKER'
JOIN "User" u ON u.id = m."userId"
WHERE o.id = l."operationId"
  AND l."membershipId" IS NULL
  AND lower(u.name) = lower(trim(l."personName"));

UPDATE "ProductionEntry" pe
SET "membershipId" = m.id
FROM "Membership" m
JOIN "User" u ON u.id = m."userId"
WHERE m."businessId" = pe."businessId"
  AND m.role = 'WORKER'
  AND pe."membershipId" IS NULL
  AND lower(u.name) = lower(trim(pe."personName"));

-- Drop old worker FKs/columns/table
ALTER TABLE "StockOperationLine" DROP CONSTRAINT IF EXISTS "StockOperationLine_workerId_fkey";
ALTER TABLE "ProductionEntry" DROP CONSTRAINT IF EXISTS "ProductionEntry_workerId_fkey";
DROP INDEX IF EXISTS "StockOperationLine_workerId_idx";
DROP INDEX IF EXISTS "ProductionEntry_workerId_idx";
ALTER TABLE "StockOperationLine" DROP COLUMN IF EXISTS "workerId";
ALTER TABLE "ProductionEntry" DROP COLUMN IF EXISTS "workerId";

DROP TABLE IF EXISTS "Worker";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Membership_businessId_role_active_idx" ON "Membership"("businessId", "role", "active");
CREATE INDEX IF NOT EXISTS "StockOperationLine_membershipId_idx" ON "StockOperationLine"("membershipId");
CREATE INDEX IF NOT EXISTS "ProductionEntry_membershipId_idx" ON "ProductionEntry"("membershipId");

-- AddForeignKey
ALTER TABLE "StockOperationLine" DROP CONSTRAINT IF EXISTS "StockOperationLine_membershipId_fkey";
ALTER TABLE "StockOperationLine" ADD CONSTRAINT "StockOperationLine_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductionEntry" DROP CONSTRAINT IF EXISTS "ProductionEntry_membershipId_fkey";
ALTER TABLE "ProductionEntry" ADD CONSTRAINT "ProductionEntry_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
