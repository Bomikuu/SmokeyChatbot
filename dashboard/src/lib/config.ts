export const publicApiUrl = (
  import.meta.env.VITE_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");
