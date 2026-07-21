DROP TABLE IF EXISTS "HealthDay";

ALTER TABLE "UserSettings" DROP COLUMN IF EXISTS "birthDate";

UPDATE "App" SET "active" = false WHERE "slug" = 'health';
