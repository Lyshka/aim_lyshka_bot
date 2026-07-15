-- AlterTable
ALTER TABLE "MedicationIntake" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "MedicationIntake_userId_deletedAt_idx" ON "MedicationIntake"("userId", "deletedAt");
