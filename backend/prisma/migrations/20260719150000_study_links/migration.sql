CREATE TABLE "StudySection" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudySection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudyLink" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudySection_userId_sortOrder_idx" ON "StudySection"("userId", "sortOrder");

CREATE INDEX "StudyLink_userId_sectionId_idx" ON "StudyLink"("userId", "sectionId");

CREATE INDEX "StudyLink_sectionId_sortOrder_idx" ON "StudyLink"("sectionId", "sortOrder");

ALTER TABLE "StudySection" ADD CONSTRAINT "StudySection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudyLink" ADD CONSTRAINT "StudyLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudyLink" ADD CONSTRAINT "StudyLink_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "StudySection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
