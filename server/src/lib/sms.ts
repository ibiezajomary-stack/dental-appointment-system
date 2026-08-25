import { config } from "./config.js";

export const isSmsConfigured = (): boolean =>
  Boolean(config.itexmoEmail && config.itexmoPassword && config.itexmoApiCode);

export function normalizePhoneNumber(phone: string): string {
  const value = phone.trim().replace(/[\s().-]/g, "");
  if (value.startsWith("09") && value.length === 11) return `+63${value.slice(1)}`;
  if (value.startsWith("63") && value.length === 12) return `+${value}`;
  if (value.startsWith("+") && /^\+\d{8,15}$/.test(value)) return value;
  throw new Error("INVALID_PHONE_NUMBER");
}

export async function sendSms(to: string, body: string): Promise<void> {
  if (!isSmsConfigured()) {
    throw new Error("SMS_NOT_CONFIGURED");
  }

  const response = await fetch("https://api.itexmo.com/api/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      Email: config.itexmoEmail!,
      Password: config.itexmoPassword!,
      ApiCode: config.itexmoApiCode!,
      Message: body,
      Recipient: normalizePhoneNumber(to),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`SMS_PROVIDER_ERROR_${response.status}: ${details.slice(0, 300)}`);
  }

  const result = (await response.text()).trim();
  let successful = !result || result === "0" || /^success$/i.test(result);
  if (!successful && result.startsWith("{")) {
    try {
      const parsed = JSON.parse(result) as { code?: number | string; status?: string };
      successful = parsed.code === 0 || /^success$/i.test(parsed.status ?? "");
    } catch {
      successful = false;
    }
  }
  if (!successful) {
    throw new Error(`SMS_PROVIDER_ERROR: ${result.slice(0, 300)}`);
  }
}