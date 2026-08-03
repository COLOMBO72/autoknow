-- CreateTable
CREATE TABLE "AiCallLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiCallLog_createdAt_idx" ON "AiCallLog"("createdAt");

-- CreateIndex
CREATE INDEX "AiCallLog_provider_success_idx" ON "AiCallLog"("provider", "success");
