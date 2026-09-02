import type { DentistUnavailableBlock } from "@prisma/client";

const SLOT_MINUTES = 30;

/** Clinic operates in Philippine time (UTC+8, no DST). */
export const CLINIC_UTC_OFFSET_HOURS = 8;

/**
 * Bookable segments for each weekday before applying dentist-specific unavailable blocks
 * (minutes from clinic-local midnight). Lunch break is implicit between segments.
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

export function parseClinicDateString(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month, day };
}

/** UTC epoch ms at clinic-local midnight for the given calendar date. */
export function clinicDayStartUtcMs(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day) - CLINIC_UTC_OFFSET_HOURS * 60 * 60 * 1000;
}

export function clinicDayUtcRange(dateStr: string): { startMs: number; endMs: number } {
  const { year, month, day } = parseClinicDateString(dateStr);
  const startMs = clinicDayStartUtcMs(year, month, day);
  return { startMs, endMs: startMs + 24 * 60 * 60 * 1000 };
}

export function clinicDayOfWeek(dateStr: string): number {
  const { year, month, day } = parseClinicDateString(dateStr);
  return new Date(clinicDayStartUtcMs(year, month, day) + 12 * 60 * 60 * 1000).getUTCDay();
}

export function clinicMinutesFromMidnight(instant: Date): number {
  const shifted = instant.getTime() + CLINIC_UTC_OFFSET_HOURS * 60 * 60 * 1000;
  const t = new Date(shifted);
  return t.getUTCHours() * 60 + t.getUTCMinutes();
}

function pushSlotsForSegment(params: {
  dayStartMs: number;
  segStartMin: number;
  segEndMin: number;
  dayBlocks: DentistUnavailableBlock[];
  existing: { startAt: Date; endAt: Date }[];
  clinicBlocks: { startAt: Date; endAt: Date }[];
  dentistDateBlocks: { startAt: Date; endAt: Date }[];
  out: TimeSlot[];
  nowMs: number;
}): void {
  const { dayStartMs, segStartMin, segEndMin, dayBlocks, existing, clinicBlocks, dentistDateBlocks, out, nowMs } =
    params;
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
    const inPast = start.getTime() <= nowMs;
    if (!overlapsUnavailable && !overlapsAppt && !overlapsClinic && !overlapsDentistDate && !inPast) {
      out.push({ start, end });
    }
    cursor += SLOT_MINUTES * 60 * 1000;
  }
}

/** Returns bookable slots for a clinic-local calendar date (`YYYY-MM-DD`). */
export function generateSlotsForDay(
  dateStr: string,
  unavailable: DentistUnavailableBlock[],
  existing: { startAt: Date; endAt: Date }[],
  clinicBlocks: { startAt: Date; endAt: Date }[] = [],
  dentistDateBlocks: { startAt: Date; endAt: Date }[] = [],
): TimeSlot[] {
  const { year, month, day } = parseClinicDateString(dateStr);
  const dow = clinicDayOfWeek(dateStr);
  const dayBlocks = unavailable.filter((u) => u.dayOfWeek === dow);
  const slots: TimeSlot[] = [];
  const dayStartMs = clinicDayStartUtcMs(year, month, day);
  const nowMs = Date.now();

  for (const seg of DEFAULT_BOOKING_SEGMENTS_MINUTES) {
    pushSlotsForSegment({
      dayStartMs,
      segStartMin: seg.start,
      segEndMin: seg.end,
      dayBlocks,
      existing,
      clinicBlocks,
      dentistDateBlocks,
      out: slots,
      nowMs,
    });
  }
  slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  return slots;
}

export function isWithinDefaultBookingSegments(start: Date, end: Date): boolean {
  const startMin = clinicMinutesFromMidnight(start);
  const endMin = clinicMinutesFromMidnight(end);
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
