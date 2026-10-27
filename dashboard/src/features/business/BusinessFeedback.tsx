import { assistantPath } from "@/sdk/client";
import { useOptionalAssistantRuntime } from "@/sdk/RuntimeProvider";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { type AssistantSettings, type Business } from "@/types/assistant";
import { Notice } from "@/components/common/Notice";
import type { MascotState } from "@/components/common/MascotStatus";

export const BusinessMascot = ({
  business,
  settings,
  state = "idle",
  text = "Ready when you are.",
  showStatus = true,
}: {
  business?: Business;
  settings?: AssistantSettings | null;
  state?: MascotState;
  text?: string;
  showStatus?: boolean;
}) => {
  const runtime = useOptionalAssistantRuntime();

  const [asset, setAsset] = useState("");
  const [assetFailed, setAssetFailed] = useState(false);
  const custom = settings?.mascot.mode === "custom" && settings.has_mascot_asset;
  useEffect(() => {
    let active = true,
      url = "";
    setAsset("");
    setAssetFailed(false);
    if (runtime && business && custom) {
      // The image endpoint needs a bearer token, so its response must remain private.
      const load = async () => {
        try {
          const blob = await runtime!.getClient().request<Blob>("asset.get");
          url = URL.createObjectURL(blob);
          if (active) setAsset(url);
          else URL.revokeObjectURL(url);
        } catch {
          if (active) setAssetFailed(true);
        }
      };
      void load();
    }
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [business?.public_id, custom, settings?.mascot, settings?.has_mascot_asset]);
  const standard = settings?.mascot.mode === "standard" || (custom && (!asset || assetFailed));
  const sprite = !custom || settings?.mascot.asset_type === "sprite";
  const columns = custom ? settings?.mascot.columns || 1 : 4;
  const rows = custom ? settings?.mascot.rows || 1 : 2;
  const frame = custom
    ? settings?.mascot.frames?.[state] || [0, 0]
    : state === "generating"
      ? [3, 0]
      : [0, 0];
  const busy = state === "searching" || state === "generating";
  return (
    <span className="flex items-center gap-3" aria-busy={busy}>
      {standard ? (
        <MessageSquare className="size-10 text-primary" aria-hidden="true" />
      ) : !sprite ? (
        <img className="size-16 object-contain" src={asset} alt="" />
      ) : (
        <span
          aria-hidden="true"
          className={
            "h-16 w-12 shrink-0 bg-no-repeat [image-rendering:pixelated] " +
            (busy ? "mascot-pending" : "")
          }
          style={{
            backgroundImage:
              "url(" +
              (custom
                ? asset
                : (runtime?.getSnapshot().assetsBaseUrl || "/") + "office-cat-sprite.webp") +
              ")",
            backgroundSize: columns * 100 + "% " + rows * 100 + "%",
            backgroundPosition:
              (columns > 1 ? (frame[0] * 100) / (columns - 1) : 0) +
              "% " +
              (rows > 1 ? (frame[1] * 100) / (rows - 1) : 0) +
              "%",
          }}
        />
      )}
      {showStatus && (
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="text-sm leading-6 text-muted-foreground"
        >
          {text}
        </span>
      )}
    </span>
  );
};

// Shares the authenticated transport; a blob never receives a public asset URL.
export const BusinessFeedback = ({
  busy,
  error,
  notice,
  business,
  settings,
}: {
  busy?: string;
  error?: string;
  notice?: string;
  business?: Business;
  settings?: AssistantSettings | null;
}) => {
  if (!busy && !error && !notice) return null;
  return (
    <div className="space-y-2">
      {busy && (
        <BusinessMascot business={business} settings={settings} state="searching" text={busy} />
      )}
      <Notice message={error || ""} error />
      <Notice message={notice || ""} />
    </div>
  );
};
