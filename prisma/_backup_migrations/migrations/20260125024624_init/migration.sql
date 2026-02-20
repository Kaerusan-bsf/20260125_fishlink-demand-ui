-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "googleMapUrl" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "farmerId" TEXT NOT NULL,
    "fishType" TEXT NOT NULL,
    "basePricePerKg" REAL NOT NULL,
    "guttingAvailable" BOOLEAN NOT NULL,
    "guttingPricePerKg" REAL NOT NULL,
    "deliveryAvailable" BOOLEAN NOT NULL,
    "freeDeliveryMinKg" REAL,
    "minOrderKg" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "photoUrl" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Listing_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryFeeTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fee" REAL NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    CONSTRAINT "DeliveryFeeTier_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
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
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "titleKey" TEXT NOT NULL,
    "bodyKey" TEXT NOT NULL,
    "paramsJson" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_userId_key" ON "User"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
