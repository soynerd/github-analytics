-- CreateTable
CREATE TABLE "SecurityScan" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityScan_owner_repository_idx" ON "SecurityScan"("owner", "repository");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityScan_owner_repository_commitSha_key" ON "SecurityScan"("owner", "repository", "commitSha");
