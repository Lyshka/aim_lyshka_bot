DELETE FROM "CatPost";

DROP INDEX IF EXISTS "CatPost_deliveryDate_key";
DROP INDEX IF EXISTS "CatPost_imageKey_key";
DROP INDEX IF EXISTS "CatPost_textKey_key";
DROP INDEX IF EXISTS "CatPost_createdAt_idx";

ALTER TABLE "CatPost" ADD COLUMN "userId" BIGINT NOT NULL;
ALTER TABLE "CatPost" DROP COLUMN IF EXISTS "sentAt";

ALTER TABLE "CatPost"
  ADD CONSTRAINT "CatPost_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CatPost_userId_deliveryDate_key" ON "CatPost"("userId", "deliveryDate");
CREATE UNIQUE INDEX "CatPost_userId_imageKey_key" ON "CatPost"("userId", "imageKey");
CREATE UNIQUE INDEX "CatPost_userId_textKey_key" ON "CatPost"("userId", "textKey");
CREATE INDEX "CatPost_userId_createdAt_idx" ON "CatPost"("userId", "createdAt");
