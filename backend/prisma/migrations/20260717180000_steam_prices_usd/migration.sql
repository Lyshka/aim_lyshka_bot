ALTER TABLE "SteamInventoryItem" RENAME COLUMN "priceRub" TO "priceUsd";
ALTER TABLE "SteamMarketPrice" RENAME COLUMN "priceRub" TO "priceUsd";
DELETE FROM "SteamMarketPrice";
UPDATE "SteamInventoryItem" SET "priceUsd" = NULL;
