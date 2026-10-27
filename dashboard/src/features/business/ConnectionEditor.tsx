import { useId, useRef, useState, type FormEvent, type ComponentProps } from "react";
import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Field } from "@/components/common/Field";
import { Notice } from "@/components/common/Notice";
import { useAssistantClient } from "@/sdk/RuntimeProvider";
import { assistantPath } from "@/sdk/client";
import type { Business, Connection, ModelCandidate } from "@/types/assistant";
import { useBusinessAction } from "./hooks";
import { ModelPricing, ProviderIcon } from "./ProviderIdentity";
import { modelDetails, providers } from "./providerCatalog";
export const ConnectionEditor = ({
  business,
  connection,
  onBusyChange,
  onSaved,
  onCancel,
  onCloseAutoFocus,
}: {
  business: Business;
  connection: Connection | null;
  onBusyChange: (busy: boolean) => void;
  onSaved: () => Promise<void>;
  onCancel: () => void;
  onCloseAutoFocus: ComponentProps<typeof DialogContent>["onCloseAutoFocus"];
}) => {
  const client = useAssistantClient(),
    action = useBusinessAction(),
    keyId = useId(),
    errorId = useId();
  const nameInput = useRef<HTMLInputElement>(null),
    keyInput = useRef<HTMLInputElement>(null),
    modelInput = useRef<HTMLInputElement>(null),
    permittedInput = useRef<HTMLTextAreaElement>(null),
    advanced = useRef<HTMLDetailsElement>(null);
  const [invalidField, setInvalidField] = useState("");
  const invalid = (field: "name" | "key" | "model" | "permitted", message: string) => {
    setInvalidField(field);
    setValidation(message);
    if ((field === "model" || field === "permitted") && advanced.current)
      advanced.current.open = true;
    requestAnimationFrame(() =>
      ({ name: nameInput, key: keyInput, model: modelInput, permitted: permittedInput })[
        field
      ].current?.focus(),
    );
  };
  const [form, setForm] = useState({
    name: connection?.name || "",
    provider: connection?.provider || "openai",
    model: connection?.model || "",
    secret: "",
    permitted: connection?.permitted_models.join("\n") || "",
  });
  const [models, setModels] = useState<ModelCandidate[]>([]),
    [filter, setFilter] = useState(""),
    [discovered, setDiscovered] = useState(false),
    [validation, setValidation] = useState(""),
    [showSecret, setShowSecret] = useState(false),
    [discard, setDiscard] = useState(false);
  const busy = Boolean(action.busy);
  const dirty = Boolean(
    form.secret ||
    form.name !== (connection?.name || "") ||
    form.provider !== (connection?.provider || "openai") ||
    form.model !== (connection?.model || "") ||
    form.permitted !== (connection?.permitted_models.join("\n") || ""),
  );
  const requestClose = () => {
    if (!busy) {
      if (dirty) setDiscard(true);
      else onCancel();
    }
  };
  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (invalidField === (key === "secret" ? "key" : key)) {
      setInvalidField("");
      setValidation("");
    }
  };
  const run = async (message: string, task: () => Promise<unknown>) => {
    onBusyChange(true);
    try {
      await action.act(message, task);
    } finally {
      onBusyChange(false);
    }
  };
  const discover = () => {
    setValidation("");
    void run("Loading available models…", async () => {
      const saved = connection && !form.secret.trim();
      const result = await client.requestPath<{ models: ModelCandidate[] }>(
        assistantPath(business, saved ? `connections/${connection.id}/models/` : "models/"),
        saved
          ? {}
          : {
              method: "POST",
              body: JSON.stringify({ provider: form.provider, secret: form.secret.trim() }),
            },
      );
      setModels(result.models);
      setDiscovered(true);
      setFilter("");
    });
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const permitted = [
      ...new Set(
        form.permitted
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
    if (!form.name.trim()) {
      invalid("name", "Enter a name for this connection.");
      return;
    }
    if (!connection && !form.secret.trim()) {
      invalid("key", "Enter your provider API key.");
      return;
    }
    if (!form.model.trim()) {
      invalid("model", "Select a model or enter its exact ID.");
      return;
    }
    if (!permitted.includes(form.model.trim())) {
      invalid("permitted", "Include the selected model in permitted models.");
      return;
    }
    setValidation("");
    setInvalidField("");
    void run("Saving connection…", async () => {
      await client.requestPath(
        assistantPath(business, `connections/${connection ? connection.id + "/" : ""}`),
        {
          method: connection ? "PATCH" : "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            provider: form.provider,
            model: form.model.trim(),
            permitted_models: permitted,
            ...(form.secret.trim() ? { secret: form.secret.trim() } : {}),
          }),
        },
      );
      setForm((current) => ({ ...current, secret: "" }));
      await onSaved();
    });
  };
  const filtered = models.filter((model) =>
    `${model.id} ${model.name || ""}`.toLowerCase().includes(filter.toLowerCase().trim()),
  );
  return (
    <>
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        className="flex max-h-[90dvh] flex-col gap-5 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton={false}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          requestClose();
        }}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3"
          aria-label="Close connection editor"
          disabled={busy}
          onClick={requestClose}
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
        <DialogHeader className="shrink-0 px-5 pt-5 pr-14 sm:px-7 sm:pt-7 sm:pr-14">
          <DialogTitle className="text-xl font-semibold">
            {connection ? "Edit AI connection" : "Connect your AI"}
          </DialogTitle>
          <DialogDescription>
            Choose a provider, add your API key, and select a model for your business.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={save} className="flex min-h-0 flex-col" aria-busy={busy}>
          <div className="min-h-0 space-y-6 overflow-y-auto px-5 pb-5 sm:px-7">
            <fieldset disabled={busy || Boolean(connection)} className="space-y-3">
              <legend className="mb-3 text-sm font-semibold">AI provider</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {providers.map((provider) => (
                  <Button
                    key={provider.value}
                    type="button"
                    variant="outline"
                    aria-pressed={form.provider === provider.value}
                    className={`smokey-choice h-auto min-w-0 justify-start gap-3 whitespace-normal p-4 text-left ${form.provider === provider.value ? "border-primary bg-accent" : ""}`}
                    onClick={() => {
                      setForm((current) => ({
                        ...current,
                        provider: provider.value,
                        model: "",
                        secret: "",
                        permitted: "",
                      }));
                      setModels([]);
                      setDiscovered(false);
                      setShowSecret(false);
                      setFilter("");
                    }}
                  >
                    <ProviderIcon provider={provider.value} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{provider.label}</span>
                      <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                        {provider.description}
                      </span>
                    </span>
                    {form.provider === provider.value && (
                      <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    )}
                  </Button>
                ))}
              </div>
            </fieldset>
            {connection && (
              <p className="text-xs text-muted-foreground">
                To change provider, create a new connection with that provider’s key.
              </p>
            )}
            <Field label="Connection name">
              <Input
                autoComplete="off"
                ref={nameInput}
                aria-invalid={invalidField === "name" || undefined}
                aria-describedby={invalidField === "name" ? errorId : undefined}
                maxLength={100}
                placeholder="e.g. Business insights"
                value={form.name}
                disabled={busy}
                onChange={(event) => update("name", event.target.value)}
              />
            </Field>
            <div className="space-y-2">
              <label htmlFor={keyId} className="text-sm font-medium">
                {connection ? "Replacement API key (optional)" : "Provider API key"}
              </label>
              <div className="relative">
                <KeyRound
                  className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id={keyId}
                  ref={keyInput}
                  aria-invalid={invalidField === "key" || undefined}
                  aria-describedby={invalidField === "key" ? errorId : undefined}
                  type={showSecret ? "text" : "password"}
                  autoComplete="new-password"
                  spellCheck={false}
                  maxLength={1000}
                  className="pr-12 pl-9"
                  placeholder={
                    connection
                      ? "Leave blank to keep your saved key"
                      : "Paste your provider API key"
                  }
                  disabled={busy}
                  value={form.secret}
                  onChange={(event) => {
                    update("secret", event.target.value);
                    setModels([]);
                    setValidation("");
                    setInvalidField("");
                    setDiscovered(false);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-1 h-10"
                  disabled={busy}
                  aria-label={showSecret ? "Hide API key" : "Show API key"}
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Encrypted on the server. Your saved key is never sent back to the browser.
              </p>
            </div>
            <section className="space-y-4 border-t pt-5" aria-label="Choose model">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Choose a model</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Load models available to your API key.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || (!connection && !form.secret.trim())}
                  onClick={discover}
                >
                  {busy && action.busy.includes("models") ? (
                    <LoaderCircle
                      className="size-4 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <Search className="size-4" aria-hidden="true" />
                  )}
                  Load provider models
                </Button>
              </div>
              {discovered && (
                <>
                  <Field label="Search available models">
                    <Input
                      type="search"
                      value={filter}
                      disabled={busy}
                      placeholder="Search model name or ID…"
                      onChange={(event) => setFilter(event.target.value)}
                    />
                  </Field>
                  <p role="status" className="text-xs text-muted-foreground">
                    {filtered.length} {filtered.length === 1 ? "model" : "models"} found
                  </p>
                  <div className="grid max-h-80 gap-3 overflow-y-auto p-1 sm:grid-cols-2">
                    {filtered.map((model) => {
                      const details = modelDetails(form.provider, model.id);
                      return (
                        <article
                          key={model.id}
                          className={`rounded-lg border p-4 ${form.model === model.id ? "border-primary bg-accent/40" : "bg-card"}`}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={busy}
                            aria-pressed={form.model === model.id}
                            className="h-auto w-full justify-start whitespace-normal p-0 text-left hover:bg-transparent hover:underline"
                            onClick={() => {
                              setForm((current) => ({
                                ...current,
                                model: model.id,
                                permitted: model.id,
                              }));
                              setValidation("");
                              setInvalidField("");
                            }}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block break-words text-sm font-semibold">
                                {details?.name || model.name || model.id}
                              </span>
                              <span className="mt-1 block break-all text-xs font-normal text-muted-foreground">
                                {model.id}
                              </span>
                            </span>
                            {form.model === model.id && (
                              <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                            )}
                          </Button>
                          <p className="my-3 text-xs leading-5 text-muted-foreground">
                            {details?.description ||
                              "Available from your provider. Verify this model before using it for reports."}
                          </p>
                          <ModelPricing provider={form.provider} model={model.id} />
                        </article>
                      );
                    })}
                  </div>
                  {!filtered.length && (
                    <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                      {models.length
                        ? "No matching models. Try a different name or clear your search."
                        : "Your provider returned no compatible models. Check access or enter an exact model ID below."}
                    </p>
                  )}
                </>
              )}
              {!discovered && form.model && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="mb-2 break-all text-sm font-medium">{form.model}</p>
                  <ModelPricing provider={form.provider} model={form.model} />
                </div>
              )}
              <details
                ref={advanced}
                className="group rounded-lg border p-4"
                open={!form.model || undefined}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                  Model ID & permitted models
                  <ChevronDown className="size-4 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="mt-4 space-y-4">
                  <Field label="Selected model ID">
                    <Input
                      ref={modelInput}
                      aria-invalid={invalidField === "model" || undefined}
                      aria-describedby={invalidField === "model" ? errorId : undefined}
                      maxLength={180}
                      placeholder="Select a model above or enter its exact ID"
                      disabled={busy}
                      value={form.model}
                      onChange={(event) => update("model", event.target.value)}
                    />
                  </Field>
                  <Field
                    label="Permitted models"
                    help="One exact model ID per line. Include your selected model."
                  >
                    <Textarea
                      ref={permittedInput}
                      aria-invalid={invalidField === "permitted" || undefined}
                      aria-describedby={invalidField === "permitted" ? errorId : undefined}
                      className="resize-none"
                      rows={2}
                      disabled={busy}
                      value={form.permitted}
                      onChange={(event) => update("permitted", event.target.value)}
                    />
                  </Field>
                </div>
              </details>
              <p className="text-xs leading-5 text-muted-foreground">
                Prices are reference standard text API rates in USD, not a fixed price per prompt.
                Report generation can make multiple calls. Actual token use, reasoning, caching, and
                provider terms affect your bill.
              </p>
            </section>
          </div>
          <div className="shrink-0 space-y-3 border-t bg-muted/25 p-5 sm:px-7">
            <div id={errorId}>
              <Notice message={validation || action.error} error />
            </div>
            <p role="status" className={busy ? "text-xs text-muted-foreground" : "sr-only"}>
              {action.busy}
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" disabled={busy} onClick={requestClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && (
                  <LoaderCircle
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                )}
                Save connection
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
      <AlertDialog open={discard} onOpenChange={setDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved connection?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved changes and the API key entered here will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={onCancel}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
