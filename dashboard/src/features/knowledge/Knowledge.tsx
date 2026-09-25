import { useCallback, useEffect, useState, type FormEvent } from "react";
import { FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import {
  addFileSource,
  addTextSource,
  deleteSource,
  listSources,
  retrySource,
} from "@/api/knowledge";
import { DeleteConfirmation } from "@/components/common/DeleteConfirmation";
import { Field } from "@/components/common/Field";
import { Notice } from "@/components/common/Notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/errors";
import type { KnowledgeSource, Site } from "@/types/site";

export const Knowledge = ({ site }: { site: Site }) => {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [mode, setMode] = useState<"text" | "file">("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [activeSourceId, setActiveSourceId] = useState<number | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<KnowledgeSource | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setSources(await listSources(site.id));
  }, [site.id]);

  useEffect(() => {
    void load().catch((issue: unknown) => setError(errorMessage(issue)));
  }, [load]);

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "file" && !file) return;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const source =
        mode === "file" && file
          ? await addFileSource(site.id, file, title.trim())
          : await addTextSource(site.id, title.trim(), body.trim());
      setSources((current) => [source, ...current]);
      setTitle("");
      setBody("");
      setFile(null);
      setFileInputKey((value) => value + 1);
      setNotice(
        source.status === "error"
          ? "Source saved, but indexing failed. Retry from the list below."
          : "Source added. Indexing may take a moment.",
      );
    } catch (issue) {
      setError(errorMessage(issue));
    } finally {
      setBusy(false);
    }
  };

  const retry = async (source: KnowledgeSource) => {
    setActiveSourceId(source.id);
    setError("");
    setNotice("");
    try {
      await retrySource(site.id, source.id);
      await load();
      setNotice("Indexing retried.");
    } catch (issue) {
      setError(errorMessage(issue));
    } finally {
      setActiveSourceId(null);
    }
  };

  const remove = async () => {
    if (!sourceToDelete) return;
    const source = sourceToDelete;
    setSourceToDelete(null);
    setActiveSourceId(source.id);
    setError("");
    setNotice("");
    try {
      await deleteSource(site.id, source.id);
      await load();
      setNotice("Source deleted.");
    } catch (issue) {
      setError(errorMessage(issue));
    } finally {
      setActiveSourceId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add knowledge</CardTitle>
          <p className="text-sm text-slate-500">
            Add only information you want website visitors to see. Portfolio and store answers use
            these sources.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="space-y-5">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "text" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("text")}
              >
                Paste text
              </Button>
              <Button
                type="button"
                variant={mode === "file" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("file")}
              >
                Upload file
              </Button>
            </div>
            <Field label="Source title">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={160}
                required={mode === "text"}
                placeholder={mode === "file" ? "Optional — defaults to filename" : "About my work"}
              />
            </Field>
            {mode === "text" ? (
              <Field label="Content" help="Up to 50,000 characters.">
                <Textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  maxLength={50000}
                  required
                  placeholder="Write the facts visitors may ask about…"
                />
              </Field>
            ) : (
              <Field label="Document" help="PDF, TXT, or Markdown, up to 10 MB.">
                <Input
                  key={fileInputKey}
                  type="file"
                  accept=".pdf,.txt,.md"
                  required
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </Field>
            )}
            <Notice message={notice} />
            <Notice message={error} error />
            <Button type="submit" disabled={busy || (mode === "file" && !file)}>
              <Upload size={16} />
              {busy ? "Adding…" : "Add source"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Sources</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {sources.length} of 25 allowed in the free beta
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Refresh source statuses"
            onClick={() => {
              void load().catch((issue: unknown) => setError(errorMessage(issue)));
            }}
          >
            <RefreshCw size={17} />
          </Button>
        </CardHeader>
        <CardContent>
          {sources.length ? (
            <ul className="divide-y divide-slate-100">
              {sources.map((source) => (
                <li
                  key={source.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <FileText size={18} className="mt-0.5 shrink-0 text-[#2f5bff]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{source.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {source.kind} · {source.status}
                      </p>
                      {source.error && <p className="mt-1 text-xs text-red-700">{source.error}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {source.status === "error" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={activeSourceId === source.id}
                        onClick={() => {
                          void retry(source);
                        }}
                      >
                        Retry
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${source.title}`}
                      disabled={activeSourceId === source.id}
                      onClick={() => setSourceToDelete(source)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">
              No sources yet. Add one above to teach this chatbot about your site.
            </p>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmation
        name={sourceToDelete ? `“${sourceToDelete.title}”` : "this source"}
        description="Its uploaded file and indexed content will be permanently removed."
        open={sourceToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setSourceToDelete(null);
        }}
        onConfirm={() => {
          void remove();
        }}
      />
    </div>
  );
};
