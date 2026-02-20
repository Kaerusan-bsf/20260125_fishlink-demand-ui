-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "googleMapUrl" TEXT NOT NULL,
    "province" TEXT,
    "district" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "fishType" TEXT NOT NULL,
    "basePricePerKg" DOUBLE PRECISION NOT NULL,
    "guttingAvailable" BOOLEAN NOT NULL,
    "guttingPricePerKg" DOUBLE PRECISION NOT NULL,
    "deliveryAvailable" BOOLEAN NOT NULL,
    "freeDeliveryMinKg" DOUBLE PRECISION,
    "minOrderKg" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "photoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryFeeTier" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "DeliveryFeeTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "quantityKg" DOUBLE PRECISION NOT NULL,
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
    "basePricePerKgSnap" DOUBLE PRECISION NOT NULL,
    "guttingPricePerKgSnap" DOUBLE PRECISION NOT NULL,
    "pricingVersionSnap" TEXT,
    "alphaRateSnap" DOUBLE PRECISION,
    "betaRateSnap" DOUBLE PRECISION,
    "betaDiscountRateSnap" DOUBLE PRECISION,
    "displayUnitPriceSnap" DOUBLE PRECISION,
    "fishSubtotalSnap" DOUBLE PRECISION,
    "betaFeeSnap" DOUBLE PRECISION,
    "betaDiscountSnap" DOUBLE PRECISION,
    "deliveryFeeFinal" DOUBLE PRECISION,
    "finalTotal" DOUBLE PRECISION,
    "rejectReason" TEXT,
    "rejectNote" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),
    "requestedDate" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "titleKey" TEXT NOT NULL,
    "bodyKey" TEXT NOT NULL,
    "paramsJson" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingConfig" (
    "id" TEXT NOT NULL,
    "pricingVersion" TEXT NOT NULL,
    "alphaRate" DOUBLE PRECISION NOT NULL,
    "betaRate" DOUBLE PRECISION NOT NULL,
    "betaDiscountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_userId_key" ON "User"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingConfig_pricingVersion_key" ON "PricingConfig"("pricingVersion");

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderId_fromUserId_key" ON "Review"("orderId", "fromUserId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryFeeTier" ADD CONSTRAINT "DeliveryFeeTier_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
