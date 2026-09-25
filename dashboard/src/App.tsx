import { useEffect, useState } from "react";
import { getCurrentOwner, signOut, type Owner } from "@/api/auth";
import { createSite, deleteSite, listSites, updateSite } from "@/api/sites";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { DashboardContent } from "@/features/sites/DashboardContent";
import { DashboardSidebar } from "@/features/sites/DashboardSidebar";
import type { SiteSection } from "@/features/sites/sections";
import { errorMessage } from "@/lib/errors";
import type { AppearanceInput, Site, SiteSettingsInput } from "@/types/site";

const App = () => {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [checking, setChecking] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [section, setSection] = useState<SiteSection>("overview");
  const [error, setError] = useState("");
  const site = sites.find((item) => item.id === selectedId) ?? null;

  const refreshSites = async () => {
    const currentSites = await listSites();
    setSites(currentSites);
    setSelectedId((current) =>
      current && currentSites.some((item) => item.id === current)
        ? current
        : (currentSites[0]?.id ?? null),
    );
  };

  useEffect(() => {
    getCurrentOwner()
      .then(async (currentOwner) => {
        setOwner(currentOwner);
        try {
          await refreshSites();
        } catch (issue) {
          setError(errorMessage(issue));
        }
      })
      .catch(() => setOwner(null))
      .finally(() => setChecking(false));
  }, []);

  const loggedIn = async (currentOwner: Owner) => {
    setOwner(currentOwner);
    try {
      await refreshSites();
    } catch (issue) {
      setError(errorMessage(issue));
    }
  };

  const create = async (name: string) => {
    const created = await createSite(name);
    setSites((current) => [created, ...current]);
    setSelectedId(created.id);
    setSection("settings");
  };

  const save = async (fields: SiteSettingsInput | AppearanceInput) => {
    if (!site) throw new Error("Choose a site first.");
    const updated = await updateSite(site.id, fields);
    setSites((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    return updated;
  };

  const remove = async () => {
    if (!site) return;
    await deleteSite(site.id);
    const remaining = sites.filter((item) => item.id !== site.id);
    setSites(remaining);
    setSelectedId(remaining[0]?.id ?? null);
    setSection("overview");
  };

  const logout = async () => {
    try {
      await signOut();
      setOwner(null);
      setSites([]);
      setSelectedId(null);
    } catch (issue) {
      setError(errorMessage(issue));
    }
  };

  const select = (siteId: string, nextSection: SiteSection) => {
    setSelectedId(siteId);
    setSection(nextSection);
    setError("");
  };

  const changeSection = (nextSection: SiteSection) => {
    setSection(nextSection);
    setError("");
  };

  if (checking)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        Loading SmokeyChatBot…
      </div>
    );
  if (!owner)
    return (
      <AuthScreen
        onLogin={(currentOwner) => {
          void loggedIn(currentOwner);
        }}
      />
    );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <DashboardSidebar
        owner={owner}
        sites={sites}
        selectedId={selectedId}
        onSelect={select}
        onCreate={create}
        onSignOut={logout}
        onError={setError}
      />
      <DashboardContent
        site={site}
        section={section}
        error={error}
        onSectionChange={changeSection}
        onSave={save}
        onDelete={remove}
      />
    </div>
  );
};

export default App;
