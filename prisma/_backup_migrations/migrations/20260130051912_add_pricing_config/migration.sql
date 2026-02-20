-- AlterTable
ALTER TABLE "Order" ADD COLUMN "alphaRateSnap" REAL;
ALTER TABLE "Order" ADD COLUMN "betaDiscountRateSnap" REAL;
ALTER TABLE "Order" ADD COLUMN "betaDiscountSnap" REAL;
ALTER TABLE "Order" ADD COLUMN "betaFeeSnap" REAL;
ALTER TABLE "Order" ADD COLUMN "betaRateSnap" REAL;
ALTER TABLE "Order" ADD COLUMN "displayUnitPriceSnap" REAL;
ALTER TABLE "Order" ADD COLUMN "fishSubtotalSnap" REAL;
ALTER TABLE "Order" ADD COLUMN "pricingVersionSnap" TEXT;

-- CreateTable
CREATE TABLE "PricingConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pricingVersion" TEXT NOT NULL,
    "alphaRate" REAL NOT NULL,
    "betaRate" REAL NOT NULL,
    "betaDiscountRate" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingConfig_pricingVersion_key" ON "PricingConfig"("pricingVersion");
