/** Philippine Time — used for all patient/dentist-facing clocks. */
export const PH_TIME_ZONE = "Asia/Manila";

function toDate(value: Date): Date {
  return value;
}

export function formatPhDateTime(date: Date): string {
  return toDate(date).toLocaleString("en-PH", {
    timeZone: PH_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatPhDate(date: Date, opts?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString("en-PH", {
    timeZone: PH_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...opts,
  });
}

export function formatPhTime(date: Date): string {
  return date.toLocaleTimeString("en-PH", {
    timeZone: PH_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}
