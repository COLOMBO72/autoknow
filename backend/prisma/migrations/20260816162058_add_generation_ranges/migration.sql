-- CreateTable
CREATE TABLE "CarGenerationRange" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "yearFrom" INTEGER NOT NULL,
    "yearTo" INTEGER NOT NULL,
    "canonicalCarVariantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarGenerationRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarGenerationRange_brand_model_idx" ON "CarGenerationRange"("brand", "model");
