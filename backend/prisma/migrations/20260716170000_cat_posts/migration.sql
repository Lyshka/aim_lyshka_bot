-- CreateTable
CREATE TABLE "CatPost" (
    "id" TEXT NOT NULL,
    "deliveryDate" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageKey" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "textKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatPost_deliveryDate_key" ON "CatPost"("deliveryDate");

-- CreateIndex
CREATE UNIQUE INDEX "CatPost_imageKey_key" ON "CatPost"("imageKey");

-- CreateIndex
CREATE UNIQUE INDEX "CatPost_textKey_key" ON "CatPost"("textKey");

-- CreateIndex
CREATE INDEX "CatPost_createdAt_idx" ON "CatPost"("createdAt");
