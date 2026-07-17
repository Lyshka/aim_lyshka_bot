-- AlterTable
ALTER TABLE "SteamProfile" ADD COLUMN IF NOT EXISTS "lastInventorySyncAt" TIMESTAMP(3);
ALTER TABLE "SteamProfile" ADD COLUMN IF NOT EXISTS "inventoryHidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SteamInventoryItem" (
    "id" TEXT NOT NULL,
    "steamProfileId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "marketHashName" TEXT NOT NULL DEFAULT '',
    "iconUrl" TEXT NOT NULL DEFAULT '',
    "amount" INTEGER NOT NULL DEFAULT 1,
    "marketable" BOOLEAN NOT NULL DEFAULT false,
    "priceRub" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SteamInventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SteamMarketPrice" (
    "marketHashName" TEXT NOT NULL,
    "priceRub" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SteamMarketPrice_pkey" PRIMARY KEY ("marketHashName")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SteamInventoryItem_steamProfileId_assetId_key" ON "SteamInventoryItem"("steamProfileId", "assetId");
CREATE INDEX IF NOT EXISTS "SteamInventoryItem_steamProfileId_idx" ON "SteamInventoryItem"("steamProfileId");
CREATE INDEX IF NOT EXISTS "SteamInventoryItem_steamProfileId_marketable_idx" ON "SteamInventoryItem"("steamProfileId", "marketable");

ALTER TABLE "SteamInventoryItem" DROP CONSTRAINT IF EXISTS "SteamInventoryItem_steamProfileId_fkey";
ALTER TABLE "SteamInventoryItem"
  ADD CONSTRAINT "SteamInventoryItem_steamProfileId_fkey"
  FOREIGN KEY ("steamProfileId") REFERENCES "SteamProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
