import { useState, type FormEvent } from "react";
import { Cat, ChevronRight, LogOut, Plus } from "lucide-react";
import type { Owner } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";
import type { Site } from "@/types/site";
import type { SiteSection } from "./sections";

interface DashboardSidebarProps {
  owner: Owner;
  sites: Site[];
  selectedId: string | null;
  onSelect: (siteId: string, section: SiteSection) => void;
  onCreate: (name: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onError: (message: string) => void;
}

export const DashboardSidebar = ({
  owner,
  sites,
  selectedId,
  onSelect,
  onCreate,
  onSignOut,
  onError,
}: DashboardSidebarProps) => {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    onError("");
    try {
      await onCreate(newName);
      setNewName("");
    } catch (issue) {
      onError(errorMessage(issue));
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className="border-b border-[#dce4ef] bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 border-b border-[#edf1f5] px-6 py-5">
        <span className="grid size-9 place-items-center rounded-lg bg-[#2f5bff] text-white">
          <Cat size={20} />
        </span>
        <span className="text-base font-bold tracking-tight">SmokeyChatBot</span>
      </div>
      <div className="p-4">
        <p className="px-2 text-[11px] font-bold uppercase tracking-[.15em] text-slate-400">
          Your sites
        </p>
        <div className="mt-3 space-y-1">
          {sites.map((site) => (
            <button
              key={site.id}
              type="button"
              onClick={() => onSelect(site.id, "overview")}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${selectedId === site.id ? "bg-[#eff6ff] font-semibold text-[#2149dc]" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <span className="truncate">{site.name}</span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
        <form onSubmit={create} className="mt-5 space-y-2">
          <label htmlFor="new-site" className="sr-only">
            New site name
          </label>
          <Input
            id="new-site"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="New site name"
            maxLength={100}
            required
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={creating || sites.length >= 5}
          >
            <Plus size={15} /> Add site
          </Button>
        </form>
      </div>
      <div className="mt-6 border-t border-[#edf1f5] p-4 lg:mt-16">
        <p className="truncate px-2 text-xs text-slate-500" title={owner.email}>
          {owner.email}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start"
          onClick={() => {
            void onSignOut();
          }}
        >
          <LogOut size={15} /> Sign out
        </Button>
      </div>
    </aside>
  );
};
