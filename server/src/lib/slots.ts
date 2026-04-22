import type { DentistUnavailableBlock } from "@prisma/client";

const SLOT_MINUTES = 30;

/** Bookable window for each weekday before applying dentist-specific unavailable blocks (minutes from local midnight). */
export const DEFAULT_SCHEDULE_START_MINUTES = 9 * 60;
export const DEFAULT_SCHEDULE_END_MINUTES = 16 * 60;

export type TimeSlot = { start: Date; end: Date };

/** Returns local start/end for each bookable slot on `day`. */
export function generateSlotsForDay(
  day: Date,
  unavailable: DentistUnavailableBlock[],
  existing: { startAt: Date; endAt: Date }[],
  /** Clinic-wide blocks; any slot overlapping these is omitted. */
  clinicBlocks: { startAt: Date; endAt: Date }[] = [],
  /** Dentist one-time blocks for this date; any slot overlapping these is omitted. */
  dentistDateBlocks: { startAt: Date; endAt: Date }[] = [],
): TimeSlot[] {
  const dow = day.getDay();
  const dayBlocks = unavailable.filter((u) => u.dayOfWeek === dow);
  const slots: TimeSlot[] = [];

  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0).getTime();

  const scheduleStartMs = dayStart + DEFAULT_SCHEDULE_START_MINUTES * 60 * 1000;
  const scheduleEndMs = dayStart + DEFAULT_SCHEDULE_END_MINUTES * 60 * 1000;

  let cursor = scheduleStartMs;
  while (cursor + SLOT_MINUTES * 60 * 1000 <= scheduleEndMs) {
    const start = new Date(cursor);
    const end = new Date(cursor + SLOT_MINUTES * 60 * 1000);
    const slotStartMin = Math.round((cursor - dayStart) / (60 * 1000));
    const slotEndMin = slotStartMin + SLOT_MINUTES;

    const overlapsUnavailable = dayBlocks.some(
      (u) => u.startMinutes < slotEndMin && u.endMinutes > slotStartMin,
    );
    const overlapsAppt = existing.some((a) => a.startAt < end && a.endAt > start);
    const overlapsClinic = clinicBlocks.some((c) => c.startAt < end && c.endAt > start);
    const overlapsDentistDate = dentistDateBlocks.some((c) => c.startAt < end && c.endAt > start);
    if (!overlapsUnavailable && !overlapsAppt && !overlapsClinic && !overlapsDentistDate) slots.push({ start, end });
    cursor += SLOT_MINUTES * 60 * 1000;
  }
  return slots;
}
