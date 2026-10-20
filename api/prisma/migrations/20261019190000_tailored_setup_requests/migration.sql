-- CreateEnum
CREATE TYPE "TailoredSetupRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- CreateTable
CREATE TABLE "TailoredSetupRequest" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "companyName" TEXT,
    "country" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "TailoredSetupRequestStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TailoredSetupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TailoredSetupRequest_status_idx" ON "TailoredSetupRequest"("status");

-- CreateIndex
CREATE INDEX "TailoredSetupRequest_createdAt_idx" ON "TailoredSetupRequest"("createdAt");
