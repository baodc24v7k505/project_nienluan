CREATE INDEX "shop_orders_shopId_createdAt_idx" ON "shop_orders"("shopId", "createdAt");
CREATE INDEX "shop_orders_deliveredAt_idx" ON "shop_orders"("deliveredAt");
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");
CREATE INDEX "refunds_completedAt_idx" ON "refunds"("completedAt");
CREATE UNIQUE INDEX "refunds_shopOrderId_key" ON "refunds"("shopOrderId");
-- Old paid orders cancelled before this release also need an explicit refund queue.
INSERT INTO "refunds" ("id", "orderId", "shopOrderId", "amount", "reason")
SELECT 'legacy-refund-' || s."id", s."orderId", s."id", s."paidAmount", 'Đơn đã hủy/trả hàng trước nâng cấp; cần đối chiếu khoản hoàn'
FROM "shop_orders" s WHERE s."status" IN ('CANCELLED', 'RETURNED') AND s."paidAmount" > 0
AND NOT EXISTS (SELECT 1 FROM "refunds" r WHERE r."shopOrderId" = s."id");
