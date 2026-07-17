-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('CUSTOMER', 'SELLER', 'ADMIN');

-- AlterTable
ALTER TABLE "shop_orders" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledBy" "CancelledBy";
