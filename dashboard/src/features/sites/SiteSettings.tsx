import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { DeleteConfirmation } from "@/components/common/DeleteConfirmation";
import { Field } from "@/components/common/Field";
import { Notice } from "@/components/common/Notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/errors";
import type { AnswerMode, Site, SiteSettingsInput } from "@/types/site";

interface SiteSettingsProps {
  site: Site;
  onSave: (fields: SiteSettingsInput) => Promise<Site>;
  onDelete: () => Promise<void>;
}

export const SiteSettings = ({ site, onSave, onDelete }: SiteSettingsProps) => {
  const [name, setName] = useState(site.name);
  const [mode, setMode] = useState<AnswerMode>(site.mode);
  const [origins, setOrigins] = useState(site.allowedOrigins.join("\n"));
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await onSave({
        name,
        mode,
        allowedOrigins: origins
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setNotice("Site settings saved.");
    } catch (issue) {
      setError(errorMessage(issue));
    } finally {
      setBusy(false);
    }
  };

  const confirmSiteDeletion = async () => {
    setConfirmDelete(false);
    setBusy(true);
    try {
      await onDelete();
    } catch (issue) {
      setError(errorMessage(issue));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Site settings</CardTitle>
          <p className="text-sm text-slate-500">
            Choose what Smokey answers and where the widget can run.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={submit}>
            <Field label="Site name">
              <Input
                value={name}
                maxLength={100}
                required
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field
              label="Answer mode"
              help="Portfolio and store modes answer only from approved sources. General mode answers broad questions without live browsing."
            >
              <select value={mode} onChange={(event) => setMode(event.target.value as AnswerMode)}>
                <option value="portfolio">Portfolio</option>
                <option value="store">Store</option>
                <option value="general">General</option>
              </select>
            </Field>
            <Field
              label="Allowed website origins"
              help="One origin per line, such as https://example.com. Include the protocol and any port. HTTP is allowed only for localhost."
            >
              <Textarea
                value={origins}
                onChange={(event) => setOrigins(event.target.value)}
                placeholder="https://example.com"
              />
            </Field>
            <Notice message={notice} />
            <Notice message={error} error />
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="ring-red-200">
        <CardHeader>
          <CardTitle>Delete this site</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-lg text-sm text-slate-500">
            Removes the chatbot, uploaded sources, mascot asset, and its indexed knowledge. This
            cannot be undone.
          </p>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
          >
            <Trash2 size={15} /> Delete site
          </Button>
        </CardContent>
      </Card>

      <DeleteConfirmation
        name={`“${site.name}”`}
        description="Its chatbot, mascot, uploaded sources, and indexed knowledge will be permanently removed."
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={() => {
          void confirmSiteDeletion();
        }}
      />
    </div>
  );
};
