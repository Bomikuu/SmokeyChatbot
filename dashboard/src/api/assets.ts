import { apiRequest } from "@/api/client";

export const uploadMascot = (siteId: string, file: File) => {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<void>(`/owner/sites/${siteId}/asset`, { method: "POST", body });
};

export const deleteMascot = (siteId: string) =>
  apiRequest<void>(`/owner/sites/${siteId}/asset`, { method: "DELETE" });
