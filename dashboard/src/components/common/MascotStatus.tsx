import { publicApiUrl } from "@/lib/config";
import { MessageSquare } from "lucide-react";
import type { Site } from "@/types/site";

export type MascotState =
  "idle" | "searching" | "generating" | "success" | "empty" | "error" | "cancelled";
const labels: Record<MascotState, string> = {
  idle: "Ready when you are.",
  searching: "Finding your information…",
  generating: "Writing your summary…",
  success: "All ready.",
  empty: "No matching records.",
  error: "This request could not finish.",
  cancelled: "Generation stopped.",
};

export const MascotStatus = ({
  state = "idle",
  label,
  site,
}: {
  state?: MascotState;
  label?: string;
  site?: Site;
}) => {
  const busy = state === "searching" || state === "generating";
  const custom = site?.mascotMode === "custom" && site.hasCustomAsset;
  const standard =
    site?.mascotMode === "standard" || (site?.mascotMode === "custom" && !site.hasCustomAsset);
  const columns = custom ? site.spriteColumns : 4;
  const rows = custom ? site.spriteRows : 2;
  const frame = custom
    ? (state === "generating" ? site.spriteFrames.speak : site.spriteFrames.idle) || [0, 0]
    : state === "generating"
      ? [3, 0]
      : [0, 0];
  const url = custom
    ? `/api/owner/sites/${site.id}/asset`
    : `${publicApiUrl}/api/widget/default-asset`;
  return (
    <div className="flex items-center gap-3" aria-busy={busy}>
      {standard ? (
        <MessageSquare className="size-10 shrink-0 text-primary" aria-hidden="true" />
      ) : custom && site.customAssetType === "static" ? (
        <img src={url} alt="" className="size-16 shrink-0 object-contain" />
      ) : (
        <div
          aria-hidden="true"
          className={`h-16 w-12 shrink-0 bg-no-repeat [image-rendering:pixelated] ${busy ? "mascot-pending" : ""}`}
          style={{
            backgroundImage: `url(${url})`,
            backgroundSize: `${columns * 100}% ${rows * 100}%`,
            backgroundPosition: `${columns > 1 ? (frame[0] * 100) / (columns - 1) : 0}% ${rows > 1 ? (frame[1] * 100) / (rows - 1) : 0}%`,
          }}
        />
      )}
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="text-sm leading-6 text-muted-foreground"
      >
        {label || labels[state]}
      </p>
    </div>
  );
};
