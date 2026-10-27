import { useEffect, useRef, useState } from "react";
import { Cable, Check, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { assistantPath } from "@/sdk/client";
import { useAssistantClient } from "@/sdk/RuntimeProvider";
import type { Connection } from "@/types/assistant";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { BusinessFeedback } from "./BusinessFeedback";
import { BusinessDelete } from "./BusinessControls";
import { ConnectionCredits, CreditBudgetEditor } from "./ConnectionCredits";
import { ConnectionEditor } from "./ConnectionEditor";
import { ConnectionStatus, ModelPricing, ProviderIcon } from "./ProviderIdentity";
import { modelDetails, providerDetails } from "./providerCatalog";
import { useBusinessResource, useBusinessAction } from "./hooks";
import type { BusinessSectionProps } from "./BusinessDashboard";
export const BusinessConnections = ({ business, settings, refresh }: BusinessSectionProps) => {
  const client = useAssistantClient();
  const resource = useBusinessResource<Connection[]>(assistantPath(business, "connections/")),
    action = useBusinessAction();
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<Connection | null>(null),
    [deleting, setDeleting] = useState<Connection | null>(null),
    [editorBusy, setEditorBusy] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null),
    creditOpener = useRef<HTMLButtonElement | null>(null);
  const [creditConnection, setCreditConnection] = useState<Connection | null>(null),
    [creditBusy, setCreditBusy] = useState(false);
  useEffect(() => {
    if (open || creditConnection || action.busy || resource.loading) return;
    const refreshVisible = () => {
      if (document.visibilityState === "visible") void resource.refresh();
    };
    const timer = window.setInterval(refreshVisible, 30000);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [open, creditConnection, action.busy, resource.loading, resource.refresh]);
  const canEdit = settings.permissions.includes("configure");
  const reload = async () => {
    await Promise.all([resource.refresh(), refresh()]);
  };
  const edit = (connection: Connection | null, target: HTMLButtonElement) => {
    setEditing(connection);
    opener.current = target;
    setOpen(true);
  };
  const close = () => {
    if (!editorBusy) setOpen(false);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Your AI connections</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your first verified connection becomes the default for reports. Switch it below whenever
            you need.
          </p>
        </div>
        {canEdit && (
          <Button
            disabled={Boolean(action.busy)}
            onClick={(event) => edit(null, event.currentTarget)}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add connection
          </Button>
        )}
      </div>
      <BusinessFeedback
        business={business}
        settings={settings}
        busy={action.busy || (resource.loading && !resource.data ? "Loading AI connections…" : "")}
        error={action.error || resource.error}
        notice={action.notice}
      />
      {resource.error && (
        <Button
          variant="outline"
          onClick={() => {
            void resource.refresh();
          }}
        >
          Retry connections
        </Button>
      )}
      {!resource.loading && !resource.error && !resource.data?.length && (
        <section className="rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
          <Cable className="mx-auto size-8 text-primary" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold">Give Smokey an AI connection</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Connect OpenAI, Claude, Gemini, or OpenRouter. You control the provider, the model, and
            the usage limits.
          </p>
          {canEdit ? (
            <Button className="mt-5" onClick={(event) => edit(null, event.currentTarget)}>
              <Plus className="size-4" aria-hidden="true" />
              Add your first connection
            </Button>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Ask an owner or administrator to add a connection.
            </p>
          )}
        </section>
      )}
      <div className="grid items-start gap-5 2xl:grid-cols-2">
        {resource.data?.map((item) => {
          const isDefault = settings.default_connection_id === item.id;
          return (
            <article
              key={item.id}
              className={`overflow-hidden rounded-xl border bg-card ${isDefault ? "border-primary/40" : ""}`}
            >
              <div className="space-y-5 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProviderIcon provider={item.provider} />
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold">{item.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {providerDetails(item.provider)?.label || item.provider}
                      </p>
                    </div>
                  </div>
                  <ConnectionStatus status={item.status} isDefault={isDefault} />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {modelDetails(item.provider, item.model)?.name || item.model}
                  </p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {item.model} · Key ending {item.secret_suffix}
                  </p>
                </div>
                <ModelPricing provider={item.provider} model={item.model} />
              </div>
              <ConnectionCredits
                connection={item}
                canEdit={canEdit}
                onEdit={(target) => {
                  creditOpener.current = target;
                  setCreditConnection(item);
                }}
              />
              {canEdit && (
                <div className="flex flex-wrap items-center gap-2 border-t bg-muted/25 p-4">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(action.busy)}
                    onClick={() => {
                      void action.act(
                        "Checking your AI connection…",
                        async () => {
                          try {
                            await client.requestPath(
                              assistantPath(business, `connections/${item.id}/check/`),
                              { method: "POST" },
                            );
                          } finally {
                            await reload();
                          }
                        },
                        "Connection verified. It is ready to use.",
                      );
                    }}
                  >
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    Check connection
                  </Button>
                  <Button
                    size="sm"
                    variant={isDefault ? "ghost" : "outline"}
                    disabled={Boolean(action.busy) || item.status !== "ready" || isDefault}
                    onClick={() => {
                      void action.act(
                        "Saving your default AI…",
                        async () => {
                          await client.requestPath(assistantPath(business, "settings/"), {
                            method: "PATCH",
                            body: JSON.stringify({ default_connection_id: item.id }),
                          });
                          await refresh();
                        },
                        "Default AI connection saved.",
                      );
                    }}
                  >
                    <Check className="size-3.5" aria-hidden="true" />
                    {isDefault ? "Default connection" : "Use by default"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={Boolean(action.busy)}
                    onClick={(event) => edit(item, event.currentTarget)}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="ml-auto text-muted-foreground hover:text-destructive"
                    disabled={Boolean(action.busy)}
                    aria-label={`Remove ${item.name}`}
                    onClick={() => setDeleting(item)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <p className="flex max-w-3xl items-start gap-2 text-xs leading-6 text-muted-foreground">
        <ShieldCheck className="mt-1 size-4 shrink-0" aria-hidden="true" />
        Connection checks send a small API request and may incur charges. Your provider manages API
        usage and billing.
      </p>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        {open && (
          <ConnectionEditor
            key={editing?.id || "new"}
            business={business}
            connection={editing}
            onBusyChange={setEditorBusy}
            onCancel={close}
            onSaved={async () => {
              await reload();
              setOpen(false);
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              opener.current?.focus();
            }}
          />
        )}
      </Dialog>
      <Dialog
        open={Boolean(creditConnection)}
        onOpenChange={(next) => {
          if (!next && !creditBusy) setCreditConnection(null);
        }}
      >
        {creditConnection && (
          <CreditBudgetEditor
            key={creditConnection.id}
            connection={creditConnection}
            onBusyChange={setCreditBusy}
            onCancel={() => setCreditConnection(null)}
            onSaved={async () => {
              await resource.refresh();
              setCreditConnection(null);
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              creditOpener.current?.focus();
            }}
          />
        )}
      </Dialog>
      <BusinessDelete
        open={Boolean(deleting)}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        title={`Remove ${deleting?.name || "connection"}?`}
        busy={Boolean(action.busy)}
        error={action.error}
        onConfirm={() => {
          if (deleting)
            void action.act(
              "Removing your connection…",
              async () => {
                await client.requestPath(assistantPath(business, `connections/${deleting.id}/`), {
                  method: "DELETE",
                });
                setDeleting(null);
                await reload();
              },
              "Connection removed.",
            );
        }}
      >
        Saved reports remain available. Queued requests using this connection will stop. You will
        need to replace a removed default connection.
      </BusinessDelete>
    </div>
  );
};
