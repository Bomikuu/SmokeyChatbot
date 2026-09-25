import { useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus } from "lucide-react";
import { deleteMascot, uploadMascot } from "@/api/assets";
import { Field } from "@/components/common/Field";
import { Notice } from "@/components/common/Notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";
import type {
  AppearanceInput,
  AssetType,
  MascotMode,
  Site,
  SpriteFrames,
  SpriteState,
} from "@/types/site";
import { MascotPreview } from "./MascotPreview";

const frameNames: SpriteState[] = ["idle", "walk1", "walk2", "speak", "sleep"];
const launchers: { value: MascotMode; label: string }[] = [
  { value: "smokey", label: "Smokey" },
  { value: "custom", label: "Custom mascot" },
  { value: "standard", label: "Standard chat" },
];

interface AppearanceProps {
  site: Site;
  onSave: (fields: AppearanceInput) => Promise<Site>;
}

export const Appearance = ({ site, onSave }: AppearanceProps) => {
  const [mode, setMode] = useState<MascotMode>(site.mascotMode);
  const [assetType, setAssetType] = useState<AssetType>(site.customAssetType);
  const [accent, setAccent] = useState(site.accentColor);
  const [roaming, setRoaming] = useState(site.roaming);
  const [columns, setColumns] = useState(String(site.spriteColumns));
  const [rows, setRows] = useState(String(site.spriteRows));
  const [frames, setFrames] = useState<SpriteFrames>(site.spriteFrames ?? {});
  const [hasAsset, setHasAsset] = useState(site.hasCustomAsset);
  const [assetVersion, setAssetVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await onSave({
        mascotMode: mode,
        customAssetType: assetType,
        accentColor: accent,
        roaming,
        spriteColumns: Number(columns),
        spriteRows: Number(rows),
        spriteFrames: frames,
      });
      setNotice("Appearance saved.");
    } catch (issue) {
      setError(errorMessage(issue));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await uploadMascot(site.id, file);
      setHasAsset(true);
      setAssetVersion((value) => value + 1);
      setNotice("Mascot image uploaded.");
    } catch (issue) {
      setError(errorMessage(issue));
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const removeAsset = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteMascot(site.id);
      setHasAsset(false);
      setNotice("Custom image removed.");
    } catch (issue) {
      setError(errorMessage(issue));
    } finally {
      setBusy(false);
    }
  };

  const setFrame = (name: SpriteState, axis: 0 | 1, value: string) => {
    setFrames((current) => {
      const previous = current[name] ?? [0, 0];
      return {
        ...current,
        [name]: axis === 0 ? [Number(value), previous[1]] : [previous[0], Number(value)],
      };
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <p className="text-sm text-slate-500">
            Keep Smokey, bring your own mascot, or use a standard chat button.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={save} className="space-y-6">
            <Field label="Launcher">
              <div className="grid gap-2 sm:grid-cols-3">
                {launchers.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    aria-pressed={mode === value}
                    className={`rounded-lg border px-3 py-4 text-left text-sm font-semibold transition ${mode === value ? "border-[#2f5bff] bg-[#eff6ff] text-[#2149dc]" : "border-[#dce4ef] bg-white text-slate-600 hover:border-slate-400"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Accent color">
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    aria-label="Choose accent color"
                    value={accent}
                    onChange={(event) => setAccent(event.target.value)}
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input
                    aria-label="Accent color hex value"
                    value={accent}
                    onChange={(event) => setAccent(event.target.value)}
                    maxLength={7}
                    className="mono"
                  />
                </div>
              </Field>
              <Field label="Desktop movement" help="Mobile visitors get a stationary launcher.">
                <label className="flex h-10 items-center gap-3 text-sm font-normal">
                  <input
                    type="checkbox"
                    checked={roaming}
                    onChange={(event) => setRoaming(event.target.checked)}
                    className="size-4 accent-[#2f5bff]"
                  />
                  Allow mascot to roam
                </label>
              </Field>
            </div>
            {mode === "custom" && (
              <div className="space-y-5 rounded-lg border border-[#dce4ef] bg-[#f8fafc] p-5">
                <Field label="Custom image type">
                  <select
                    value={assetType}
                    onChange={(event) => setAssetType(event.target.value as AssetType)}
                  >
                    <option value="static">Static image</option>
                    <option value="sprite">Animated sprite sheet</option>
                  </select>
                </Field>
                {assetType === "sprite" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Columns">
                        <Input
                          type="number"
                          min="1"
                          max="16"
                          value={columns}
                          onChange={(event) => setColumns(event.target.value)}
                        />
                      </Field>
                      <Field label="Rows">
                        <Input
                          type="number"
                          min="1"
                          max="16"
                          value={rows}
                          onChange={(event) => setRows(event.target.value)}
                        />
                      </Field>
                    </div>
                    <p className="text-xs text-slate-500">
                      Frame positions start at 0 in the top-left corner. Set walking frames for
                      animation.
                    </p>
                    <div className="grid gap-3">
                      {frameNames.map((name) => (
                        <div
                          key={name}
                          className="grid grid-cols-[1fr_70px_70px] items-center gap-3"
                        >
                          <span className="text-sm capitalize">{name}</span>
                          <Input
                            type="number"
                            min="0"
                            max={Math.max(0, Number(columns) - 1)}
                            aria-label={`${name} column`}
                            value={frames[name]?.[0] ?? 0}
                            onChange={(event) => setFrame(name, 0, event.target.value)}
                          />
                          <Input
                            type="number"
                            min="0"
                            max={Math.max(0, Number(rows) - 1)}
                            aria-label={`${name} row`}
                            value={frames[name]?.[1] ?? 0}
                            onChange={(event) => setFrame(name, 1, event.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <Notice message={notice} />
            <Notice message={error} error />
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save appearance"}
            </Button>
          </form>

          {mode === "custom" && (
            <div className="space-y-3 border-t border-[#e2e8f0] pt-6">
              <p className="text-sm font-semibold">Mascot image</p>
              <p className="text-xs text-slate-500">
                Upload a public PNG or WebP image under 5 MB. For sprite sheets, each grid cell
                should be the same size.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-[#cbd5e1] bg-white px-4 text-sm font-semibold hover:bg-slate-50">
                  <ImagePlus size={16} /> Upload image
                  <input
                    type="file"
                    accept="image/png,image/webp"
                    className="sr-only"
                    onChange={upload}
                    disabled={busy}
                  />
                </label>
                {hasAsset && (
                  <Button type="button" variant="outline" onClick={removeAsset} disabled={busy}>
                    Remove image
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <MascotPreview
        siteId={site.id}
        mode={mode}
        assetType={assetType}
        accent={accent}
        hasAsset={hasAsset}
        assetVersion={assetVersion}
        columns={Number(columns)}
        rows={Number(rows)}
        frames={frames}
      />
    </div>
  );
};
