ALTER TABLE "advertisements"
ADD COLUMN "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN "deletionReason" TEXT,
ADD COLUMN "deletionReviewNote" TEXT,
ADD COLUMN "deletedAt" TIMESTAMP(3);
