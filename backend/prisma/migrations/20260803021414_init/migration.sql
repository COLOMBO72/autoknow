-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('INCORRECT_DATA', 'SUGGESTION', 'SUPPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TOPUP', 'REPORT_PURCHASE', 'COMPARISON_PURCHASE', 'REFUND');

-- CreateEnum
CREATE TYPE "ReportBlockType" AS ENUM ('SPECS', 'PROBLEMS', 'COSTS', 'INSURANCE', 'PRICE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "passwordResetTokenHash" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "balanceKopeks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "carVariantId" TEXT,
    "type" "FeedbackType" NOT NULL,
    "message" TEXT NOT NULL,
    "contactInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amountKopeks" INTEGER NOT NULL,
    "provider" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarCatalogEntry" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "knownGenerations" JSONB NOT NULL DEFAULT '[]',
    "knownEngines" JSONB NOT NULL DEFAULT '[]',
    "knownBodyTypes" JSONB NOT NULL DEFAULT '[]',
    "minYearSeen" INTEGER,
    "maxYearSeen" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarCatalogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarVariant" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "generation" TEXT,
    "yearFrom" INTEGER NOT NULL,
    "yearTo" INTEGER,
    "engine" TEXT,
    "bodyType" TEXT,

    CONSTRAINT "CarVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarReportBlock" (
    "id" TEXT NOT NULL,
    "carVariantId" TEXT NOT NULL,
    "type" "ReportBlockType" NOT NULL,
    "content" JSONB NOT NULL,
    "sources" JSONB,
    "aiModel" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CarReportBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasedReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "carVariantId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchasedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comparison" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "carVariantIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comparison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_externalId_idx" ON "Transaction"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "CarCatalogEntry_brand_model_key" ON "CarCatalogEntry"("brand", "model");

-- CreateIndex
CREATE INDEX "CarVariant_brand_model_idx" ON "CarVariant"("brand", "model");

-- CreateIndex
CREATE UNIQUE INDEX "CarVariant_brand_model_generation_yearFrom_yearTo_engine_bo_key" ON "CarVariant"("brand", "model", "generation", "yearFrom", "yearTo", "engine", "bodyType");

-- CreateIndex
CREATE INDEX "CarReportBlock_expiresAt_idx" ON "CarReportBlock"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CarReportBlock_carVariantId_type_key" ON "CarReportBlock"("carVariantId", "type");

-- CreateIndex
CREATE INDEX "PurchasedReport_userId_idx" ON "PurchasedReport"("userId");

-- CreateIndex
CREATE INDEX "Comparison_userId_idx" ON "Comparison"("userId");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarReportBlock" ADD CONSTRAINT "CarReportBlock_carVariantId_fkey" FOREIGN KEY ("carVariantId") REFERENCES "CarVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasedReport" ADD CONSTRAINT "PurchasedReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasedReport" ADD CONSTRAINT "PurchasedReport_carVariantId_fkey" FOREIGN KEY ("carVariantId") REFERENCES "CarVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comparison" ADD CONSTRAINT "Comparison_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
