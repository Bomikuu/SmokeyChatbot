import { useEffect, useState } from "react";
import { Download, Search, RotateCcw } from "lucide-react";
import type { ReportTable, Row } from "@/types/assistant";
import type { BusinessSectionProps } from "./BusinessDashboard";
import { assistantPath } from "@/sdk/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BusinessDataTable, BusinessSelect } from "./BusinessControls";
import { BusinessFeedback } from "./BusinessFeedback";
import { useBusinessResource } from "./hooks";
import { downloadRows, reportColumns } from "./reportPresentation";

export const SavedReportTable = ({
  business,
  settings,
  reportId,
  tableKey,
  table,
}: BusinessSectionProps & { reportId: string; tableKey: string; table: ReportTable }) => {
  const [offset, setOffset] = useState(0),
    [size, setSize] = useState(20);
  const [draft, setDraft] = useState(""),
    [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(draft.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [draft]);
  const resource = useBusinessResource<{ count: number; results: Row[] }>(
    assistantPath(
      business,
      `reports/${reportId}/tables/${encodeURIComponent(tableKey)}/?offset=${offset}&page_size=${size}&search=${encodeURIComponent(search)}`,
    ),
  );
  const rows =
    resource.data?.results ||
    (offset === 0 && !search && !resource.error ? table.rows.slice(0, size) : []);
  const count = resource.data?.count ?? table.stored ?? table.total;
  const pending = draft.trim() !== search || resource.loading;
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
        <div>
          <h3 className="font-semibold">
            {table.label}{" "}
            <span className="font-normal text-muted-foreground">({count.toLocaleString()})</span>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {table.truncated
              ? `First ${table.stored} rows saved; summary totals include all ${table.total} matching records.`
              : "Saved records for this reporting period."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!rows.length || pending || Boolean(resource.error)}
          onClick={() => downloadRows(rows, `${tableKey}-page-${offset / size + 1}.csv`)}
        >
          <Download className="size-3.5" aria-hidden="true" />
          Export this page
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-0 flex-1">
          <label htmlFor={`report-search-${tableKey}`} className="sr-only">
            Search {table.label.toLowerCase()}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id={`report-search-${tableKey}`}
              type="search"
              maxLength={100}
              placeholder="Search products, SKU, orders, or employees…"
              className="pl-9"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={!draft}
          onClick={() => {
            setDraft("");
            setSearch("");
            setOffset(0);
          }}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset
        </Button>
      </div>
      <div className="px-5">
        <BusinessFeedback
          busy={pending ? "Loading saved report rows…" : ""}
          error={resource.error}
        />
        {resource.error && (
          <Button
            className="mb-4"
            variant="outline"
            size="sm"
            onClick={() => {
              void resource.refresh();
            }}
          >
            Retry rows
          </Button>
        )}
      </div>
      <div className="px-5 pb-5" aria-busy={pending}>
        <BusinessDataTable
          rows={rows}
          columns={reportColumns(table.rows)}
          timezone={settings.timezone}
          empty={
            search ? "No saved records match this search." : "No records in this reporting period."
          }
        />
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t bg-muted/30 px-5 py-4">
        <p className="text-xs tabular-nums text-muted-foreground" role="status">
          {count
            ? `${rows.length ? offset + 1 : 0}–${offset + rows.length} of ${count.toLocaleString()} saved records`
            : "0 saved records"}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <BusinessSelect
            id="Rows per page"
            value={String(size)}
            onChange={(value) => {
              setSize(Number(value));
              setOffset(0);
            }}
            options={[20, 50, 100].map((value) => ({ value: String(value), label: String(value) }))}
            disabled={pending}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={offset === 0 || pending}
            onClick={() => setOffset((value) => Math.max(0, value - size))}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={offset + size >= count || pending}
            onClick={() => setOffset((value) => value + size)}
          >
            Next
          </Button>
        </div>
      </footer>
    </section>
  );
};
