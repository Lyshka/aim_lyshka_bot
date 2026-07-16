-- CreateTable
CREATE TABLE "HealthDay" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "day" TEXT NOT NULL,
    "steps" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "muscleMassKg" DOUBLE PRECISION,
    "waterPercent" DOUBLE PRECISION,
    "boneMassKg" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthDay_userId_day_idx" ON "HealthDay"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "HealthDay_userId_day_key" ON "HealthDay"("userId", "day");

-- AddForeignKey
ALTER TABLE "HealthDay" ADD CONSTRAINT "HealthDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
