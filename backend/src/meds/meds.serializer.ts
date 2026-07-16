import { calendarDaysUntil } from '../common/calendar';

function serializeMedication(
  med: {
    id: string;
    userId: bigint;
    name: string;
    tabletsCount: number;
    mgPerTablet: number;
    intervalDays: number;
    instructions: string;
    active: boolean;
    nextDueAt: Date;
    lastTakenAt: Date | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  },
  timeZone = 'Europe/Moscow',
) {
  const now = new Date();
  const dueAt = med.nextDueAt.getTime();
  const daysUntilDue = calendarDaysUntil(now, med.nextDueAt, timeZone);
  return {
    id: med.id,
    name: med.name,
    tabletsCount: med.tabletsCount,
    mgPerTablet: med.mgPerTablet,
    totalMg: med.tabletsCount * med.mgPerTablet,
    intervalDays: med.intervalDays,
    instructions: med.instructions,
    active: med.active,
    nextDueAt: med.nextDueAt.toISOString(),
    lastTakenAt: med.lastTakenAt?.toISOString() ?? null,
    sortOrder: med.sortOrder,
    isDue: med.active && dueAt <= now.getTime(),
    daysUntilDue,
  };
}

function serializeIntake(intake: {
  id: string;
  userId: bigint;
  medicationId: string;
  takenAt: Date;
  tabletsCount: number;
  mgPerTablet: number;
  totalMg: number;
  note: string | null;
  deletedAt?: Date | null;
  medication?: { name: string };
}) {
  return {
    id: intake.id,
    medicationId: intake.medicationId,
    medicationName: intake.medication?.name,
    takenAt: intake.takenAt.toISOString(),
    tabletsCount: intake.tabletsCount,
    mgPerTablet: intake.mgPerTablet,
    totalMg: intake.totalMg,
    note: intake.note,
    deletedAt: intake.deletedAt?.toISOString() ?? null,
    isDeleted: Boolean(intake.deletedAt),
  };
}

export { serializeMedication, serializeIntake };
