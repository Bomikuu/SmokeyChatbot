import { Check, ImagePlus } from "lucide-react";
import { assistantPath } from "@/sdk/client";
import { useAssistantClient, useAssistantRuntime } from "@/sdk/RuntimeProvider";
import { useMemo, useState, type FormEvent } from "react";
import { type Mascot } from "@/types/assistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/Field";
import { Notice } from "@/components/common/Notice";
import { BusinessSelect } from "./BusinessControls";
import { BusinessFeedback, BusinessMascot } from "./BusinessFeedback";
import { useBusinessAction } from "./hooks";
import type { BusinessSectionProps } from "./BusinessDashboard";

const states = ["idle", "searching", "generating", "success", "empty", "error", "cancelled"];
export const BusinessAppearance = ({ business, settings, refresh }: BusinessSectionProps) => {
  const assistantClient = useAssistantClient();
  const businessApi = assistantClient.requestPath;

  const [mascot, setMascot] = useState<Mascot>({ ...settings.mascot });
  const [presentation, setPresentation] = useState(settings.presentation);
  const [validation, setValidation] = useState(""),
    [preview, setPreview] = useState(false),
    [assetRevision, setAssetRevision] = useState(0);
  const action = useBusinessAction(),
    canEdit = settings.permissions.includes("configure");
  const save = (event: FormEvent) => {
    event.preventDefault();
    setValidation("");
    if (mascot.mode === "custom" && !settings.has_mascot_asset) {
      setValidation("Upload a mascot image before choosing Custom.");
      return;
    }
    for (const dimension of [mascot.columns || 1, mascot.rows || 1])
      if (!Number.isInteger(dimension) || dimension < 1 || dimension > 32) {
        setValidation("Use whole numbers from 1 to 32 for sprite columns and rows.");
        return;
      }
    for (const frame of Object.values(mascot.frames || {}))
      if (
        frame.some((value) => !Number.isInteger(value) || value < 0) ||
        frame[0] >= (mascot.columns || 1) ||
        frame[1] >= (mascot.rows || 1)
      ) {
        setValidation("Each frame must fit inside your sprite grid.");
        return;
      }
    void action.act(
      "Saving your mascot and presentation…",
      async () => {
        await businessApi(assistantPath(business, "settings/"), {
          method: "PATCH",
          body: JSON.stringify({ mascot, presentation }),
        });
        await refresh();
      },
      "Appearance saved. Your PixelCore assistant uses the same settings.",
    );
  };
  const choices = useMemo(
    () =>
      [
        {
          mode: "smokey" as const,
          title: "Smokey",
          description: "The original animated office cat.",
        },
        {
          mode: "custom" as const,
          title: "Custom mascot",
          description: settings.has_mascot_asset
            ? "Your privately uploaded mascot."
            : "Upload your own image or sprite.",
        },
        {
          mode: "standard" as const,
          title: "Chat button",
          description: "A familiar, minimal chat launcher.",
        },
      ].map((choice) => ({
        ...choice,
        settings: { ...settings, mascot: { ...mascot, mode: choice.mode } },
      })),
    [settings, mascot],
  );
  const draftSettings = useMemo(
    () => ({ ...settings, mascot, presentation }),
    [settings, mascot, presentation],
  );
  return (
    <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)]">
      <div className="space-y-6">
        <BusinessFeedback
          business={business}
          settings={settings}
          busy={action.busy}
          error={action.error || validation}
          notice={action.notice}
        />
        <form noValidate onSubmit={save} className="space-y-6">
          <fieldset disabled={!canEdit || Boolean(action.busy)} className="space-y-3">
            <legend className="mb-3 text-sm font-semibold">Choose your mascot</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {choices.map((choice) => (
                <Button
                  key={choice.mode}
                  type="button"
                  variant="outline"
                  aria-pressed={mascot.mode === choice.mode}
                  className={`smokey-choice h-auto min-w-0 flex-col items-stretch gap-4 whitespace-normal p-4 text-left ${mascot.mode === choice.mode ? "border-primary bg-accent/40" : ""}`}
                  onClick={() => {
                    setMascot((current) => ({ ...current, mode: choice.mode }));
                    setValidation("");
                  }}
                >
                  <span
                    className="grid h-28 w-full place-items-center rounded-lg bg-muted/60"
                    aria-hidden="true"
                  >
                    {choice.mode === "custom" && !settings.has_mascot_asset ? (
                      <ImagePlus className="size-9 text-muted-foreground" />
                    ) : (
                      <span className="inline-flex items-center gap-2.5 rounded-xl border bg-card px-4 py-2">
                        <BusinessMascot
                          key={choice.mode + assetRevision}
                          business={business}
                          settings={choice.settings}
                          showStatus={false}
                        />
                        <span className="text-xs font-medium">Ask Smokey</span>
                      </span>
                    )}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{choice.title}</span>
                    {mascot.mode === choice.mode && (
                      <Check className="size-4 text-primary" aria-hidden="true" />
                    )}
                  </span>
                  <span className="text-xs font-normal leading-5 text-muted-foreground">
                    {choice.description}
                  </span>
                </Button>
              ))}
            </div>
          </fieldset>
          {mascot.mode === "custom" && (
            <div className="space-y-5">
              <Field
                label="Upload mascot image"
                help="PNG or WebP, up to 5 MB and 4096 × 4096 pixels. Stored privately for this business."
              >
                <Input
                  type="file"
                  accept="image/png,image/webp"
                  disabled={!canEdit || Boolean(action.busy)}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    if (
                      file.size > 5 * 1024 * 1024 ||
                      !["image/png", "image/webp"].includes(file.type)
                    ) {
                      setValidation("Choose a PNG or WebP image under 5 MB.");
                      return;
                    }
                    setValidation("");
                    void action.act(
                      "Uploading your private mascot…",
                      async () => {
                        const data = new FormData();
                        data.append("file", file);
                        await businessApi(assistantPath(business, "asset/"), {
                          method: "POST",
                          body: data,
                        });
                        await refresh();
                        setAssetRevision((value) => value + 1);
                      },
                      "Mascot uploaded. Save appearance to apply your selection.",
                    );
                  }}
                />
              </Field>
              <BusinessSelect
                id="Image type"
                value={mascot.asset_type || "static"}
                onChange={(asset_type) =>
                  setMascot((current) => ({
                    ...current,
                    asset_type: asset_type as "static" | "sprite",
                  }))
                }
                disabled={!canEdit || Boolean(action.busy)}
                options={[
                  { value: "static", label: "Static image" },
                  { value: "sprite", label: "Sprite sheet" },
                ]}
              />
              {mascot.asset_type === "sprite" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {(["columns", "rows"] as const).map((key) => (
                      <Field key={key} label={"Sprite " + key}>
                        <Input
                          type="number"
                          min={1}
                          max={32}
                          disabled={!canEdit || Boolean(action.busy)}
                          value={mascot[key] || 1}
                          onChange={(event) =>
                            setMascot((current) => ({
                              ...current,
                              [key]: Number(event.target.value),
                            }))
                          }
                        />
                      </Field>
                    ))}
                  </div>
                  <p className="text-xs leading-6 text-muted-foreground">
                    Choose a zero-based column and row for each status. Columns and rows must divide
                    the image into equal cells.
                  </p>
                  {states.map((state) => (
                    <div key={state} className="grid grid-cols-[1fr_5rem_5rem] items-end gap-3">
                      <span className="py-2 text-sm capitalize">{state}</span>
                      {[0, 1].map((axis) => (
                        <Field key={axis} label={state + (axis === 0 ? " column" : " row")}>
                          <Input
                            type="number"
                            min={0}
                            disabled={!canEdit || Boolean(action.busy)}
                            value={mascot.frames?.[state]?.[axis] || 0}
                            onChange={(event) =>
                              setMascot((current) => {
                                const frame: [number, number] = [
                                  ...(current.frames?.[state] || [0, 0]),
                                ];
                                frame[axis] = Number(event.target.value);
                                return {
                                  ...current,
                                  frames: { ...current.frames, [state]: frame },
                                };
                              })
                            }
                          />
                        </Field>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <BusinessSelect
            id="Assistant presentation"
            value={presentation}
            disabled={!canEdit || Boolean(action.busy)}
            onChange={(value) => setPresentation(value as "drawer" | "modal")}
            options={[
              { value: "drawer", label: "Right-side drawer" },
              { value: "modal", label: "Centered modal" },
            ]}
          />
          {canEdit ? (
            <Button type="submit" disabled={Boolean(action.busy)}>
              Save appearance
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Only an owner or administrator can change appearance.
            </p>
          )}
        </form>
      </div>
      <section className="space-y-5 self-start rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Live preview</h2>
        <p className="text-xs leading-5 text-muted-foreground">
          Preview your selection before saving.
        </p>
        {mascot.mode === "custom" && !settings.has_mascot_asset ? (
          <div className="flex items-center gap-3 py-4">
            <ImagePlus className="size-10 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Upload an image to preview your custom mascot.
            </p>
          </div>
        ) : (
          <BusinessMascot
            key={assetRevision}
            business={business}
            settings={draftSettings}
            state={preview ? "generating" : "idle"}
            text={preview ? "Writing your summary…" : "Ready when you are."}
          />
        )}
        <Button variant="outline" onClick={() => setPreview((value) => !value)}>
          {preview ? "Stop preview" : "Preview loading feedback"}
        </Button>
        <Notice message="Previewing does not call an AI provider or consume tokens." />
        <p className="text-sm leading-6 text-muted-foreground">
          Use Ask Smokey in the toolbar to try the saved drawer or modal. Closing it preserves the
          current request.
        </p>
      </section>
    </div>
  );
};
