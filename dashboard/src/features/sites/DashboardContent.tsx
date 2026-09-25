import {
  Cat,
  Code2,
  Database,
  LayoutDashboard,
  MessageSquare,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { Notice } from "@/components/common/Notice";
import { Badge } from "@/components/ui/badge";
import { Appearance } from "@/features/appearance/Appearance";
import { Install } from "@/features/install/Install";
import { Knowledge } from "@/features/knowledge/Knowledge";
import type { AppearanceInput, Site, SiteSettingsInput } from "@/types/site";
import { Overview } from "./Overview";
import { SiteSettings } from "./SiteSettings";
import type { SiteSection } from "./sections";

const sections: { id: SiteSection; label: string; Icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "settings", label: "Site settings", Icon: Settings2 },
  { id: "appearance", label: "Appearance", Icon: Cat },
  { id: "knowledge", label: "Knowledge", Icon: Database },
  { id: "install", label: "Install", Icon: Code2 },
];

interface DashboardContentProps {
  site: Site | null;
  section: SiteSection;
  error: string;
  onSectionChange: (section: SiteSection) => void;
  onSave: (fields: SiteSettingsInput | AppearanceInput) => Promise<Site>;
  onDelete: () => Promise<void>;
}

export const DashboardContent = ({
  site,
  section,
  error,
  onSectionChange,
  onSave,
  onDelete,
}: DashboardContentProps) => (
  <main className="min-w-0 px-5 py-7 md:px-10 md:py-9">
    <div className="mx-auto max-w-6xl">
      <Notice message={error} error />
      {site ? (
        <>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="secondary">Site</Badge>
                <span className="text-xs capitalize text-slate-500">{site.mode} mode</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-4xl">{site.name}</h1>
              <p className="mt-2 text-sm text-slate-500">
                Configure the website companion your visitors will meet.
              </p>
            </div>
            <span className="mono break-all text-xs text-slate-400">{site.id}</span>
          </div>
          <nav
            aria-label="Site sections"
            className="mb-7 flex gap-1 overflow-x-auto border-b border-[#dce4ef]"
          >
            {sections.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onSectionChange(id)}
                aria-current={section === id ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium ${section === id ? "border-[#2f5bff] text-[#2149dc]" : "border-transparent text-slate-500 hover:text-slate-900"}`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
          {section === "overview" && <Overview key={site.id} site={site} />}
          {section === "settings" && (
            <SiteSettings key={site.id} site={site} onSave={onSave} onDelete={onDelete} />
          )}
          {section === "appearance" && <Appearance key={site.id} site={site} onSave={onSave} />}
          {section === "knowledge" && <Knowledge key={site.id} site={site} />}
          {section === "install" && <Install key={site.id} site={site} />}
        </>
      ) : (
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="max-w-md text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#eff6ff] text-[#2f5bff]">
              <MessageSquare size={30} />
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight">
              Create your first chatbot
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Give it a site name in the sidebar, then add public information it can answer from.
            </p>
          </div>
        </div>
      )}
    </div>
  </main>
);
