-- CreateTable
CREATE TABLE "User" (
    "id" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "languageCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "reminderHour" INTEGER NOT NULL DEFAULT 9,
    "reminderMinute" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "defaultInterval" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "tabletsCount" DOUBLE PRECISION NOT NULL,
    "mgPerTablet" DOUBLE PRECISION NOT NULL,
    "intervalDays" INTEGER NOT NULL DEFAULT 2,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "lastTakenAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationIntake" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tabletsCount" DOUBLE PRECISION NOT NULL,
    "mgPerTablet" DOUBLE PRECISION NOT NULL,
    "totalMg" DOUBLE PRECISION NOT NULL,
    "note" TEXT,

    CONSTRAINT "MedicationIntake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "Medication_userId_active_idx" ON "Medication"("userId", "active");

-- CreateIndex
CREATE INDEX "Medication_nextDueAt_idx" ON "Medication"("nextDueAt");

-- CreateIndex
CREATE INDEX "MedicationIntake_userId_takenAt_idx" ON "MedicationIntake"("userId", "takenAt");

-- CreateIndex
CREATE INDEX "MedicationIntake_medicationId_takenAt_idx" ON "MedicationIntake"("medicationId", "takenAt");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationIntake" ADD CONSTRAINT "MedicationIntake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationIntake" ADD CONSTRAINT "MedicationIntake_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
