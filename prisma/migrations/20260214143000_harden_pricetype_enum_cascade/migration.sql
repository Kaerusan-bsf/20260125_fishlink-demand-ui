DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PriceType') THEN
    CREATE TYPE "PriceType" AS ENUM ('FIXED', 'TIERED');
  END IF;
END$$;

ALTER TABLE "Listing" ADD COLUMN "priceType_new" "PriceType";

UPDATE "Listing"
SET "priceType_new" = CASE
  WHEN "priceType" = 'TIERED' THEN 'TIERED'::"PriceType"
  ELSE 'FIXED'::"PriceType"
END;

ALTER TABLE "Listing" ALTER COLUMN "priceType_new" SET NOT NULL;
ALTER TABLE "Listing" ALTER COLUMN "priceType_new" SET DEFAULT 'FIXED';

ALTER TABLE "Listing" DROP COLUMN "priceType";
ALTER TABLE "Listing" RENAME COLUMN "priceType_new" TO "priceType";

ALTER TABLE "ListingSizePriceTier" DROP CONSTRAINT IF EXISTS "ListingSizePriceTier_listingId_fkey";
ALTER TABLE "ListingSizePriceTier"
ADD CONSTRAINT "ListingSizePriceTier_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
