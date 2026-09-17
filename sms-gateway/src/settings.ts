import * as SecureStore from "expo-secure-store";

const URL_KEY = "sms.apiBaseUrl";
const SECRET_KEY = "sms.gatewaySecret";
const AUTO_KEY = "sms.autoSend";
const LAST_RUN_KEY = "sms.lastRun";

export type GatewaySettings = {
  apiBaseUrl: string;
  secret: string;
  autoSend: boolean;
};

export type LastRun = {
  at: string;
  sent: number;
  failed: number;
  due: number;
  error?: string;
};

export async function loadSettings(): Promise<GatewaySettings> {
  const [apiBaseUrl, secret, autoSend] = await Promise.all([
    SecureStore.getItemAsync(URL_KEY),
    SecureStore.getItemAsync(SECRET_KEY),
    SecureStore.getItemAsync(AUTO_KEY),
  ]);
  return {
    apiBaseUrl: (apiBaseUrl ?? "").trim(),
    secret: (secret ?? "").trim(),
    autoSend: autoSend === "1",
  };
}

export async function saveSettings(settings: GatewaySettings): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(URL_KEY, settings.apiBaseUrl.trim()),
    SecureStore.setItemAsync(SECRET_KEY, settings.secret.trim()),
    SecureStore.setItemAsync(AUTO_KEY, settings.autoSend ? "1" : "0"),
  ]);
}

export async function loadLastRun(): Promise<LastRun | null> {
  const raw = await SecureStore.getItemAsync(LAST_RUN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LastRun;
  } catch {
    return null;
  }
}

export async function saveLastRun(run: LastRun): Promise<void> {
  await SecureStore.setItemAsync(LAST_RUN_KEY, JSON.stringify(run));
}
