import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { withModules } from "./assistant-check-tools.mjs";
await withModules(async (load) => {
  const { usageTotals, quotaRows, quotaPercent } = await load("features/business/usageMetrics.ts");
  const { connectionCreditUsage, creditPercentLabel } = await load(
    "features/business/creditUsage.ts",
  );
  const { ConnectionCredits } = await load("features/business/ConnectionCredits.tsx");
  const { modelDetails, exampleCost } = await load("features/business/providerCatalog.ts");
  const { ModelPricing, ConnectionStatus } = await load("features/business/ProviderIdentity.tsx");
  const { UsageCharts, QuotaChart } = await load("features/business/BusinessInsights.tsx");
  const settings = {
    timezone: "Asia/Manila",
    daily_requests: 10,
    monthly_requests: 100,
    daily_tokens: 1000,
    monthly_tokens: 10000,
  };
  const usage = {
    by_model: [
      {
        connection_id_snapshot: "a",
        provider: "openai",
        model: "gpt-4.1-mini",
        calls: 5,
        input_tokens: 1200,
        output_tokens: null,
        unknown: 2,
      },
      {
        connection_id_snapshot: "b",
        provider: "gemini",
        model: "gemini-2.5-flash",
        calls: 3,
        input_tokens: 400,
        output_tokens: 100,
        unknown: 0,
      },
    ],
    limits_usage: [
      { period: "2026-10-27", requests: 12, tokens: 1001 },
      { period: "2026-10", requests: 20, tokens: 5000 },
    ],
    attempts: [],
  };
  assert.deepEqual(usageTotals(usage), { calls: 8, input: 1600, output: 100, unknown: 2 });
  assert.deepEqual(usageTotals({ ...usage, by_model: [] }), {
    calls: 0,
    input: 0,
    output: 0,
    unknown: 0,
  });
  const rows = quotaRows(usage, settings, new Date("2026-10-26T17:00:00Z"));
  assert.deepEqual(
    rows.map((row) => row.used),
    [12, 20, 1001, 5000],
  );
  assert.equal(rows[0].period, "2026-10-27");
  assert.equal(
    quotaRows(
      usage,
      { ...settings, timezone: "America/New_York" },
      new Date("2026-10-26T17:00:00Z"),
    )[0].used,
    0,
  );
  assert.equal(quotaPercent(12, 10), 120);
  assert.equal(quotaPercent(1, 0), 0);
  assert.equal(modelDetails("openrouter", "openai/gpt-4.1-mini"), undefined);
  assert.equal(modelDetails("openai", "gpt-4.1-mini-unknown"), undefined);
  assert.equal(modelDetails("gemini", "unknown-model"), undefined);
  assert.equal(exampleCost(modelDetails("openai", "gpt-4.1-mini")), 0.0012);
  const price = renderToStaticMarkup(
    React.createElement(ModelPricing, { provider: "openai", model: "gpt-4.1-mini" }),
  );
  assert.ok(price.includes("$0.00120"));
  assert.ok(price.includes("1,000 input + 500 output"));
  const unknown = renderToStaticMarkup(
    React.createElement(ModelPricing, { provider: "gemini", model: "unknown-model" }),
  );
  assert.ok(unknown.includes("Pricing unavailable"));
  assert.ok(!unknown.includes("$0.00"));
  const funded = {
    id: "funded",
    name: "Reports",
    credits_usd: "10.00",
    usage_by_model: [
      {
        provider: "openai",
        model: "gpt-4.1-mini",
        calls: 4,
        input_tokens: 1000000,
        output_tokens: 500000,
        unknown: 0,
      },
      {
        provider: "gemini",
        model: "gemini-2.5-flash",
        calls: 2,
        input_tokens: 1000000,
        output_tokens: 200000,
        unknown: 0,
      },
    ],
  };
  const credit = connectionCreditUsage(funded);
  assert.ok(Math.abs(credit.used - 2) < 0.000001);
  assert.equal(credit.percent, 20);
  assert.equal(credit.remaining, 8);
  assert.equal(connectionCreditUsage({ ...funded, usage_by_model: undefined }), null);
  assert.equal(connectionCreditUsage({ ...funded, usage_by_model: [] }).used, 0);
  const partial = connectionCreditUsage({
    ...funded,
    usage_by_model: [
      ...funded.usage_by_model,
      {
        provider: "openrouter",
        model: "unpriced",
        calls: 3,
        input_tokens: 3000,
        output_tokens: null,
        unknown: 3,
      },
    ],
  });
  assert.equal(partial.incompleteCalls, 3);
  assert.equal(partial.used, 2);
  assert.equal(connectionCreditUsage({ ...funded, credits_usd: "1.00" }).remaining, 0);
  assert.equal(creditPercentLabel(0.01), "<0.1%");
  assert.equal(
    renderToStaticMarkup(
      React.createElement(ConnectionCredits, {
        connection: { ...funded, credits_usd: undefined },
        canEdit: true,
        onEdit: () => {},
      }),
    ),
    "",
  );
  const creditHtml = renderToStaticMarkup(
    React.createElement(ConnectionCredits, {
      connection: funded,
      canEdit: false,
      onEdit: () => {},
    }),
  );
  assert.ok(creditHtml.includes('aria-valuenow="20"'));
  assert.ok(creditHtml.includes("$8.00 estimated remaining"));
  const incompleteHtml = renderToStaticMarkup(
    React.createElement(ConnectionCredits, {
      connection: {
        ...funded,
        usage_by_model: [
          {
            provider: "openrouter",
            model: "unpriced",
            calls: 3,
            input_tokens: 3000,
            output_tokens: 1000,
            unknown: 0,
          },
        ],
      },
      canEdit: false,
      onEdit: () => {},
    }),
  );
  assert.ok(!incompleteHtml.includes("estimated remaining"));
  assert.ok(incompleteHtml.includes("Estimate incomplete"));
  assert.ok(!incompleteHtml.includes("aria-valuenow"));
  const pending = renderToStaticMarkup(
    React.createElement(ConnectionStatus, { status: "untested" }),
  );
  assert.ok(pending.includes("Needs verification"));
  assert.ok(!pending.includes(">Connected<"));
  const chart = renderToStaticMarkup(React.createElement(UsageCharts, { usage }));
  assert.ok(chart.includes("1,700"));
  assert.ok(chart.includes("2 calls have incomplete"));
  assert.ok(
    renderToStaticMarkup(
      React.createElement(UsageCharts, { usage: { ...usage, by_model: [] } }),
    ).includes("No AI calls in this period"),
  );
  const quota = renderToStaticMarkup(React.createElement(QuotaChart, { usage, settings }));
  assert.equal((quota.match(/role="meter"/g) || []).length, 4);
});
console.log(
  "Business insights: exact-ID pricing, example estimates, missing usage, timezone quotas, status badges and accessible charts passed.",
);
