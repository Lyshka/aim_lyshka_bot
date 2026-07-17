CREATE TABLE "SteamProfile" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "steamId" TEXT NOT NULL,
    "vanityUrl" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SteamProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SteamWishlistGame" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "owned" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SteamWishlistGame_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SteamProfile_userId_key" ON "SteamProfile"("userId");
CREATE INDEX "SteamProfile_steamId_idx" ON "SteamProfile"("steamId");

CREATE UNIQUE INDEX "SteamWishlistGame_userId_appId_key" ON "SteamWishlistGame"("userId", "appId");
CREATE INDEX "SteamWishlistGame_userId_owned_idx" ON "SteamWishlistGame"("userId", "owned");
CREATE INDEX "SteamWishlistGame_userId_priority_idx" ON "SteamWishlistGame"("userId", "priority");

ALTER TABLE "SteamProfile" ADD CONSTRAINT "SteamProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SteamWishlistGame" ADD CONSTRAINT "SteamWishlistGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
