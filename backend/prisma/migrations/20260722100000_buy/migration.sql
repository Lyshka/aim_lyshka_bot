CREATE TABLE "BuyList" (
    "id" TEXT NOT NULL,
    "ownerId" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "shareCode" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuyListMember" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyListMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuyListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "addedById" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "productUrl" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyListItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BuyList_shareCode_key" ON "BuyList"("shareCode");

CREATE INDEX "BuyList_ownerId_sortOrder_idx" ON "BuyList"("ownerId", "sortOrder");

CREATE UNIQUE INDEX "BuyListMember_listId_userId_key" ON "BuyListMember"("listId", "userId");

CREATE INDEX "BuyListMember_userId_idx" ON "BuyListMember"("userId");

CREATE INDEX "BuyListItem_listId_sortOrder_idx" ON "BuyListItem"("listId", "sortOrder");

CREATE INDEX "BuyListItem_listId_purchased_idx" ON "BuyListItem"("listId", "purchased");

ALTER TABLE "BuyList" ADD CONSTRAINT "BuyList_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuyListMember" ADD CONSTRAINT "BuyListMember_listId_fkey" FOREIGN KEY ("listId") REFERENCES "BuyList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuyListMember" ADD CONSTRAINT "BuyListMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuyListItem" ADD CONSTRAINT "BuyListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "BuyList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuyListItem" ADD CONSTRAINT "BuyListItem_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
