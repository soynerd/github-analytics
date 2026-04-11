-- CreateTable
CREATE TABLE "AnalyticsCache" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsCache_username_key" ON "AnalyticsCache"("username");

-- CreateIndex
CREATE INDEX "AnalyticsCache_expiresAt_idx" ON "AnalyticsCache"("expiresAt");
