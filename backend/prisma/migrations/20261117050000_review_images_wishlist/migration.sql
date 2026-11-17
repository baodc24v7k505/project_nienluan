CREATE TABLE "review_images" (
    "reviewId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "review_images_pkey" PRIMARY KEY ("reviewId", "assetId")
);
CREATE INDEX "review_images_assetId_idx" ON "review_images"("assetId");
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "wishlist_items" (
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("userId", "productId")
);
CREATE INDEX "wishlist_items_userId_createdAt_idx" ON "wishlist_items"("userId", "createdAt");
CREATE INDEX "wishlist_items_productId_idx" ON "wishlist_items"("productId");
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
