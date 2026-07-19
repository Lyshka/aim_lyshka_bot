ALTER TABLE "StudySection" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "StudyItem" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "StudyItemUrl" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "StudySection_userId_deletedAt_idx" ON "StudySection"("userId", "deletedAt");
CREATE INDEX "StudyItem_userId_deletedAt_idx" ON "StudyItem"("userId", "deletedAt");
CREATE INDEX "StudyItemUrl_itemId_deletedAt_idx" ON "StudyItemUrl"("itemId", "deletedAt");
