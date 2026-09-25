import { apiRequest } from "@/api/client";
import type { AppearanceInput, Site, SiteSettingsInput, Usage } from "@/types/site";

export const listSites = async () => (await apiRequest<{ sites: Site[] }>("/owner/sites")).sites;

export const createSite = async (name: string) =>
  (
    await apiRequest<{ site: Site }>("/owner/sites", {
      method: "POST",
      body: JSON.stringify({ name }),
    })
  ).site;

export const updateSite = async (id: string, fields: SiteSettingsInput | AppearanceInput) =>
  (
    await apiRequest<{ site: Site }>(`/owner/sites/${id}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    })
  ).site;

export const deleteSite = (id: string) =>
  apiRequest<void>(`/owner/sites/${id}`, { method: "DELETE" });

export const getUsage = (id: string) => apiRequest<Usage>(`/owner/sites/${id}/usage`);
