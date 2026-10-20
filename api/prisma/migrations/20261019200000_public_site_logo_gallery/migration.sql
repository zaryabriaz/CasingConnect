-- AlterTable
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "publicSiteLogoUrl" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "publicSiteGallery" TEXT[] DEFAULT ARRAY[]::TEXT[];
