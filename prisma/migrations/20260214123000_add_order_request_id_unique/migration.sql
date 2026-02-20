ALTER TABLE "Order" ADD COLUMN "requestId" TEXT;

UPDATE "Order"
SET "requestId" = 'legacy-' || "id"
WHERE "requestId" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "requestId" SET NOT NULL;

CREATE UNIQUE INDEX "Order_requestId_key" ON "Order"("requestId");
