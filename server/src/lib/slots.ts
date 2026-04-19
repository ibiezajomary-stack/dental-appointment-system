import type { DentistWorkingHour } from "@prisma/client";

const SLOT_MINUTES = 30;

export type TimeSlot = { start: Date; end: Date };

/** Returns UTC start/end for each bookable window on `day` (local interpretation uses server TZ — client sends date-only). */
export function generateSlotsForDay(
  day: Date,
  working: DentistWorkingHour[],
  existing: { startAt: Date; endAt: Date }[],
): TimeSlot[] {
  const dow = day.getUTCDay();
  const blocks = working.filter((w) => w.dayOfWeek === dow);
  const slots: TimeSlot[] = [];

  const dayStart = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    0,
    0,
    0,
    0,
  );

  for (const b of blocks) {
    let cursor = dayStart + b.startMinutes * 60 * 1000;
    const blockEnd = dayStart + b.endMinutes * 60 * 1000;
    while (cursor + SLOT_MINUTES * 60 * 1000 <= blockEnd) {
      const start = new Date(cursor);
      const end = new Date(cursor + SLOT_MINUTES * 60 * 1000);
      const overlaps = existing.some(
        (a) => a.startAt < end && a.endAt > start,
      );
      if (!overlaps) slots.push({ start, end });
      cursor += SLOT_MINUTES * 60 * 1000;
    }
  }
  return slots;
}
