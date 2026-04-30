import type { DentistUnavailableBlock } from "@prisma/client";

const SLOT_MINUTES = 30;

/**
 * Bookable segments for each weekday before applying dentist-specific unavailable blocks
 * (minutes from local midnight). Lunch break is implicit between segments.
 */
export const DEFAULT_BOOKING_SEGMENTS_MINUTES: readonly { start: number; end: number }[] = [
  { start: 9 * 60, end: 12 * 60 },
  { start: 13 * 60, end: 15 * 60 },
] as const;

/** @deprecated kept for UI copy that referenced a single continuous window */
export const DEFAULT_SCHEDULE_START_MINUTES = DEFAULT_BOOKING_SEGMENTS_MINUTES[0].start;
export const DEFAULT_SCHEDULE_END_MINUTES =
  DEFAULT_BOOKING_SEGMENTS_MINUTES[DEFAULT_BOOKING_SEGMENTS_MINUTES.length - 1].end;

export type TimeSlot = { start: Date; end: Date };

function pushSlotsForSegment(params: {
  dayStartMs: number;
  segStartMin: number;
  segEndMin: number;
  dayBlocks: DentistUnavailableBlock[];
  existing: { startAt: Date; endAt: Date }[];
  clinicBlocks: { startAt: Date; endAt: Date }[];
  dentistDateBlocks: { startAt: Date; endAt: Date }[];
  out: TimeSlot[];
}): void {
  const { dayStartMs, segStartMin, segEndMin, dayBlocks, existing, clinicBlocks, dentistDateBlocks, out } = params;
  const segStartMs = dayStartMs + segStartMin * 60 * 1000;
  const segEndMs = dayStartMs + segEndMin * 60 * 1000;
  let cursor = segStartMs;
  while (cursor + SLOT_MINUTES * 60 * 1000 <= segEndMs) {
    const start = new Date(cursor);
    const end = new Date(cursor + SLOT_MINUTES * 60 * 1000);
    const slotStartMin = Math.round((cursor - dayStartMs) / (60 * 1000));
    const slotEndMin = slotStartMin + SLOT_MINUTES;

    const overlapsUnavailable = dayBlocks.some((u) => u.startMinutes < slotEndMin && u.endMinutes > slotStartMin);
    const overlapsAppt = existing.some((a) => a.startAt < end && a.endAt > start);
    const overlapsClinic = clinicBlocks.some((c) => c.startAt < end && c.endAt > start);
    const overlapsDentistDate = dentistDateBlocks.some((c) => c.startAt < end && c.endAt > start);
    if (!overlapsUnavailable && !overlapsAppt && !overlapsClinic && !overlapsDentistDate) out.push({ start, end });
    cursor += SLOT_MINUTES * 60 * 1000;
  }
}

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

  for (const seg of DEFAULT_BOOKING_SEGMENTS_MINUTES) {
    pushSlotsForSegment({
      dayStartMs: dayStart,
      segStartMin: seg.start,
      segEndMin: seg.end,
      dayBlocks,
      existing,
      clinicBlocks,
      dentistDateBlocks,
      out: slots,
    });
  }
  slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  return slots;
}

export function isWithinDefaultBookingSegments(start: Date, end: Date): boolean {
  const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0).getTime();
  const startMin = Math.round((start.getTime() - dayStart) / (60 * 1000));
  const endMin = Math.round((end.getTime() - dayStart) / (60 * 1000));
  if (!(start < end)) return false;
  return DEFAULT_BOOKING_SEGMENTS_MINUTES.some((seg) => startMin >= seg.start && endMin <= seg.end);
}

export function isVirtualFromAppointmentNotes(notes: string | undefined): boolean {
  return /Visit:\s*Virtual/i.test(notes ?? "");
}

export function parseRequestedServicesFromNotes(notes: string | undefined): string[] {
  if (!notes) return [];
  const m = /Requested services:\s*([^\n]+)/i.exec(notes);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function assertVirtualBookingServicesAllowed(notes: string | undefined): void {
  if (!isVirtualFromAppointmentNotes(notes)) return;
  const svcs = parseRequestedServicesFromNotes(notes);
  if (svcs.length !== 1 || svcs[0] !== "General Consultation") {
    throw new Error("VIRTUAL_SERVICES_INVALID");
  }
}
