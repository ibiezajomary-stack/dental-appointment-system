/** Force all displayed clocks to Philippine Time, even if the browser or server is in UTC. */
export const PH_TIME_ZONE = "Asia/Manila";

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function num(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find((p) => p.type === type)?.value);
}

export function phParts(value: string | Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(toDate(value));
  return {
    year: num(parts, "year"),
    month: num(parts, "month"),
    day: num(parts, "day"),
    hour: num(parts, "hour"),
    minute: num(parts, "minute"),
  };
}

export function formatPhDateTime(
  value: string | Date,
  opts?: Intl.DateTimeFormatOptions,
): string {
  return toDate(value).toLocaleString("en-PH", {
    timeZone: PH_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
    ...opts,
  });
}

export function formatPhDate(value: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  return toDate(value).toLocaleDateString("en-PH", {
    timeZone: PH_TIME_ZONE,
    ...opts,
  });
}

export function formatPhTime(value: string | Date): string {
  return toDate(value).toLocaleTimeString("en-PH", {
    timeZone: PH_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isSamePhDay(a: string | Date, b: string | Date): boolean {
  const pa = phParts(a);
  const pb = phParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

/** Calendar Y-M-D numbers in Philippine time (month is 1–12). */
export function phToday(): { year: number; month: number; day: number } {
  const p = phParts(new Date());
  return { year: p.year, month: p.month, day: p.day };
}
