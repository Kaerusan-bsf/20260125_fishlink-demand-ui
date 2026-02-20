ALTER TABLE "Listing" ADD COLUMN "requestId" TEXT;

UPDATE "Listing"
SET "requestId" = 'legacy-' || "id"
WHERE "requestId" IS NULL;

ALTER TABLE "Listing" ALTER COLUMN "requestId" SET NOT NULL;

CREATE UNIQUE INDEX "Listing_requestId_key" ON "Listing"("requestId");
