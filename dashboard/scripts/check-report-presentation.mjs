import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { withModules } from "./assistant-check-tools.mjs";
await withModules(async (load) => {
  const { reportMoney, reportChartData, reportCsv } = await load(
    "features/business/reportPresentation.ts",
  );
  const { ReportSummary, ReportCharts } = await load("features/business/ReportDashboard.tsx");
  const { BusinessDataTable } = await load("features/business/BusinessControls.tsx");
  const { parseAssistantPath } = await load("sdk/paths.ts");
  const { pixelCoreOperation } = await load("hosts/pixelcore/operations.ts");
  const parsed = parseAssistantPath(
    "reports/11111111-1111-4111-8111-111111111111/tables/transactions/?page_size=20&search=Tote%20%2F%20blue%3A%20large",
  );
  const path = pixelCoreOperation({
    ...parsed,
    identity: { organizationId: "11111111-1111-4111-8111-111111111111" },
  }).path;
  assert.equal(
    new URL(path, "https://example.test").searchParams.get("search"),
    "Tote / blue: large",
  );
  assert.equal(new URL(path, "https://example.test").searchParams.get("page_size"), "20");
  const report = {
    facts: {
      kind: "sales",
      timezone: "Asia/Manila",
      metrics: {
        currency: "PHP",
        ordered_sales: "200.00",
        orders: 1,
        items_sold: 2,
        average_order_value: "200.00",
      },
      tables: {},
      charts: {
        sales: [{ date: "2026-10-26", sales: "200.00", orders: 1 }],
        payments: [{ label: "paid", sales: "200.00", orders: 1 }],
      },
    },
    narrative: { summary: "One order", highlights: [] },
  };
  assert.ok(reportMoney("200.00", "PHP").includes("200.00"));
  assert.equal(reportChartData(report).points[0].value, 200);
  const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
  const cards = render(ReportSummary, { report });
  assert.equal((cards.match(/smokey-summary/g) || []).length, 4);
  assert.ok(!cards.includes("previous period"));
  const charts = render(ReportCharts, { report });
  assert.ok(charts.includes("Sales overview") && charts.includes("Sales by payment status"));
  assert.ok(charts.includes("View chart values"));
  const old = { ...report, facts: { ...report.facts, charts: undefined } };
  assert.equal(reportChartData(old).snapshot, false);
  const dailyAttendance = {
    ...report,
    facts: {
      ...report.facts,
      kind: "daily",
      charts: { sales: [], attendance: [{ date: "2026-10-26", records: 4 }] },
    },
  };
  assert.equal(reportChartData(dailyAttendance).title, "Attendance overview");
  assert.ok(
    render(ReportCharts, { report: old }).includes("Regenerate to include chart snapshots"),
  );
  const rows = [
    {
      product: "Canvas tote",
      image_url: null,
      quantity: 2,
      total: "200.00",
      currency: "PHP",
      payment: "paid",
    },
  ];
  const table = render(BusinessDataTable, { rows });
  assert.ok(table.includes("Product image unavailable"));
  assert.ok(!table.includes("Image url") && !table.includes(">Currency<"));
  assert.ok(
    render(BusinessDataTable, {
      rows: [{ ...rows[0], image_url: "javascript:alert(1)" }],
    }).includes("Product image unavailable"),
  );
  assert.ok(
    render(BusinessDataTable, {
      rows: [{ ...rows[0], image_url: "https://example.test/product.jpg" }],
    }).includes('loading="lazy"'),
  );
  const csv = reportCsv([
    { product: '=HYPERLINK("bad")', sku: "a,b", image_url: "private.jpg", currency: "PHP" },
  ]);
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes('"a,b"'));
  assert.ok(!csv.includes("private.jpg"));
  console.log(
    "Report presentation: saved charts, honest legacy fallback, uniform tiles, image placeholders and escaped CSV passed.",
  );
});
