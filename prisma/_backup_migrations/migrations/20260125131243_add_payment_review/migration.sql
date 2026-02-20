-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Review_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Review_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "quantityKg" REAL NOT NULL,
    "sizeRequestText" TEXT NOT NULL,
    "timeBand" TEXT NOT NULL,
    "timeDetail" TEXT,
    "memo" TEXT,
    "guttingRequested" BOOLEAN NOT NULL,
    "deliveryRequested" BOOLEAN NOT NULL,
    "restaurantPhoneSnap" TEXT NOT NULL,
    "restaurantMapSnap" TEXT NOT NULL,
    "farmerPhoneSnap" TEXT NOT NULL,
    "farmerMapSnap" TEXT NOT NULL,
    "handoffMapSnap" TEXT NOT NULL,
    "basePricePerKgSnap" REAL NOT NULL,
    "guttingPricePerKgSnap" REAL NOT NULL,
    "deliveryFeeFinal" REAL,
    "finalTotal" REAL,
    "rejectReason" TEXT,
    "rejectNote" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paidAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("basePricePerKgSnap", "createdAt", "deliveryFeeFinal", "deliveryRequested", "expiresAt", "farmerId", "farmerMapSnap", "farmerPhoneSnap", "finalTotal", "guttingPricePerKgSnap", "guttingRequested", "handoffMapSnap", "id", "listingId", "memo", "quantityKg", "rejectNote", "rejectReason", "restaurantId", "restaurantMapSnap", "restaurantPhoneSnap", "sizeRequestText", "status", "timeBand", "timeDetail") SELECT "basePricePerKgSnap", "createdAt", "deliveryFeeFinal", "deliveryRequested", "expiresAt", "farmerId", "farmerMapSnap", "farmerPhoneSnap", "finalTotal", "guttingPricePerKgSnap", "guttingRequested", "handoffMapSnap", "id", "listingId", "memo", "quantityKg", "rejectNote", "rejectReason", "restaurantId", "restaurantMapSnap", "restaurantPhoneSnap", "sizeRequestText", "status", "timeBand", "timeDetail" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderId_fromUserId_key" ON "Review"("orderId", "fromUserId");
