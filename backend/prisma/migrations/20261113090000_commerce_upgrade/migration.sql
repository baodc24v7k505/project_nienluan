-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';

-- DropIndex
DROP INDEX "cart_items_userId_productId_key";

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "variantId" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "checkoutKey" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "shop_orders" ADD COLUMN     "carrier" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "shippingFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "trackingCode" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "skuSnapshot" TEXT,
ADD COLUMN     "variantId" TEXT,
ADD COLUMN     "variantSnapshot" TEXT;

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "shopOrderId" TEXT NOT NULL,
    "status" "ShopOrderStatus" NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_requests" (
    "id" TEXT NOT NULL,
    "shopOrderId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceUrls" TEXT[],
    "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "shopOrderId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "providerOrderId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payUrl" TEXT,
    "resultCode" TEXT,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- Preserve existing catalogue, carts and order snapshots with one default SKU.
INSERT INTO "product_variants" ("id", "productId", "sku", "name", "price", "stock")
SELECT 'legacy-' || "id", "id", 'DEFAULT', 'Mặc định', "price", "stock" FROM "products";
UPDATE "cart_items" SET "variantId" = 'legacy-' || "productId";
ALTER TABLE "cart_items" ALTER COLUMN "variantId" SET NOT NULL;
UPDATE "order_items" SET "variantId" = 'legacy-' || "productId", "variantSnapshot" = 'Mặc định', "skuSnapshot" = 'DEFAULT';

-- Allocate the old order discount deterministically, preserving the exact total.
WITH eligible AS (
 SELECT s."id", s."orderId", s."subtotal", o."discountAmount",
   CASE WHEN v."scope" = 'SHOP' AND v."shopId" <> s."shopId" THEN 0 ELSE s."subtotal" END AS base
 FROM "shop_orders" s JOIN "orders" o ON o."id" = s."orderId"
 LEFT JOIN "vouchers" v ON v."code" = o."voucherCode"
), portions AS (
 SELECT *, SUM(base) OVER (PARTITION BY "orderId") AS total,
 SUM(base) OVER (PARTITION BY "orderId" ORDER BY "id") AS cumulative FROM eligible
)
UPDATE "shop_orders" s SET "discountAmount" = CASE WHEN p.total > 0 THEN
 ROUND(p."discountAmount" * p.cumulative / p.total) - ROUND(p."discountAmount" * (p.cumulative - p.base) / p.total) ELSE 0 END
FROM portions p WHERE s."id" = p."id";
UPDATE "shop_orders" SET "totalAmount" = "subtotal" - "discountAmount";
UPDATE "shop_orders" s SET "paidAmount" = s."totalAmount" FROM "orders" o WHERE o."id" = s."orderId" AND o."paymentStatus" = 'PAID';
UPDATE "shop_orders" SET "deliveredAt" = "updatedAt" WHERE "status" = 'DELIVERED';
INSERT INTO "order_status_history" ("id", "shopOrderId", "status", "note", "createdAt")
SELECT 'legacy-' || "id", "id", "status", 'Chuyển đổi từ phiên bản niên luận', "updatedAt" FROM "shop_orders";
UPDATE "orders" SET "expiresAt" = "createdAt" + INTERVAL '30 minutes' WHERE "paymentMethod" = 'MOMO' AND "paymentStatus" <> 'PAID';
ALTER TABLE "product_variants" ADD CONSTRAINT "variant_stock_nonnegative" CHECK ("stock" >= 0) NOT VALID;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_quantity_positive" CHECK ("quantity" > 0) NOT VALID;

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_productId_sku_key" ON "product_variants"("productId", "sku");

-- CreateIndex
CREATE INDEX "order_status_history_shopOrderId_createdAt_idx" ON "order_status_history"("shopOrderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "return_requests_shopOrderId_key" ON "return_requests"("shopOrderId");

-- CreateIndex
CREATE INDEX "refunds_orderId_idx" ON "refunds"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_providerOrderId_key" ON "payment_attempts"("providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_requestId_key" ON "payment_attempts"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_transactionId_key" ON "payment_attempts"("transactionId");

-- CreateIndex
CREATE INDEX "payment_attempts_orderId_idx" ON "payment_attempts"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_userId_variantId_key" ON "cart_items"("userId", "variantId");

-- CreateIndex
CREATE INDEX "orders_expiresAt_paymentStatus_idx" ON "orders"("expiresAt", "paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "orders_customerId_checkoutKey_key" ON "orders"("customerId", "checkoutKey");

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_shopOrderId_fkey" FOREIGN KEY ("shopOrderId") REFERENCES "shop_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_shopOrderId_fkey" FOREIGN KEY ("shopOrderId") REFERENCES "shop_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_shopOrderId_fkey" FOREIGN KEY ("shopOrderId") REFERENCES "shop_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
