const configuredApiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const apiBase = configuredApiBase || window.location.origin;

export function getApiBase(): string {
  return apiBase;
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export async function downloadPdf(path: string, download = false): Promise<void> {
  const token = getToken();
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data.error === "string" ? data.error : `Download failed (${res.status})`;
    throw new Error(msg);
  }
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const filename = path.split("/").pop()?.split("?")[0] ?? "document.pdf";
  if (download) {
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    a.click();
  } else {
    window.open(objUrl, "_blank", "noopener,noreferrer");
  }
  setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const url = `${apiBase}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new Error(
      `Cannot reach the API at ${url}. Check the VITE_API_URL environment variable and server deployment.`,
    );
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.error === "string"
        ? data.error
        : `Request failed (${res.status}) [${options.method ?? "GET"} ${url}]`;
    throw new Error(msg);
  }
  return data as T;
}
