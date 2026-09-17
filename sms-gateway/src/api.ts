import type { GatewaySettings } from "./settings";

export type SmsSchedule = {
  id: string;
  appointmentId: string;
  kind: "CONFIRMATION" | "REMINDER";
  phone: string;
  message: string;
  scheduledAt: string;
};

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}${path}`;
}

async function gatewayFetch(
  settings: GatewaySettings,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  if (!settings.apiBaseUrl) {
    throw new Error("Server URL is not set");
  }
  if (!settings.secret) {
    throw new Error("Gateway secret is not set");
  }

  const res = await fetch(joinUrl(settings.apiBaseUrl, path), {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.secret}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 180) || res.statusText}`);
  }
  return res;
}

export async function fetchDueSchedules(settings: GatewaySettings): Promise<SmsSchedule[]> {
  const res = await gatewayFetch(settings, "/api/sms-schedules/due");
  const data = (await res.json()) as { schedules?: SmsSchedule[] };
  return data.schedules ?? [];
}

export async function fetchPendingSchedules(settings: GatewaySettings): Promise<SmsSchedule[]> {
  const res = await gatewayFetch(settings, "/api/sms-schedules/pending?limit=50");
  const data = (await res.json()) as { schedules?: SmsSchedule[] };
  return data.schedules ?? [];
}

export async function markScheduleSent(settings: GatewaySettings, id: string): Promise<void> {
  await gatewayFetch(settings, `/api/sms-schedules/${id}/sent`, { method: "POST" });
}

export async function markScheduleFailed(
  settings: GatewaySettings,
  id: string,
  error: string,
): Promise<void> {
  await gatewayFetch(settings, `/api/sms-schedules/${id}/failed`, {
    method: "POST",
    body: JSON.stringify({ error: error.slice(0, 500) }),
  });
}
