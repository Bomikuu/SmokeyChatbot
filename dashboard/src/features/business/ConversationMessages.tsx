import { Bot, UserRound, ArrowUpRight } from "lucide-react";
import type { ConversationTurn } from "@/sdk/conversationSession";
import { assistantPath } from "@/sdk/client";
import type { Business, Report } from "@/types/assistant";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/common/Notice";
import { useBusinessResource } from "./hooks";

const AssistantReply = ({
  turn,
  business,
  onReport,
}: {
  turn: ConversationTurn;
  business: Business;
  onReport: (id: string) => void;
}) => {
  const item = turn.generation;
  const report = useBusinessResource<Report>(
    item.report_id ? assistantPath(business, `reports/${item.report_id}/`) : null,
  );
  const status =
    item.state === "cancelled"
      ? "This request was stopped."
      : item.state === "failed"
        ? item.error?.message || "This request could not finish."
        : item.state === "empty"
          ? item.clarification || "No matching records were found."
          : item.state === "queued"
            ? "Waiting to start…"
            : item.state === "searching"
              ? "Checking your business records…"
              : item.state === "generating"
                ? "Writing your summary…"
                : "Your report is ready.";
  return (
    <div className="flex items-start gap-3">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary"
        aria-hidden="true"
      >
        <Bot className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-2 pt-1">
        <p className="text-xs font-semibold">Smokey</p>
        {report.data ? (
          <>
            <h3 className="text-sm font-semibold">{report.data.title}</h3>
            <p className="whitespace-pre-wrap break-words text-sm leading-7">
              {report.data.narrative.summary}
            </p>
            <Button variant="outline" size="sm" onClick={() => onReport(report.data!.id)}>
              Open full report <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Button>
          </>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
            {report.loading ? "Opening your saved summary…" : status}
          </p>
        )}
        <Notice message={report.error} error />
        {report.error && (
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              void report.refresh();
            }}
          >
            Retry summary
          </Button>
        )}
      </div>
    </div>
  );
};
export const ConversationMessages = ({
  turns,
  business,
  onReport,
}: {
  turns: ConversationTurn[];
  business: Business;
  onReport: (id: string) => void;
}) => (
  <ol className="space-y-7" aria-label="Conversation messages">
    {turns.map((turn) => (
      <li key={turn.key} className="space-y-5">
        <div className="flex items-start gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <UserRound className="size-4" />
          </span>
          <div className="min-w-0 flex-1 rounded-xl bg-muted px-4 py-3">
            <p className="text-xs font-semibold">You</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-7">{turn.prompt}</p>
          </div>
        </div>
        <AssistantReply turn={turn} business={business} onReport={onReport} />
      </li>
    ))}
  </ol>
);
