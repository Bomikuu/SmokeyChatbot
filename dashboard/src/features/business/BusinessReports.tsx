import { assistantPath } from "@/sdk/client";
import { useAssistantClient } from "@/sdk/RuntimeProvider";
import { useState } from "react";
import { type GenerationPlan, type Report, type ReportList } from "@/types/assistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/Field";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BusinessDelete } from "./BusinessControls";
import { BusinessFeedback } from "./BusinessFeedback";
import { useBusinessResource, useBusinessAction } from "./hooks";
import { ReportSummary, ReportCharts } from "./ReportDashboard";
import { SavedReportTable } from "./SavedReportTable";
import { CalendarDays, ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import type { BusinessSectionProps } from "./BusinessDashboard";

export const BusinessReports = ({
  business,
  settings,
  onReport,
}: BusinessSectionProps & { onReport: (id: string) => void }) => {
  const [offset, setOffset] = useState(0),
    [search, setSearch] = useState("");
  const resource = useBusinessResource<ReportList>(
    assistantPath(business, "reports/?offset=" + offset),
  );
  const rows = (resource.data?.results || []).filter((row) =>
    row.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="space-y-5">
      <BusinessFeedback
        business={business}
        settings={settings}
        busy={resource.loading ? "Finding your saved reports…" : ""}
        error={resource.error}
      />
      <div className="max-w-sm">
        <Field label="Filter titles on this page">
          <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </Field>
      </div>
      <div className="overflow-auto rounded-lg border">
        <Table>
          {!resource.loading && !rows.length && (
            <TableCaption className="pb-4">
              {search
                ? "No titles match on this page."
                : "Your generated reports will appear here. Ask Smokey to create your first report."}
            </TableCaption>
          )}
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              <TableHead>Generated</TableHead>
              <TableHead>Model</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Button
                    variant="link"
                    className="h-auto whitespace-normal p-0 text-left"
                    onClick={() => onReport(row.id)}
                  >
                    {row.title}
                  </Button>
                </TableCell>
                <TableCell>
                  {new Date(row.created_at).toLocaleString(undefined, {
                    timeZone: settings.timezone,
                  })}
                </TableCell>
                <TableCell className="break-all">{row.model}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          disabled={offset === 0 || resource.loading}
          onClick={() => setOffset((value) => value - 20)}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          {resource.data?.count || 0} saved reports
        </span>
        <Button
          variant="outline"
          disabled={offset + 20 >= (resource.data?.count || 0) || resource.loading}
          onClick={() => setOffset((value) => value + 20)}
        >
          Next
        </Button>
      </div>
    </section>
  );
};
export const BusinessReportView = (
  props: BusinessSectionProps & {
    reportId: string;
    onBack: () => void;
    onRegenerate: (prompt: string, plan: GenerationPlan) => void;
  },
) => {
  const assistantClient = useAssistantClient();
  const businessApi = assistantClient.requestPath;

  const { business, settings, reportId, onBack, onRegenerate } = props;
  const resource = useBusinessResource<Report>(
    assistantPath(business, "reports/" + reportId + "/"),
  );
  const [deleting, setDeleting] = useState(false);
  const action = useBusinessAction(),
    report = resource.data;
  const sourceUrl = (path: string) =>
    assistantClient.resolveSourceLink({ href: path, label: "Source records" });
  return (
    <div className="space-y-7">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to reports
      </Button>
      <BusinessFeedback
        business={business}
        settings={settings}
        busy={action.busy || (resource.loading ? "Opening your saved report…" : "")}
        error={action.error || resource.error}
      />
      {resource.error && (
        <Button
          variant="outline"
          onClick={() => {
            void resource.refresh();
          }}
        >
          Retry report
        </Button>
      )}
      {report && (
        <>
          <header className="space-y-4 border-b pb-6">
            <h2 className="text-2xl font-semibold tracking-tight">{report.title}</h2>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4" aria-hidden="true" /> {report.facts.date_from} –{" "}
              {report.facts.date_to} · {report.facts.timezone}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(report.created_at).toLocaleString(undefined, {
                timeZone: settings.timezone,
              })}{" "}
              · {report.provider} / {report.model}
            </p>
            <div className="flex flex-wrap gap-3">
              {settings.permissions.includes("generate") && (
                <Button
                  variant="outline"
                  onClick={() =>
                    onRegenerate(
                      "Regenerate " +
                        report.facts.kind +
                        " report from " +
                        report.facts.date_from +
                        " to " +
                        report.facts.date_to,
                      {
                        kind: report.facts.kind,
                        date_from: report.facts.date_from,
                        date_to: report.facts.date_to,
                      },
                    )
                  }
                >
                  <RotateCcw className="size-4" aria-hidden="true" /> Regenerate · uses AI
                </Button>
              )}
              {settings.permissions.includes("delete_reports") && (
                <Button variant="ghost" onClick={() => setDeleting(true)}>
                  <Trash2 className="size-4" aria-hidden="true" /> Delete report
                </Button>
              )}
            </div>
          </header>
          <ReportSummary report={report} />
          <ReportCharts report={report} />
          <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
            <h3 className="text-lg font-semibold">Summary</h3>
            <p className="max-w-3xl whitespace-pre-wrap text-sm leading-7">
              {report.narrative.summary}
            </p>
            {Boolean(report.narrative.highlights?.length) && (
              <ul className="list-disc space-y-2 pl-5 text-sm leading-7">
                {report.narrative.highlights?.map((value, index) => (
                  <li key={index}>{value}</li>
                ))}
              </ul>
            )}
          </section>
          {Boolean(report.facts.unavailable_sources?.length) && (
            <section className="space-y-3 rounded-lg border p-4">
              <h3 className="font-semibold">Unavailable information</h3>
              {report.facts.unavailable_sources?.map((value) => (
                <p key={value} className="text-sm text-muted-foreground">
                  {value}
                </p>
              ))}
            </section>
          )}
          {Object.entries(report.facts.tables).map(([key, table]) => (
            <SavedReportTable key={key} {...props} tableKey={key} table={table} />
          ))}
          <footer className="space-y-4 border-t pt-6">
            <h3 className="font-semibold">Source records</h3>
            <div className="flex flex-wrap gap-4">
              {report.facts.sources.map((source) => {
                const url = sourceUrl(source.href);
                return url ? (
                  <a
                    className="text-sm underline underline-offset-4"
                    key={source.href}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.label}
                  </a>
                ) : null;
              })}
            </div>
            <p className="max-w-3xl text-xs leading-6 text-muted-foreground">
              Totals and tables are a saved snapshot of recorded facts. The AI summary is generated
              text; check the source records when making decisions. Missing clock-ins do not prove
              absence. Usage records remain when a saved report is deleted.
            </p>
          </footer>
        </>
      )}
      <BusinessDelete
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this report?"
        busy={Boolean(action.busy)}
        error={action.error}
        onConfirm={() => {
          void action.act("Deleting the saved report…", async () => {
            await businessApi(assistantPath(business, "reports/" + reportId + "/"), {
              method: "DELETE",
            });
            setDeleting(false);
            onBack();
          });
        }}
      >
        This removes the saved summary and its detail snapshot. Usage records remain.
      </BusinessDelete>
    </div>
  );
};
