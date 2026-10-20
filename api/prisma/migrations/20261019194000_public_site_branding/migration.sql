-- AlterTable
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "publicSiteProducts" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "publicSiteMarkets" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "publicSitePrimaryColor" TEXT NOT NULL DEFAULT '#0b342b';
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "publicSiteAccentColor" TEXT NOT NULL DEFAULT '#b8923f';

-- Customers can activate their own site; admin can still revoke via publicSiteEnabled.
ALTER TABLE "Business" ALTER COLUMN "publicSiteEnabled" SET DEFAULT true;
UPDATE "Business" SET "publicSiteEnabled" = true WHERE "publicSiteEnabled" = false;
