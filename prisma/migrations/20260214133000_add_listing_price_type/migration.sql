ALTER TABLE "Listing"
ADD COLUMN "priceType" TEXT NOT NULL DEFAULT 'FIXED',
ADD COLUMN "fixedPriceKhrPerKg" INTEGER;

UPDATE "Listing"
SET "fixedPriceKhrPerKg" = ROUND("basePricePerKg")::INTEGER
WHERE "fixedPriceKhrPerKg" IS NULL;

CREATE TABLE "ListingSizePriceTier" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "minHeadPerKg" INTEGER NOT NULL,
  "maxHeadPerKg" INTEGER NOT NULL,
  "priceKhrPerKg" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "ListingSizePriceTier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ListingSizePriceTier_listingId_sortOrder_key"
ON "ListingSizePriceTier"("listingId", "sortOrder");

ALTER TABLE "ListingSizePriceTier"
ADD CONSTRAINT "ListingSizePriceTier_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
