ALTER TABLE "UserSettings" ADD COLUMN "catsReminderHour" INTEGER NOT NULL DEFAULT 6;
ALTER TABLE "UserSettings" ADD COLUMN "catsReminderMinute" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserSettings" ADD COLUMN "catsReminderChangedOn" TEXT;
ALTER TABLE "UserSettings" ADD COLUMN "catsLastDeliveryDate" TEXT;
