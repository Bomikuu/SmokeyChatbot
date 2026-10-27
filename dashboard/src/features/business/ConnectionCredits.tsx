import { useId, useRef, useState, type ComponentProps, type FormEvent } from "react";
import { CircleHelp, DollarSign, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Notice } from "@/components/common/Notice";
import { useAssistantClient } from "@/sdk/RuntimeProvider";
import type { Connection } from "@/types/assistant";
import { useBusinessAction } from "./hooks";
import { connectionCreditUsage, creditPercentLabel } from "./creditUsage";
import { usd } from "./providerCatalog";
export const ConnectionCredits = ({
  connection,
  canEdit,
  onEdit,
}: {
  connection: Connection;
  canEdit: boolean;
  onEdit: (target: HTMLButtonElement) => void;
}) => {
  const estimate = connectionCreditUsage(connection),
    hasCredits = Number(connection.credits_usd) > 0;
  const incomplete = Boolean(estimate?.incompleteCalls);
  // Older host APIs must never receive a credit write they cannot persist.
  if (connection.credits_usd === undefined) return null;
  return (
    <section
      className="space-y-3 border-t bg-muted/20 px-5 py-4 sm:px-6"
      aria-label={`Dollar credits for ${connection.name}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-xs font-semibold">
          <DollarSign className="size-3.5 text-primary" aria-hidden="true" />
          Tracked credits{" "}
          {hasCredits && (
            <span className="font-normal tabular-nums text-muted-foreground">
              {usd(Number(connection.credits_usd))} USD
            </span>
          )}
        </h4>
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            aria-label={`${hasCredits ? "Edit" : "Set"} dollar credits for ${connection.name}`}
            onClick={(event) => onEdit(event.currentTarget)}
          >
            <Pencil className="size-3" aria-hidden="true" />
            {hasCredits ? "Edit credits" : "Set credits"}
          </Button>
        )}
      </div>
      {!hasCredits ? (
        <p className="text-xs leading-5 text-muted-foreground">
          {canEdit
            ? "Enter the dollars you’ve funded to track estimated Smokey usage."
            : "An administrator can enter funded credits to track estimated usage."}
        </p>
      ) : !estimate ? (
        <p className="text-xs leading-5 text-muted-foreground">
          Usage data is unavailable. Your credits are saved; an estimate will appear when usage can
          be loaded.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
            <p className="tabular-nums">
              <span className="font-semibold">
                {incomplete ? "At least " : ""}
                {usd(estimate.used, estimate.used > 0 && estimate.used < 0.01 ? 5 : 2)}
              </span>{" "}
              estimated used
            </p>
            <p className="tabular-nums text-muted-foreground">
              {incomplete
                ? "Estimate incomplete"
                : `${usd(estimate.remaining)} estimated remaining`}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label={`Estimated credit usage for ${connection.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={incomplete ? undefined : Math.min(100, estimate.percent)}
            aria-valuetext={`${incomplete ? "At least " : ""}${usd(estimate.used, 5)} estimated usage of ${usd(estimate.credits)} funded${incomplete ? "; some usage cannot be priced" : ""}`}
            className="h-2.5 overflow-hidden rounded-full bg-secondary"
          >
            <div
              key={`${estimate.used}:${estimate.credits}`}
              className={`smokey-credit-fill h-full origin-left rounded-full ${estimate.percent >= 100 ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${Math.min(100, estimate.percent)}%` }}
            />
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            {incomplete ? (
              <>
                <CircleHelp className="mr-1 inline size-3.5" aria-hidden="true" />
                {estimate.incompleteCalls.toLocaleString()} calls have missing pricing or token
                data. The bar shows known costs only.
              </>
            ) : (
              <>
                {creditPercentLabel(estimate.percent)} of funded credits ·{" "}
                {estimate.percent >= 100 ? "Tracking budget reached" : "All recorded Smokey calls"}
              </>
            )}
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            Manual tracking and reference prices. Your provider’s actual balance may differ.
          </p>
        </>
      )}
    </section>
  );
};
export const CreditBudgetEditor = ({
  connection,
  onSaved,
  onCancel,
  onBusyChange,
  onCloseAutoFocus,
}: {
  connection: Connection;
  onSaved: () => Promise<void>;
  onCancel: () => void;
  onBusyChange: (busy: boolean) => void;
  onCloseAutoFocus: ComponentProps<typeof DialogContent>["onCloseAutoFocus"];
}) => {
  const client = useAssistantClient(),
    action = useBusinessAction(),
    inputId = useId(),
    errorId = useId();
  const [amount, setAmount] = useState(connection.credits_usd || ""),
    [validation, setValidation] = useState("");
  const input = useRef<HTMLInputElement>(null),
    busy = Boolean(action.busy);
  const save = (event: FormEvent) => {
    event.preventDefault();
    const value = amount.trim();
    if (value && (!/^\d{1,10}(\.\d{1,2})?$/.test(value) || Number(value) < 0.01)) {
      setValidation(
        "Enter a USD amount of at least $0.01 with up to two decimal places, or leave it empty to stop tracking.",
      );
      input.current?.focus();
      return;
    }
    setValidation("");
    onBusyChange(true);
    void action
      .act("Saving tracking credits…", async () => {
        await client.requestPath(`connections/${connection.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ credits_usd: value || null }),
        });
        await onSaved();
      })
      .finally(() => onBusyChange(false));
  };
  return (
    <DialogContent
      onCloseAutoFocus={onCloseAutoFocus}
      showCloseButton={!busy}
      onEscapeKeyDown={(event) => {
        if (busy) event.preventDefault();
      }}
      onInteractOutside={(event) => {
        if (busy) event.preventDefault();
      }}
      className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
    >
      <DialogHeader>
        <DialogTitle>Track dollar credits</DialogTitle>
        <DialogDescription>
          {connection.name} · Enter the total credits you’ve funded, including previous top-ups.
        </DialogDescription>
      </DialogHeader>
      <form noValidate onSubmit={save} className="space-y-4" aria-busy={busy}>
        <div className="space-y-2">
          <label htmlFor={inputId} className="text-sm font-medium">
            Total credits funded (USD)
          </label>
          <Input
            id={inputId}
            ref={input}
            value={amount}
            maxLength={13}
            inputMode="decimal"
            placeholder="25.00"
            disabled={busy}
            aria-invalid={Boolean(validation) || undefined}
            aria-describedby={errorId}
            onChange={(event) => {
              setAmount(event.target.value);
              setValidation("");
            }}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Compared with all recorded Smokey calls for this connection. Leave empty to stop
            tracking.
          </p>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Tracking only: this doesn’t purchase credits or stop provider calls. Estimates use
          recorded tokens and reference model prices, including calls before this amount was
          entered.
        </p>
        <div id={errorId}>
          <Notice message={validation || action.error} error />
        </div>
        <p role="status" className="text-xs text-muted-foreground">
          {action.busy}
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            Save credits
          </Button>
        </div>
      </form>
    </DialogContent>
  );
};
