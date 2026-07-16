-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "notificationsMutedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserSettings" ALTER COLUMN "reminderHour" SET DEFAULT 12;
