-- New businesses need admin to enable Activate website.
ALTER TABLE "Business" ALTER COLUMN "publicSiteEnabled" SET DEFAULT false;
