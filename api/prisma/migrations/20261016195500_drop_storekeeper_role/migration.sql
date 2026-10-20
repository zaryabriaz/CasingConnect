-- Move any storekeepers onto Staff, then drop the enum value
UPDATE "Membership" SET role = 'STAFF' WHERE role = 'STOREKEEPER';

ALTER TYPE "MemberRole" RENAME TO "MemberRole_old";

CREATE TYPE "MemberRole" AS ENUM (
  'OWNER',
  'MANAGER',
  'ACCOUNTANT',
  'SUPERVISOR',
  'SALES',
  'STAFF',
  'WORKER'
);

ALTER TABLE "Membership"
  ALTER COLUMN "role" TYPE "MemberRole"
  USING ("role"::text::"MemberRole");

DROP TYPE "MemberRole_old";
