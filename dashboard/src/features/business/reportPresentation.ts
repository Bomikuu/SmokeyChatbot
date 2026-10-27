import type { Report, Row } from "@/types/assistant";
export const reportMoney = (value: unknown, currency: unknown) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Unknown";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: String(currency || "PHP"),
    }).format(amount);
  } catch {
    return `${String(currency || "")} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`.trim();
  }
};
export const reportColumns = (rows: Row[]) =>
  Object.keys(rows[0] || {}).filter(
    (key) => !["image_url", "image", "thumbnail", "currency"].includes(key),
  );
export const reportChartData = (report: Report) => {
  const charts = report.facts.charts;
  if (charts?.sales && (charts.sales.length || !charts.attendance?.length))
    return {
      title: "Sales overview",
      unit: "Ordered sales",
      points: charts.sales.map((row) => ({
        date: row.date,
        value: Number(row.sales),
        detail: `${row.orders} orders`,
      })),
      payments: charts.payments || [],
      snapshot: true,
    };
  if (charts?.attendance)
    return {
      title: "Attendance overview",
      unit: "Recorded clock-ins",
      points: charts.attendance.map((row) => ({
        date: row.date,
        value: row.records,
        detail: `${row.records} records`,
      })),
      payments: [],
      snapshot: true,
    };
  return { title: "Report overview", unit: "", points: [], payments: [], snapshot: false };
};
export const reportCsv = (rows: Row[]) => {
  const columns = reportColumns(rows);
  const cell = (value: unknown) => {
    let text = value == null ? "" : String(value);
    if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [
    columns.map(cell).join(","),
    ...rows.map((row) => columns.map((key) => cell(row[key])).join(",")),
  ].join("\r\n");
};
export const downloadRows = (rows: Row[], filename: string) => {
  const csv = reportCsv(rows);
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
