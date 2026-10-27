import { useAssistantRuntime, useRuntimeSnapshot } from "@/sdk/RuntimeProvider";
import { Button } from "@/components/ui/button";
import type { AssistantSettings, Business } from "@/types/assistant";
import type { SmokeyRoute } from "@/sdk/contracts";
import { BusinessFeedback, BusinessMascot } from "./BusinessFeedback";
import { BusinessConversation } from "./BusinessConversation";
import { BusinessConnections } from "./BusinessConnections";
import { BusinessAppearance } from "./BusinessAppearance";
import { BusinessUsage } from "./BusinessUsage";
import { BusinessOverview } from "./BusinessOverview";
import { BusinessReports, BusinessReportView } from "./BusinessReports";
import { BusinessPageHeader } from "./BusinessPageHeader";
import { DashboardNavigation } from "./DashboardNavigation";
import { useBusinessAction, useGeneration } from "./hooks";
export interface BusinessSectionProps {
  business: Business;
  settings: AssistantSettings;
  refresh: () => Promise<void>;
}
export const useRuntimeBusiness = (): Business => {
  const { context } = useRuntimeSnapshot();
  return {
    public_id: context.identity.organizationId,
    display_name: context.organization.name,
    timezone: context.organization.timezone,
    enabled_modules: context.enabled ? ["smokey"] : [],
  };
};
export const SharedConversation = ({ compact = false }: { compact?: boolean }) => {
  const runtime = useAssistantRuntime(),
    { settings } = useRuntimeSnapshot(),
    business = useRuntimeBusiness(),
    generation = useGeneration();
  return settings ? (
    <BusinessConversation
      business={business}
      settings={settings}
      compact={compact}
      generation={generation}
      onReport={(reportId) => runtime.navigate({ section: "reports", reportId })}
      onConnections={() => runtime.navigate({ section: "connections" })}
    />
  ) : null;
};
export const BusinessDashboard = ({
  route,
  chrome = "host",
  showHeader = true,
}: {
  route: SmokeyRoute;
  chrome?: "standalone" | "host";
  showHeader?: boolean;
}) => {
  const runtime = useAssistantRuntime(),
    snapshot = useRuntimeSnapshot(),
    business = useRuntimeBusiness(),
    action = useBusinessAction();
  const { context, settings } = snapshot;
  const props = settings ? { business, settings, refresh: runtime.refreshSettings } : null;
  return (
    <section
      className="min-w-0 space-y-6 p-4 sm:p-5 lg:p-6"
      aria-label={"Smokey for " + context.organization.name}
    >
      {showHeader && <BusinessPageHeader />}
      {chrome === "host" && <DashboardNavigation />}
      <BusinessFeedback
        business={business}
        settings={settings}
        busy={action.busy || (snapshot.loading ? "Loading your assistant settings…" : "")}
        error={action.error || snapshot.error?.message}
        notice={action.notice}
      />
      {snapshot.error && (
        <Button
          variant="outline"
          onClick={() => {
            void runtime.refreshSettings();
          }}
        >
          Retry loading settings
        </Button>
      )}
      {!context.installed ? (
        <p className="text-sm leading-7 text-muted-foreground">
          Install the Smokey assistant package on this project's server to connect your business.
        </p>
      ) : !context.enabled ? (
        <section className="max-w-xl space-y-5 py-6">
          <BusinessMascot />
          <h2 className="text-xl font-semibold">Meet your business assistant</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            Connect your own AI provider and generate reports from your authorized business records.
            Your provider bills you directly.
          </p>
          {context.permissions.includes("configure") ? (
            <Button
              disabled={Boolean(action.busy)}
              onClick={() => {
                void action.act(
                  "Enabling Smokey…",
                  runtime.enable,
                  "Smokey enabled. Connect an AI provider to get started.",
                );
              }}
            >
              Enable Smokey
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ask an owner or administrator to enable Smokey.
            </p>
          )}
        </section>
      ) : null}
      {props && route.section === "overview" && <BusinessOverview {...props} />}
      {settings && route.section === "assistant" && (
        <section className="flex min-h-[65dvh] flex-col">
          <SharedConversation />
        </section>
      )}
      {props && route.section === "connections" && <BusinessConnections {...props} />}
      {props && route.section === "appearance" && <BusinessAppearance {...props} />}
      {props && route.section === "usage" && <BusinessUsage {...props} />}
      {props &&
        route.section === "reports" &&
        (route.reportId ? (
          <BusinessReportView
            key={route.reportId}
            {...props}
            reportId={route.reportId}
            onBack={() => runtime.navigate({ section: "reports" })}
            onRegenerate={(prompt, plan) => {
              void runtime.getController().submit(prompt, plan);
              runtime.navigate({ section: "assistant" });
            }}
          />
        ) : (
          <BusinessReports
            {...props}
            onReport={(reportId) => runtime.navigate({ section: "reports", reportId })}
          />
        ))}
    </section>
  );
};
