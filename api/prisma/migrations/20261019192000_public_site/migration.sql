-- AlterTable
ALTER TABLE "Business" ADD COLUMN "publicSiteEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN "publicSitePublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN "publicSiteTagline" TEXT;
ALTER TABLE "Business" ADD COLUMN "publicSiteHeadline" TEXT;
ALTER TABLE "Business" ADD COLUMN "publicSiteAbout" TEXT;
