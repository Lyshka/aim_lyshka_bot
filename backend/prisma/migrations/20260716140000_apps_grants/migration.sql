-- CreateTable
CREATE TABLE "App" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT 'APP',
    "color" TEXT NOT NULL DEFAULT '#1f6f5b',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAppGrant" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "appId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAppGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "App_slug_key" ON "App"("slug");

-- CreateIndex
CREATE INDEX "UserAppGrant_userId_idx" ON "UserAppGrant"("userId");

-- CreateIndex
CREATE INDEX "UserAppGrant_appId_idx" ON "UserAppGrant"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAppGrant_userId_appId_key" ON "UserAppGrant"("userId", "appId");

-- AddForeignKey
ALTER TABLE "UserAppGrant" ADD CONSTRAINT "UserAppGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAppGrant" ADD CONSTRAINT "UserAppGrant_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
