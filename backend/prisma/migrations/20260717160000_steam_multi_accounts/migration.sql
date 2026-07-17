ALTER TABLE "SteamProfile" DROP CONSTRAINT IF EXISTS "SteamProfile_userId_key";
DROP INDEX IF EXISTS "SteamProfile_userId_key";

ALTER TABLE "SteamProfile" ADD COLUMN IF NOT EXISTS "personaName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SteamProfile" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SteamProfile" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT false;

UPDATE "SteamProfile" SET "active" = false;
UPDATE "SteamProfile" p
SET "active" = true
FROM (
  SELECT DISTINCT ON ("userId") "id"
  FROM "SteamProfile"
  ORDER BY "userId", "createdAt" ASC
) s
WHERE p."id" = s."id";

CREATE UNIQUE INDEX IF NOT EXISTS "SteamProfile_userId_steamId_key" ON "SteamProfile"("userId", "steamId");
CREATE INDEX IF NOT EXISTS "SteamProfile_userId_idx" ON "SteamProfile"("userId");
CREATE INDEX IF NOT EXISTS "SteamProfile_userId_active_idx" ON "SteamProfile"("userId", "active");

ALTER TABLE "SteamWishlistGame" ADD COLUMN IF NOT EXISTS "steamProfileId" TEXT;

UPDATE "SteamWishlistGame" g
SET "steamProfileId" = p."id"
FROM "SteamProfile" p
WHERE g."userId" = p."userId"
  AND g."steamProfileId" IS NULL;

DELETE FROM "SteamWishlistGame" WHERE "steamProfileId" IS NULL;

ALTER TABLE "SteamWishlistGame" ALTER COLUMN "steamProfileId" SET NOT NULL;

DROP INDEX IF EXISTS "SteamWishlistGame_userId_appId_key";
DROP INDEX IF EXISTS "SteamWishlistGame_userId_priority_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "SteamWishlistGame_steamProfileId_appId_key" ON "SteamWishlistGame"("steamProfileId", "appId");
CREATE INDEX IF NOT EXISTS "SteamWishlistGame_steamProfileId_owned_idx" ON "SteamWishlistGame"("steamProfileId", "owned");
CREATE INDEX IF NOT EXISTS "SteamWishlistGame_steamProfileId_priority_idx" ON "SteamWishlistGame"("steamProfileId", "priority");

ALTER TABLE "SteamWishlistGame" DROP CONSTRAINT IF EXISTS "SteamWishlistGame_steamProfileId_fkey";
ALTER TABLE "SteamWishlistGame"
  ADD CONSTRAINT "SteamWishlistGame_steamProfileId_fkey"
  FOREIGN KEY ("steamProfileId") REFERENCES "SteamProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
