import { config } from "./config.js";

export type SmsResult = { ok: true } | { ok: false; error: string };

async function sendViaTwilio(to: string, body: string): Promise<SmsResult> {
  const { accountSid, authToken, fromNumber } = config.sms.twilio;
  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, error: "Twilio credentials not configured" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Twilio error ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true };
}

async function sendViaSemaphore(to: string, body: string): Promise<SmsResult> {
  const { apiKey, senderName } = config.sms.semaphore;
  if (!apiKey) {
    return { ok: false, error: "Semaphore API key not configured" };
  }

  const res = await fetch("https://api.semaphore.co/api/v4/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: apiKey,
      number: to.replace(/^\+/, ""),
      message: body,
      sendername: senderName || "DENTAL",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Semaphore error ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true };
}

/** Normalize Philippine mobile numbers to E.164 (+63...) for Twilio. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("09")) return `+63${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("9")) return `+63${digits}`;
  if (digits.length === 12 && digits.startsWith("63")) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 10) return `+${digits}`;
  return null;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!config.sms.enabled) {
    if (config.nodeEnv === "development") {
      console.log(`[sms:dev] Would send to ${to}: ${body}`);
      return { ok: true };
    }
    return { ok: false, error: "SMS provider not configured" };
  }

  const normalized = normalizePhone(to);
  if (!normalized) {
    return { ok: false, error: `Invalid phone number: ${to}` };
  }

  if (config.sms.provider === "semaphore") {
    return sendViaSemaphore(normalized, body);
  }
  return sendViaTwilio(normalized, body);
}

export function buildReminderMessage(params: {
  patientName: string;
  dentistName: string;
  date: string;
  time: string;
  clinicAddress: string;
  clinicPhone: string;
}): string {
  return (
    `Hello ${params.patientName}, this is a reminder for your dental appointment with ${params.dentistName} ` +
    `on ${params.date} at ${params.time} at ${params.clinicAddress}. ` +
    `Reply or call ${params.clinicPhone} if you need to reschedule.`
  );
}
