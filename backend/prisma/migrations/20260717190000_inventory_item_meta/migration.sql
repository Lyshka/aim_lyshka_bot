ALTER TABLE "SteamInventoryItem" ADD COLUMN IF NOT EXISTS "typeLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SteamInventoryItem" ADD COLUMN IF NOT EXISTS "rarity" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SteamInventoryItem" ADD COLUMN IF NOT EXISTS "exterior" TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "SteamInventoryItem_steamProfileId_typeLabel_idx"
  ON "SteamInventoryItem"("steamProfileId", "typeLabel");
