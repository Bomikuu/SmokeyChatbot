import type { AssistantSettings, Usage } from "@/types/assistant";
export const number = (value: number) => new Intl.NumberFormat().format(value);
export const usageTotals = (usage: Usage) =>
  usage.by_model.reduce(
    (total, row) => ({
      calls: total.calls + row.calls,
      input: total.input + (row.input_tokens ?? 0),
      output: total.output + (row.output_tokens ?? 0),
      unknown: total.unknown + row.unknown,
    }),
    { calls: 0, input: 0, output: 0, unknown: 0 },
  );
export const quotaRows = (usage: Usage, settings: AssistantSettings, now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: settings.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  const month = `${part("year")}-${part("month")}`,
    today = month + "-" + part("day");
  return [
    { key: "daily_requests", label: "Daily calls", period: today, metric: "requests" },
    { key: "monthly_requests", label: "Monthly calls", period: month, metric: "requests" },
    { key: "daily_tokens", label: "Daily tokens", period: today, metric: "tokens" },
    { key: "monthly_tokens", label: "Monthly tokens", period: month, metric: "tokens" },
  ].map((row) => ({
    ...row,
    used:
      usage.limits_usage.find((entry) => entry.period === row.period)?.[
        row.metric as "tokens" | "requests"
      ] ?? 0,
    limit:
      settings[
        row.key as "daily_requests" | "monthly_requests" | "daily_tokens" | "monthly_tokens"
      ],
  }));
};
export const quotaPercent = (used: number, limit: number) =>
  limit > 0 ? Math.max(0, (used / limit) * 100) : 0;
