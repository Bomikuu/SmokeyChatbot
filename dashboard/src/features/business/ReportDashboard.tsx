import {
  Banknote,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  Clock3,
  ShieldCheck,
  CircleCheck,
  Activity,
  CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Report } from "@/types/assistant";
import { label } from "@/sdk/format";
import { SummaryTile } from "./BusinessInsights";
import { reportChartData, reportMoney } from "./reportPresentation";

const icons: Record<string, LucideIcon> = {
  ordered_sales: Banknote,
  orders: ShoppingCart,
  items_sold: Package,
  average_order_value: Receipt,
  paid_orders: CircleCheck,
  collected_payments: Banknote,
  attended_employees: Users,
  late_employees: Clock3,
  excused_late_employees: ShieldCheck,
  unexcused_late_employees: Clock3,
  currently_clocked_in: Activity,
};
const money = new Set(["ordered_sales", "average_order_value", "collected_payments"]);
export const ReportSummary = ({ report }: { report: Report }) => {
  const metrics = report.facts.metrics;
  const primary =
    report.facts.kind === "sales" || report.facts.kind === "daily"
      ? ["ordered_sales", "orders", "items_sold", "average_order_value"]
      : ["attended_employees", "late_employees", "excused_late_employees", "currently_clocked_in"];
  const entries = [...new Set([...primary, ...Object.keys(metrics)])].filter(
    (key) => key !== "currency" && metrics[key] != null,
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Report summary">
      {entries.map((key) => (
        <SummaryTile
          key={key}
          title={label(key)}
          value={
            money.has(key)
              ? reportMoney(metrics[key], metrics.currency)
              : Number.isFinite(Number(metrics[key]))
                ? Number(metrics[key]).toLocaleString()
                : String(metrics[key])
          }
          detail={
            key === "currently_clocked_in"
              ? "At report generation"
              : "For the saved reporting period"
          }
          Icon={icons[key] || Activity}
        />
      ))}
    </div>
  );
};
export const ReportCharts = ({ report }: { report: Report }) => {
  const data = reportChartData(report);
  const isSales = data.unit === "Ordered sales";
  const maximum = Math.max(1, ...data.points.map((point) => Math.max(0, point.value)));
  const total = data.payments.reduce((sum, item) => sum + Math.max(0, Number(item.sales)), 0);
  let cursor = 0;
  const segments = data.payments.map((item, index) => {
    const amount = Math.max(0, Number(item.sales));
    const start = cursor;
    cursor += total ? (amount / total) * 100 : 0;
    return { ...item, amount, start, end: cursor, opacity: Math.max(0.35, 1 - index * 0.17) };
  });
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[1.5fr_1fr]">
      <figure className="min-w-0 rounded-xl border bg-card p-5 sm:p-6">
        <figcaption>
          <h3 className="font-semibold">{data.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.snapshot
              ? `${data.unit} by day · ${report.facts.timezone}`
              : "This older report does not contain saved chart data."}
          </p>
        </figcaption>
        {data.points.length ? (
          <>
            <div className="mt-7 grid grid-cols-[3rem_minmax(0,1fr)] gap-2">
              <div
                className="flex h-44 flex-col justify-between text-[10px] tabular-nums text-muted-foreground"
                aria-hidden="true"
              >
                <span>{maximum.toLocaleString(undefined, { notation: "compact" })}</span>
                <span>{(maximum / 2).toLocaleString(undefined, { notation: "compact" })}</span>
                <span>0</span>
              </div>
              <div
                className="flex h-44 min-w-0 items-end gap-1 border-b border-l px-2"
                role="img"
                aria-label={`${data.unit}. ${data.points.map((point) => `${point.date}: ${point.value}`).join("; ")}`}
              >
                {data.points.map((point) => (
                  <div
                    key={point.date}
                    className="flex h-full min-w-0 flex-1 items-end"
                    title={`${point.date}: ${isSales ? reportMoney(point.value, report.facts.metrics.currency) : point.value} · ${point.detail}`}
                  >
                    <div
                      className="smokey-report-bar w-full rounded-t-sm bg-primary"
                      style={{
                        height: `${(Math.max(0, point.value) / maximum) * 100}%`,
                        minHeight: point.value > 0 ? 2 : 0,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div />
              <div className="flex justify-between gap-3 pt-2 text-[10px] tabular-nums text-muted-foreground">
                <span>{data.points[0]?.date}</span>
                <span>{data.points.length > 1 ? data.points.at(-1)?.date : ""}</span>
              </div>
            </div>
            <details className="mt-4 text-xs text-muted-foreground">
              <summary className="cursor-pointer underline-offset-4 hover:underline">
                View chart values
              </summary>
              <ul className="mt-3 max-h-44 space-y-2 overflow-auto">
                {data.points.map((point) => (
                  <li key={point.date} className="flex justify-between gap-3">
                    <span>{point.date}</span>
                    <span>
                      {isSales
                        ? reportMoney(point.value, report.facts.metrics.currency)
                        : point.value.toLocaleString()}{" "}
                      · {point.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </>
        ) : (
          <p className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden="true" />
            {data.snapshot
              ? "No records in this reporting period."
              : "Regenerate to include chart snapshots."}
          </p>
        )}
      </figure>
      <figure className="min-w-0 rounded-xl border bg-card p-5 sm:p-6">
        <figcaption>
          <h3 className="font-semibold">
            {isSales ? "Sales by payment status" : "Summary highlights"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {isSales ? "Share of ordered sales in this snapshot." : "From your generated report."}
          </p>
        </figcaption>
        {segments.length && total > 0 ? (
          <div className="mt-6 flex flex-wrap items-center gap-6">
            <svg
              viewBox="0 0 120 120"
              className="size-40 shrink-0 -rotate-90"
              role="img"
              aria-label={`Sales by payment status, ${reportMoney(total, report.facts.metrics.currency)}`}
            >
              <circle cx="60" cy="60" r="45" fill="none" stroke="var(--muted)" strokeWidth="18" />
              {segments.map((item) => (
                <circle
                  key={item.label}
                  cx="60"
                  cy="60"
                  r="45"
                  fill="none"
                  stroke="var(--primary)"
                  strokeOpacity={item.opacity}
                  strokeWidth="18"
                  pathLength="100"
                  strokeDasharray={`${item.end - item.start} ${100 - (item.end - item.start)}`}
                  strokeDashoffset={-item.start}
                />
              ))}
            </svg>
            <ul className="min-w-0 flex-1 space-y-4 text-xs">
              {segments.map((item) => (
                <li key={item.label} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full bg-primary"
                      style={{ opacity: item.opacity }}
                    />
                    {label(item.label)}
                  </span>
                  <span className="font-medium tabular-nums">
                    {Math.round((item.amount / total) * 100)}% ·{" "}
                    {reportMoney(item.amount, report.facts.metrics.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="mt-6 space-y-4 text-sm leading-6">
            {(report.narrative.highlights?.length
              ? report.narrative.highlights
              : ["See the report summary and recorded facts below."]
            ).map((text, index) => (
              <li key={index} className="flex items-start gap-3">
                <CircleCheck className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        )}
      </figure>
    </div>
  );
};
