import {
  Activity,
  ArrowRight,
  Cable,
  FileText,
  MessageSquareText,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/common/Notice";
import { useAssistantRuntime } from "@/sdk/RuntimeProvider";
import { assistantPath } from "@/sdk/client";
import type { Connection, ReportList, Usage } from "@/types/assistant";
import type { BusinessSectionProps } from "./BusinessDashboard";
import { BusinessMascot } from "./BusinessFeedback";
import { useBusinessResource } from "./hooks";
import { QuotaChart, SummaryTile } from "./BusinessInsights";
import { ConnectionStatus, ProviderIcon } from "./ProviderIdentity";
import { number, quotaRows } from "./usageMetrics";
export const BusinessOverview = ({ business, settings }: BusinessSectionProps) => {
  const runtime = useAssistantRuntime();
  const canView = settings.permissions.includes("view_reports"),
    canConfigure = settings.permissions.includes("configure");
  const usage = useBusinessResource<Usage>(canView ? assistantPath(business, "usage/") : null);
  const reports = useBusinessResource<ReportList>(
    canView ? assistantPath(business, "reports/") : null,
  );
  const connections = useBusinessResource<Connection[]>(
    canConfigure ? assistantPath(business, "connections/") : null,
  );
  const defaultConnection = connections.data?.find(
    (item) => item.id === settings.default_connection_id,
  );
  const monthly = usage.data
    ? quotaRows(usage.data, settings).find((row) => row.key === "monthly_requests")
    : undefined;
  const available = <T,>(value: T | undefined, loading: boolean) =>
    value !== undefined ? String(value) : loading ? "…" : "—";
  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-6 rounded-xl border bg-muted/40 p-6 sm:p-7">
        <div className="max-w-xl space-y-3">
          <BusinessMascot
            business={business}
            settings={settings}
            text="Your business, a little clearer."
          />
          <h2 className="text-2xl font-semibold tracking-tight">
            Turn today’s records into useful answers.
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Get a business overview, check sales, or review attendance. Smokey works with the
            records you’re allowed to see.
          </p>
        </div>
        <Button
          onClick={() =>
            runtime.navigate({
              section:
                settings.default_connection_id || !canConfigure ? "assistant" : "connections",
            })
          }
        >
          <Sparkles className="size-4" aria-hidden="true" />
          {settings.default_connection_id || !canConfigure ? "Ask Smokey" : "Connect your AI"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          title="Saved reports"
          value={available(reports.data?.count, reports.loading)}
          detail={canView ? "Available to your business" : "Report access required"}
          Icon={FileText}
        />
        <SummaryTile
          title="Ready connections"
          value={available(
            connections.data
              ? number(connections.data.filter((item) => item.status === "ready").length)
              : undefined,
            connections.loading,
          )}
          detail={canConfigure ? "Verified AI connections" : "Administrator access required"}
          Icon={Cable}
        />
        <SummaryTile
          title="AI calls this month"
          value={available(monthly ? number(monthly.used) : undefined, usage.loading)}
          detail={
            canView
              ? `Of ${number(settings.monthly_requests)} application calls`
              : "Usage access required"
          }
          Icon={Activity}
        />
        <SummaryTile
          title="Default AI"
          value={settings.default_connection_id ? "Selected" : "Not set"}
          detail={
            defaultConnection?.model ||
            (settings.default_connection_id
              ? "Your selected business connection"
              : "Choose a verified connection to start")
          }
          Icon={Zap}
        />
      </div>
      <Notice message={usage.error || reports.error || connections.error} error />
      {(usage.error || reports.error || connections.error) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void Promise.all([usage.refresh(), reports.refresh(), connections.refresh()]);
          }}
        >
          Retry dashboard data
        </Button>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5">
          {usage.data ? (
            <QuotaChart usage={usage.data} settings={settings} compact />
          ) : (
            <section className="rounded-xl border p-6">
              <h2 className="font-semibold">Your application limits</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                {usage.loading
                  ? "Loading current usage…"
                  : canView
                    ? "Usage is unavailable. Retry to load your limits."
                    : "Usage details require report access."}
              </p>
            </section>
          )}
          {defaultConnection && (
            <section className="flex flex-wrap items-center gap-3 rounded-xl border p-5">
              <ProviderIcon provider={defaultConnection.provider} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold">{defaultConnection.name}</h2>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  {defaultConnection.model}
                </p>
              </div>
              <ConnectionStatus status={defaultConnection.status} />
            </section>
          )}
        </div>
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-3 border-b p-5">
            <div>
              <h2 className="font-semibold">Recent reports</h2>
              <p className="mt-1 text-xs text-muted-foreground">Pick up where you left off.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => runtime.navigate({ section: "reports" })}
            >
              View all
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
          {reports.data?.results.length ? (
            <ul className="divide-y">
              {reports.data.results.slice(0, 5).map((report) => (
                <li key={report.id}>
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-start gap-3 rounded-none px-5 py-4 text-left"
                    onClick={() => runtime.navigate({ section: "reports", reportId: report.id })}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileText className="size-4 text-primary" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{report.title}</span>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {new Intl.DateTimeFormat(undefined, {
                          timeZone: settings.timezone,
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(report.created_at))}
                      </span>
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-3 p-6">
              <MessageSquareText className="size-6 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-medium">
                {reports.loading
                  ? "Loading saved reports…"
                  : reports.error
                    ? "Reports couldn’t load"
                    : !canView
                      ? "Report access required"
                      : "Your next answer starts here"}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {canView
                  ? "Ask Smokey a question. Completed reports stay here for later."
                  : "Ask an administrator about access to business reports."}
              </p>
            </div>
          )}
          <div className="border-t bg-muted/30 px-5 py-4 text-xs leading-5 text-muted-foreground">
            Business dates follow {settings.timezone}. AI responses should be checked against your
            records.
          </div>
        </section>
      </div>
    </div>
  );
};
