import { useAssistantRuntime, useRuntimeSnapshot } from "@/sdk/RuntimeProvider";
import { useEffect, useRef, type FormEvent } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  CornerDownLeft,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { type AssistantSettings, type Business } from "@/types/assistant";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/components/common/Notice";
import { Field } from "@/components/common/Field";
import type { MascotState } from "@/components/common/MascotStatus";
import { BusinessMascot } from "./BusinessFeedback";
import { type useGeneration } from "./hooks";
import { ConversationMessages } from "./ConversationMessages";

const suggestions = [
  {
    kind: "daily",
    title: "The daily picture",
    text: "Summarize today's business",
    description: "A concise overview of today’s available records.",
    Icon: CalendarDays,
  },
  {
    kind: "sales",
    title: "How are sales today?",
    text: "Show today's sales totals",
    description: "Review sales and order totals in one summary.",
    Icon: ChartNoAxesCombined,
  },
  {
    kind: "attendance",
    title: "Who’s on the team today?",
    text: "Who attended today?",
    description: "See attendance from your employee records.",
    Icon: Users,
  },
  {
    kind: "late",
    title: "Review late arrivals",
    text: "Who arrived late today?",
    description: "Check recorded late arrivals for today.",
    Icon: Clock3,
  },
];
export const BusinessConversation = ({
  business,
  settings,
  generation,
  onReport,
  onConnections,
  compact = false,
}: {
  business: Business;
  settings: AssistantSettings;
  generation: ReturnType<typeof useGeneration>;
  onReport: (id: string) => void;
  onConnections: () => void;
  compact?: boolean;
}) => {
  const runtime = useAssistantRuntime();
  const composer = useRef<HTMLTextAreaElement | null>(null);
  const { context } = useRuntimeSnapshot();
  const { state, interrupted, busy, submit, resume, stop } = generation;
  const prompt = generation.draft,
    setPrompt = generation.setDraft;
  const turns = generation.turns || [];
  const scroller = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [turns.length]);
  const mascotState = ({ queued: "searching", succeeded: "success", failed: "error" }[
    state.state
  ] || state.state) as MascotState;
  const text =
    (
      {
        idle: "Ready when you are.",
        queued: "Waiting to start…",
        searching: "Checking your business records…",
        generating: "Writing your summary…",
        succeeded: "Your report is ready.",
        empty: "Search complete.",
        failed: "This request could not finish.",
        cancelled: "Generation stopped.",
      } as Record<string, string>
    )[state.state] || "Ready when you are.";
  const canSend = Boolean(
    prompt.trim() &&
    !busy &&
    settings.default_connection_id &&
    settings.permissions.includes("generate"),
  );
  const sendPrompt = () => {
    if (canSend) void submit(prompt.trim());
  };
  const send = (event: FormEvent) => {
    event.preventDefault();
    sendPrompt();
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div ref={scroller} className="min-h-0 flex-1 space-y-5 overflow-auto px-1">
        <BusinessMascot business={business} settings={settings} state={mascotState} text={text} />
        {!turns.length && state.state === "idle" && (
          <section className={compact ? "space-y-3 py-1" : "space-y-5 py-2"}>
            <div>
              <h2
                className={
                  compact ? "text-base font-semibold" : "text-2xl font-semibold tracking-tight"
                }
              >
                What would you like to know?
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                {compact
                  ? "Pick a question or write your own."
                  : "Start with a question below, then make it your own."}{" "}
                Dates follow {settings.timezone}.
              </p>
            </div>
            <div className={compact ? "grid gap-2" : "grid gap-3 sm:grid-cols-2"}>
              {suggestions
                .filter((item) => context.reportKinds.includes(item.kind))
                .map(({ text: value, title, description, Icon }) => (
                  <Button
                    key={value}
                    type="button"
                    variant="outline"
                    aria-pressed={prompt === value}
                    className={`smokey-suggestion group h-auto justify-start gap-3 whitespace-normal text-left ${compact ? "min-h-10 items-center px-3 py-2.5" : "items-start p-4"} ${prompt === value ? "border-primary bg-accent" : ""}`}
                    onClick={() => {
                      setPrompt(value);
                      composer.current?.focus();
                    }}
                  >
                    <span
                      className={
                        compact
                          ? "shrink-0 text-primary"
                          : "mt-0.5 rounded-lg bg-accent p-2 text-primary"
                      }
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{title}</span>
                      {!compact && (
                        <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                          {description}
                        </span>
                      )}
                    </span>
                    <ArrowRight
                      className={`smokey-suggestion-arrow size-3.5 shrink-0 text-muted-foreground ${compact ? "" : "mt-2"}`}
                      aria-hidden="true"
                    />
                  </Button>
                ))}
            </div>
            <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Suggestions fill your draft. AI usage starts when you generate a report.
            </p>
          </section>
        )}
        <ConversationMessages turns={turns} business={business} onReport={onReport} />
        {Boolean(turns.length) && (
          <p className="text-xs text-muted-foreground">
            Recent conversation retained for this tab session.
          </p>
        )}
        <Notice message={interrupted} error />
        {interrupted && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void resume();
            }}
          >
            Recover this request
          </Button>
        )}
      </div>
      <form
        noValidate
        onSubmit={send}
        className="smokey-composer shrink-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5"
      >
        <Field label="Ask Smokey">
          <Textarea
            ref={(node) => {
              composer.current = node;
              runtime.registerComposer(node || undefined);
            }}
            data-smokey-composer
            rows={compact ? 2 : 3}
            className={`${compact ? "min-h-20" : "min-h-28"} resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0`}
            maxLength={4000}
            value={prompt}
            disabled={busy}
            onKeyDown={(event) => {
              if (
                (event.ctrlKey || event.metaKey) &&
                event.key === "Enter" &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                sendPrompt();
              }
            }}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="e.g. Summarize sales and orders for today…"
          />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <CornerDownLeft className="size-3" aria-hidden="true" />
              Ctrl / ⌘ + Enter to generate
            </p>
            <p className="tabular-nums">{prompt.length.toLocaleString()} / 4,000 characters</p>
          </div>
          {busy ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void stop();
              }}
            >
              Stop generation
            </Button>
          ) : (
            <Button type="submit" disabled={!canSend}>
              <Send className="size-4" aria-hidden="true" />
              Generate report
            </Button>
          )}
        </div>
        {!settings.default_connection_id && (
          <p className="text-xs text-muted-foreground">
            {settings.permissions.includes("configure") ? (
              <>
                Choose and verify a default AI connection to enable reports.{" "}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={onConnections}
                >
                  Choose default connection
                </Button>
              </>
            ) : (
              "Ask an owner or administrator to choose and verify a default AI connection."
            )}
          </p>
        )}
        {!settings.permissions.includes("generate") && (
          <p className="text-xs leading-6 text-muted-foreground">
            Your current role cannot generate reports. Ask an administrator for access.
          </p>
        )}
        {interrupted && (
          <p className="text-xs leading-6 text-muted-foreground">
            Recovering reuses this request. A stopped provider call may still consume usage.
          </p>
        )}
      </form>
    </div>
  );
};
