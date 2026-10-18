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

/** Calendar date in Philippine time, `YYYY-MM-DD`. */
export function phDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
