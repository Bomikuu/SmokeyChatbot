import { apiRequest } from "@/api/client";
import type { KnowledgeSource } from "@/types/site";

export const listSources = async (siteId: string) =>
  (await apiRequest<{ sources: KnowledgeSource[] }>(`/owner/sites/${siteId}/sources`)).sources;

export const addTextSource = async (siteId: string, title: string, body: string) =>
  (
    await apiRequest<{ source: KnowledgeSource }>(`/owner/sites/${siteId}/sources`, {
      method: "POST",
      body: JSON.stringify({ title, body }),
    })
  ).source;

export const addFileSource = async (siteId: string, file: File, title: string) => {
  const body = new FormData();
  body.append("file", file);
  if (title) body.append("title", title);
  return (
    await apiRequest<{ source: KnowledgeSource }>(`/owner/sites/${siteId}/sources`, {
      method: "POST",
      body,
    })
  ).source;
};

export const retrySource = (siteId: string, sourceId: number) =>
  apiRequest<void>(`/owner/sites/${siteId}/sources/${sourceId}`, { method: "POST" });

export const deleteSource = (siteId: string, sourceId: number) =>
  apiRequest<void>(`/owner/sites/${siteId}/sources/${sourceId}`, { method: "DELETE" });
