export * from "@/types/assistant";
import { clearBrowserConversations } from "@/sdk/conversationSession";
import type { Business, BusinessOwner } from "@/types/assistant";
export class BusinessApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
let accessToken = "";
let refreshPending: Promise<void> | null = null;
let sessionEpoch = 0;
const extractError = (data: unknown): string => {
  if (!data || typeof data !== "object") return "The request could not complete. Please try again.";
  const body = data as Record<string, unknown>;
  if (typeof body.error === "string") return body.error;
  if (body.error && typeof body.error === "object" && "message" in body.error)
    return String(body.error.message);
  if (typeof body.detail === "string") return body.detail;
  const entry = Object.entries(body)[0];
  return entry
    ? entry[0].replaceAll("_", " ") + ": " + String(entry[1])
    : "The request could not complete.";
};
const transport = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  if (accessToken) headers.set("Authorization", "Bearer " + accessToken);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch("/business-api/" + path, {
    ...options,
    credentials: "include",
    headers,
    signal: options.signal ?? AbortSignal.timeout(15000),
  });
  if (response.status === 204) return undefined as T;
  if (response.ok && response.headers.get("Content-Type")?.startsWith("image/"))
    return (await response.blob()) as T;
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new BusinessApiError(extractError(data), response.status);
  return data as T;
};
const refreshSession = (): Promise<void> => {
  if (!refreshPending) {
    const epoch = sessionEpoch;
    refreshPending = transport<{ access: string }>("auth/refresh/", { method: "POST" })
      .then((data) => {
        if (epoch === sessionEpoch) accessToken = data.access;
      })
      .finally(() => {
        refreshPending = null;
      });
  }
  return refreshPending;
};
export const businessApi = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const epoch = sessionEpoch;
  try {
    return await transport<T>(path, options);
  } catch (error) {
    if (!(error instanceof BusinessApiError) || error.status !== 401 || options.signal?.aborted)
      throw error;
    try {
      await refreshSession();
    } catch (issue) {
      if (issue instanceof BusinessApiError && issue.status === 401)
        window.dispatchEvent(new Event("smokey:session-expired"));
      throw issue;
    }
    if (epoch !== sessionEpoch)
      throw new BusinessApiError("Your session changed. Sign in again.", 401);
    return transport<T>(path, options);
  }
};
export const businessLogin = async (identifier: string, password: string) => {
  sessionEpoch++;
  clearBrowserConversations();
  accessToken = "";
  const result = await transport<{ access: string }>("auth/login/", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
  accessToken = result.access;
  return transport<BusinessOwner>("auth/me/");
};
export const restoreBusinessSession = async () => {
  try {
    await refreshSession();
    return await transport<BusinessOwner>("auth/me/");
  } catch (error) {
    if (error instanceof BusinessApiError && error.status === 401) clearBrowserConversations();
    throw error;
  }
};
export const businessLogout = async () => {
  sessionEpoch++;
  clearBrowserConversations();
  try {
    await transport("auth/logout/", { method: "POST" });
  } finally {
    clearBrowserConversations();
    accessToken = "";
  }
};
export const assistantPath = (business: Business, path = "") =>
  "businesses/" + business.public_id + "/smokey/" + path;
export { label, display } from "@/sdk/format";

export const fetchBusinessAsset = (path: string) => businessApi<Blob>(path);
