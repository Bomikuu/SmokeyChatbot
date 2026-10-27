import { useEffect, useRef, useState } from "react";
import { Cat, LogOut, MessageSquare, UserRound } from "lucide-react";
import { businessApi } from "@/api/business";
import type { Business, BusinessOwner } from "@/types/assistant";
import { createPixelCoreStandaloneAdapter } from "@/hosts/pixelcore/standaloneAdapter";
import { createAssistantRuntime } from "@/sdk/runtimeStore";
import { AssistantRuntimeProvider, useRuntimeSnapshot } from "@/sdk/RuntimeProvider";
import type { SmokeyContext } from "@/sdk/contracts";
import { Button } from "@/components/ui/button";
import { ThemeSelect } from "@/features/theme/ThemeSelect";
import { useTheme } from "@/features/theme/ThemeProvider";
import { BusinessSelect } from "./BusinessControls";
import { BusinessDashboard } from "./BusinessDashboard";
import { BusinessPageHeader } from "./BusinessPageHeader";
import { DashboardNavigation } from "./DashboardNavigation";
import { AssistantControls } from "@/features/assistant/AssistantControls";
export type { BusinessSectionProps } from "./BusinessDashboard";
const StandaloneContent = ({
  business,
  businesses,
  owner,
  onSelect,
  onLogout,
}: {
  business: Business;
  businesses: Business[];
  owner: BusinessOwner;
  onSelect: (id: string) => void;
  onLogout: () => Promise<void>;
}) => {
  const { route, epoch } = useRuntimeSnapshot();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-6 border-b bg-muted/40 px-5 py-6 lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <a href="/" className="flex items-center gap-3 text-xl font-semibold">
          <Cat className="size-7 text-primary" />
          Smokey
        </a>
        <BusinessSelect
          id="Active business"
          value={business.public_id}
          onChange={onSelect}
          options={businesses.map((entry) => ({
            value: entry.public_id,
            label: entry.display_name,
          }))}
        />
        <DashboardNavigation variant="sidebar" />
        <footer className="space-y-4 border-t pt-5 lg:mt-auto">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-background text-primary">
              <UserRound className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{owner.first_name || "Your account"}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground" title={owner.email}>
                {owner.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto shrink-0"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => {
                void onLogout();
              }}
            >
              <LogOut className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Appearance</p>
            <ThemeSelect compact />
          </div>
          <a
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            href="/websites"
          >
            Website chatbots
          </a>
        </footer>
      </aside>
      <main className="min-w-0">
        <StandaloneToolbar />
        <div className="min-w-0">
          <BusinessDashboard key={epoch} route={route} chrome="standalone" showHeader={false} />
        </div>
      </main>
      <AssistantControls key={"assistant-" + epoch} />
    </div>
  );
};
import { useAssistantRuntime } from "@/sdk/RuntimeProvider";
const StandaloneToolbar = () => {
  const runtime = useAssistantRuntime(),
    { settings, opened } = useRuntimeSnapshot();
  return (
    <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5 lg:px-6">
      <BusinessPageHeader />
      {settings && (
        <Button
          variant="outline"
          className="shrink-0"
          size="sm"
          aria-label={opened ? "Close Smokey chat" : "Open Smokey chat"}
          aria-expanded={opened}
          onClick={(event) => runtime.toggleAssistant(event.currentTarget)}
          ref={(node) => runtime.registerToolbar(node || undefined)}
        >
          <MessageSquare className="mr-2 size-4" />
          Ask Smokey
        </Button>
      )}
    </header>
  );
};
export const BusinessWorkspace = ({
  business,
  businesses,
  owner,
  onSelect,
  onUpdated,
  onLogout,
}: {
  business: Business;
  businesses: Business[];
  owner: BusinessOwner;
  onSelect: (id: string) => void;
  onUpdated: (business: Business) => void;
  onLogout: () => Promise<void>;
}) => {
  const { resolved } = useTheme();
  const role = owner.businesses.find((entry) => entry.public_id === business.public_id)?.role;
  const scope = JSON.stringify([
    business.public_id,
    owner.id,
    role,
    business.enabled_modules.includes("smokey"),
  ]);
  const revision = useRef({ scope, value: 1 });
  if (revision.current.scope !== scope)
    revision.current = { scope, value: revision.current.value + 1 };
  const nextContext: SmokeyContext = {
    identity: {
      hostId: "pixelcore",
      organizationId: business.public_id,
      actorId: String(owner.id),
      revision: revision.current.value,
    },
    organization: { name: business.display_name, timezone: business.timezone },
    installed: true,
    enabled: business.enabled_modules.includes("smokey"),
    permissions:
      role === "owner" || role === "admin"
        ? ["configure", "generate", "view_reports", "delete_reports"]
        : ["generate", "view_reports"],
    reportKinds: ["daily", "sales", "attendance", "late"],
    theme: resolved,
  };
  const context = useRef(nextContext);
  context.current = nextContext;
  const callbacks = useRef({ business, onUpdated });
  callbacks.current = { business, onUpdated };
  const [runtime] = useState(() => {
    let current: ReturnType<typeof createAssistantRuntime>;
    const adapter = createPixelCoreStandaloneAdapter(
      businessApi,
      () => context.current,
      (route) => current.setRoute(route),
      import.meta.env.VITE_PIXELCORE_URL || "http://localhost",
    );
    current = createAssistantRuntime(adapter, context.current, {
      onEvent: (event) => {
        if (event.type === "module-enabled") {
          const { business, onUpdated } = callbacks.current;
          onUpdated({
            ...business,
            enabled_modules: [...new Set([...business.enabled_modules, "smokey"])],
          });
        }
      },
    });
    return current;
  });
  useEffect(() => {
    runtime.updateContext(nextContext);
  }, [
    business.public_id,
    owner.id,
    business.enabled_modules.join(","),
    role,
    resolved,
    business.timezone,
    business.display_name,
  ]);
  useEffect(() => {
    runtime.setPageAttached(true);
    void runtime.refreshSettings();
    return () => runtime.destroy();
  }, [runtime]);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <StandaloneContent
        business={business}
        businesses={businesses}
        owner={owner}
        onSelect={onSelect}
        onLogout={onLogout}
      />
    </AssistantRuntimeProvider>
  );
};
