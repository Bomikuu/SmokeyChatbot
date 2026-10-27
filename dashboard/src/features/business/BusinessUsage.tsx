import { assistantPath } from "@/sdk/client";
import { SlidersHorizontal } from "lucide-react";
import { UsageCharts, UsageSummary, QuotaChart } from "./BusinessInsights";
import { display } from "@/sdk/format";
import { useAssistantClient, useAssistantRuntime } from "@/sdk/RuntimeProvider";
import { useEffect, useState, type FormEvent } from "react";
import { type Usage } from "@/types/assistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/Field";
import { BusinessDataTable } from "./BusinessControls";
import { BusinessFeedback } from "./BusinessFeedback";
import { useBusinessResource, useBusinessAction } from "./hooks";
import type { BusinessSectionProps } from "./BusinessDashboard";
const fields = [
  { key: "daily_requests", name: "Daily AI calls" },
  { key: "monthly_requests", name: "Monthly AI calls" },
  { key: "daily_tokens", name: "Daily tokens" },
  { key: "monthly_tokens", name: "Monthly tokens" },
] as const;
export const BusinessUsage = ({ business, settings, refresh }: BusinessSectionProps) => {
  const assistantClient = useAssistantClient();
  const businessApi = assistantClient.requestPath;

  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [query, setQuery] = useState("");
  const [validation, setValidation] = useState("");
  const [limits, setLimits] = useState({
    daily_requests: settings.daily_requests,
    monthly_requests: settings.monthly_requests,
    daily_tokens: settings.daily_tokens,
    monthly_tokens: settings.monthly_tokens,
  });
  useEffect(() => {
    setLimits({
      daily_requests: settings.daily_requests,
      monthly_requests: settings.monthly_requests,
      daily_tokens: settings.daily_tokens,
      monthly_tokens: settings.monthly_tokens,
    });
  }, [
    settings.daily_requests,
    settings.monthly_requests,
    settings.daily_tokens,
    settings.monthly_tokens,
  ]);
  const resource = useBusinessResource<Usage>(assistantPath(business, "usage/" + query));
  const action = useBusinessAction();
  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (from && to && from > to) {
      setValidation("Choose an end date on or after the start date.");
      return;
    }
    setValidation("");
    setQuery(
      "?" +
        new URLSearchParams({
          ...(from ? { date_from: from } : {}),
          ...(to ? { date_to: to } : {}),
        }),
    );
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    for (const field of fields) {
      const value = limits[field.key],
        minimum = field.key.endsWith("tokens") ? 1000 : 1,
        maximum = field.key.endsWith("tokens")
          ? 1000000000
          : field.key === "daily_requests"
            ? 100000
            : 1000000;
      if (!Number.isInteger(value) || value < minimum || value > maximum) {
        setValidation(
          field.name + " must be a whole number from " + minimum + " to " + maximum + ".",
        );
        return;
      }
    }
    setValidation("");
    void action.act(
      "Saving application limits…",
      async () => {
        await businessApi(assistantPath(business, "settings/"), {
          method: "PATCH",
          body: JSON.stringify(limits),
        });
        await refresh();
        await resource.refresh();
      },
      "Usage limits saved.",
    );
  };
  return (
    <div className="space-y-8">
      <BusinessFeedback
        business={business}
        settings={settings}
        busy={action.busy || (resource.loading ? "Loading your AI usage…" : "")}
        error={action.error || resource.error || validation}
        notice={action.notice}
      />
      <form noValidate onSubmit={apply} className="flex flex-wrap items-end gap-4">
        <Field label="From">
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </Field>
        <Button type="submit" variant="outline" disabled={resource.loading}>
          Apply dates
        </Button>
      </form>
      <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
        Calls include report interpretation, summaries, and connection checks. Unknown usage may
        still have been billed. Application limits are separate from your provider’s balance and
        invoice. Dates follow {settings.timezone}. With no dates selected, usage covers this month
        to date.
      </p>
      {resource.error && (
        <Button
          variant="outline"
          onClick={() => {
            void resource.refresh();
          }}
        >
          Retry usage
        </Button>
      )}
      {resource.data && (
        <>
          <UsageSummary usage={resource.data} />
          <QuotaChart usage={resource.data} settings={settings} />
          <UsageCharts usage={resource.data} />
        </>
      )}
      {resource.data && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Model usage details</h2>
          <BusinessDataTable
            columns={[
              "provider",
              "model",
              "calls",
              "input_tokens",
              "output_tokens",
              "unknown_usage",
            ]}
            rows={(resource.data?.by_model || []).map((row) => ({
              provider: row.provider,
              model: row.model,
              calls: row.calls,
              input_tokens: display(row.input_tokens),
              output_tokens: display(row.output_tokens),
              unknown_usage: row.unknown,
            }))}
            empty="No AI calls in this period."
          />
        </section>
      )}
      {settings.permissions.includes("configure") && (
        <form noValidate onSubmit={save} className="max-w-2xl space-y-5 border-t pt-7">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
            Edit application limits
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <Field key={field.key} label={field.name}>
                <Input
                  type="number"
                  min={field.key.endsWith("tokens") ? 1000 : 1}
                  step={1}
                  value={limits[field.key]}
                  disabled={Boolean(action.busy)}
                  onChange={(event) =>
                    setLimits((current) => ({
                      ...current,
                      [field.key]: Number(event.target.value),
                    }))
                  }
                />
              </Field>
            ))}
          </div>
          <Button type="submit" disabled={Boolean(action.busy)}>
            Save limits
          </Button>
        </form>
      )}
      {resource.data && (
        <section className="space-y-4 border-t pt-7">
          <h2 className="text-lg font-semibold">Recent AI calls</h2>
          <BusinessDataTable
            columns={[
              "provider",
              "model",
              "purpose",
              "outcome",
              "report_state",
              "input_tokens",
              "output_tokens",
            ]}
            rows={(resource.data?.attempts || []).map((row) => ({
              provider: row.provider,
              model: row.model,
              purpose: row.purpose,
              outcome: row.outcome,
              report_state: row.generation_state || "Not a report request",
              input_tokens: display(row.input_tokens),
              output_tokens: display(row.output_tokens),
            }))}
          />
        </section>
      )}
    </div>
  );
};
