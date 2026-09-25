let csrfToken = "";

type ApiError = { error?: string };

export const apiRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);

  if (method !== "GET") {
    if (!csrfToken) {
      const csrfResponse = await fetch("/api/auth/csrf", { credentials: "include" });
      if (!csrfResponse.ok)
        throw new Error("Could not start a secure request. Please reload and try again.");
      const csrfData = (await csrfResponse.json()) as { csrfToken: string };
      csrfToken = csrfData.csrfToken;
    }
    headers.set("X-CSRFToken", csrfToken);
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  const data = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status}).`);
  if (path === "/auth/login" || path === "/auth/logout") csrfToken = "";
  return data;
};
