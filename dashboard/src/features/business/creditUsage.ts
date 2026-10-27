import type { Connection } from "@/types/assistant";
import { modelDetails } from "./providerCatalog";
export const connectionCreditUsage = (connection: Connection) => {
  if (!Array.isArray(connection.usage_by_model)) return null;
  let used = 0,
    incompleteCalls = 0;
  for (const row of connection.usage_by_model) {
    const rate = modelDetails(row.provider, row.model);
    if (!rate) {
      incompleteCalls += row.calls;
      continue;
    }
    used +=
      ((row.input_tokens ?? 0) * rate.input + (row.output_tokens ?? 0) * rate.output) / 1000000;
    incompleteCalls += row.unknown;
  }
  const credits = connection.credits_usd ? Number(connection.credits_usd) : 0;
  return {
    used,
    credits,
    incompleteCalls,
    percent: credits > 0 ? (used / credits) * 100 : 0,
    remaining: Math.max(0, credits - used),
  };
};
export const creditPercentLabel = (percent: number) =>
  percent > 0 && percent < 0.1
    ? "<0.1%"
    : `${percent.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
