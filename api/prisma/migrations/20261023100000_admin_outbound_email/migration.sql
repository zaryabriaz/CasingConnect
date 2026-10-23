-- CreateTable
CREATE TABLE "AdminOutboundEmail" (
    "id" UUID NOT NULL,
    "toEmails" TEXT[],
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "results" JSONB NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminOutboundEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminOutboundEmail_createdAt_idx" ON "AdminOutboundEmail"("createdAt");

-- CreateIndex
CREATE INDEX "AdminOutboundEmail_createdByUserId_idx" ON "AdminOutboundEmail"("createdByUserId");

-- AddForeignKey
ALTER TABLE "AdminOutboundEmail" ADD CONSTRAINT "AdminOutboundEmail_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
