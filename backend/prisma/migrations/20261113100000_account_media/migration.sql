ALTER TABLE "users" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "media_assets" (
 "id" TEXT PRIMARY KEY,
 "ownerId" TEXT NOT NULL,
 "mimeType" TEXT NOT NULL,
 "data" BYTEA NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "media_assets_ownerId_idx" ON "media_assets"("ownerId");
