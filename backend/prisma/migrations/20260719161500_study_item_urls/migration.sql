CREATE TABLE "StudyItem" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudyItemUrl" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyItemUrl_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudyItem_userId_sectionId_idx" ON "StudyItem"("userId", "sectionId");
CREATE INDEX "StudyItem_sectionId_sortOrder_idx" ON "StudyItem"("sectionId", "sortOrder");
CREATE INDEX "StudyItemUrl_itemId_sortOrder_idx" ON "StudyItemUrl"("itemId", "sortOrder");

ALTER TABLE "StudyItem" ADD CONSTRAINT "StudyItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyItem" ADD CONSTRAINT "StudyItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "StudySection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyItemUrl" ADD CONSTRAINT "StudyItemUrl_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StudyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "StudyItem" ("id", "userId", "sectionId", "title", "note", "sortOrder", "createdAt", "updatedAt")
SELECT "id", "userId", "sectionId", "title", "note", "sortOrder", "createdAt", "updatedAt"
FROM "StudyLink";

INSERT INTO "StudyItemUrl" ("id", "itemId", "url", "sortOrder", "createdAt")
SELECT "id" || '-url', "id", "url", 0, "createdAt"
FROM "StudyLink";

ALTER TABLE "StudyLink" DROP CONSTRAINT "StudyLink_userId_fkey";
ALTER TABLE "StudyLink" DROP CONSTRAINT "StudyLink_sectionId_fkey";
DROP INDEX IF EXISTS "StudyLink_userId_sectionId_idx";
DROP INDEX IF EXISTS "StudyLink_sectionId_sortOrder_idx";
DROP TABLE "StudyLink";
