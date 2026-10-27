import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleHelp,
  type LucideIcon,
} from "lucide-react";
import type { AssistantSettings, Usage } from "@/types/assistant";
import { ProviderIcon } from "./ProviderIdentity";
import { number, quotaPercent, quotaRows, usageTotals } from "./usageMetrics";
export const SummaryTile = ({
  title,
  value,
  detail,
  Icon,
}: {
  title: string;
  value: string;
  detail: string;
  Icon: LucideIcon;
}) => (
  <article className="smokey-summary min-w-0 rounded-xl border bg-accent/40 p-5">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{title}</p>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
    </div>
    <p className="mt-4 break-words text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
    <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{detail}</p>
  </article>
);
export const QuotaChart = ({
  usage,
  settings,
  compact = false,
}: {
  usage: Usage;
  settings: AssistantSettings;
  compact?: boolean;
}) => (
  <section
    className="space-y-5 rounded-xl border bg-card p-5 sm:p-6"
    aria-label="Application quota usage"
  >
    <div>
      <h2 className="font-semibold">{compact ? "Your application limits" : "Current limits"}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Today and this month · {settings.timezone}
      </p>
    </div>
    <div className={compact ? "space-y-5" : "grid gap-x-8 gap-y-6 sm:grid-cols-2"}>
      {quotaRows(usage, settings).map(({ key, label, used, limit }) => {
        const percent = quotaPercent(used, limit),
          near = percent >= 80;
        return (
          <div key={key}>
            <div className="mb-2 flex items-baseline justify-between gap-3 text-xs">
              <h3 className="font-medium">{label}</h3>
              <span className="tabular-nums text-muted-foreground">
                {number(used)} / {number(limit)}
              </span>
            </div>
            <div
              role="meter"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={limit}
              aria-valuenow={Math.min(used, limit)}
              aria-valuetext={`${number(used)} of ${number(limit)} used, ${Math.round(percent)} percent`}
              className="h-2.5 overflow-hidden rounded-full bg-secondary"
            >
              <div
                className={`smokey-chart-bar h-full rounded-full ${near ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
            <p
              className={`mt-1.5 text-xs tabular-nums ${near ? "font-medium text-destructive" : "text-muted-foreground"}`}
            >
              {percent >= 100
                ? "Limit reached"
                : near
                  ? "Approaching limit"
                  : `${Math.round(percent)}% used`}{" "}
              · {number(Math.max(0, limit - used))} remaining
            </p>
          </div>
        );
      })}
    </div>
    <p className="text-xs leading-5 text-muted-foreground">
      Includes reserved and uncertain usage. These are application limits, separate from your
      provider’s balance.
    </p>
  </section>
);
export const UsageCharts = ({ usage }: { usage: Usage }) => {
  const totals = usageTotals(usage),
    max = Math.max(1, ...usage.by_model.map((row) => row.calls)),
    tokens = totals.input + totals.output;
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
      <figure className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
        <figcaption>
          <h2 className="font-semibold">AI calls by model</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            All calls in the selected period.
          </p>
        </figcaption>
        {usage.by_model.length ? (
          <div className="space-y-5">
            {usage.by_model.map((row) => (
              <div
                key={row.connection_id_snapshot + row.model}
                className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3"
              >
                <ProviderIcon provider={row.provider} small />
                <div>
                  <div className="mb-2 flex items-baseline justify-between gap-3 text-xs">
                    <span className="break-all font-medium">{row.model}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {number(row.calls)} calls
                    </span>
                  </div>
                  <div className="h-3 rounded-sm bg-secondary" aria-hidden="true">
                    <div
                      className="smokey-chart-bar h-full rounded-sm bg-primary"
                      style={{ width: `${(row.calls / max) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-sm leading-6 text-muted-foreground">
            No AI calls in this period. Generate a report to see model usage here.
          </p>
        )}
      </figure>
      <figure className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
        <figcaption>
          <h2 className="font-semibold">Token breakdown</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Recorded input and output in the selected period.
          </p>
        </figcaption>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          {number(tokens)}
          <span className="ml-2 text-xs font-normal tracking-normal text-muted-foreground">
            recorded tokens
          </span>
        </p>
        <div className="flex h-10 overflow-hidden rounded-md bg-secondary" aria-hidden="true">
          <div
            className="smokey-chart-bar h-full bg-primary"
            style={{ width: tokens ? `${(totals.input / tokens) * 100}%` : "0%" }}
          />
          <div
            className="smokey-chart-bar h-full bg-[var(--smokey-output)]"
            style={{ width: tokens ? `${(totals.output / tokens) * 100}%` : "0%" }}
          />
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: "Input", value: totals.input, Icon: ArrowDownToLine },
            { label: "Output", value: totals.output, Icon: ArrowUpFromLine },
          ].map(({ label, value, Icon }) => (
            <div key={label}>
              <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </dt>
              <dd className="mt-1 font-semibold tabular-nums">{number(value)}</dd>
            </div>
          ))}
        </dl>
        {totals.unknown > 0 && (
          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <CircleHelp className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {number(totals.unknown)} calls have incomplete token usage; their missing tokens are
            excluded.
          </p>
        )}
        {!tokens && (
          <p className="text-xs text-muted-foreground">No recorded tokens in this period.</p>
        )}
      </figure>
    </div>
  );
};
export const UsageSummary = ({ usage }: { usage: Usage }) => {
  const total = usageTotals(usage);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryTile
        title="AI calls"
        value={number(total.calls)}
        detail="Across the selected period"
        Icon={Activity}
      />
      <SummaryTile
        title="Input tokens"
        value={number(total.input)}
        detail="Recorded tokens sent to your AI"
        Icon={ArrowDownToLine}
      />
      <SummaryTile
        title="Output tokens"
        value={number(total.output)}
        detail="Recorded tokens returned by your AI"
        Icon={ArrowUpFromLine}
      />
      <SummaryTile
        title="Incomplete usage"
        value={number(total.unknown)}
        detail="Calls with missing token counts"
        Icon={CircleHelp}
      />
    </div>
  );
};
