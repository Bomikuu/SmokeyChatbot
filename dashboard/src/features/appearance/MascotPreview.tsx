import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { publicApiUrl } from "@/lib/config";
import type { AssetType, MascotMode, SpriteFrames } from "@/types/site";

interface MascotPreviewProps {
  siteId: string;
  mode: MascotMode;
  assetType: AssetType;
  accent: string;
  hasAsset: boolean;
  assetVersion: number;
  columns: number;
  rows: number;
  frames: SpriteFrames;
}

export const MascotPreview = ({
  siteId,
  mode,
  assetType,
  accent,
  hasAsset,
  assetVersion,
  columns,
  rows,
  frames,
}: MascotPreviewProps) => {
  const assetUrl = `/api/owner/sites/${siteId}/asset?v=${assetVersion}`;
  const idle = frames.idle ?? [0, 0];
  const spritePosition = `${columns > 1 ? (idle[0] * 100) / (columns - 1) : 0}% ${rows > 1 ? (idle[1] * 100) / (rows - 1) : 0}%`;

  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative flex h-80 items-end justify-end overflow-hidden rounded-lg border border-[#dce4ef] bg-[#eef3fa] p-5">
          <div className="absolute left-5 top-5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
            Your website
          </div>
          {mode === "standard" && (
            <div
              style={{ backgroundColor: accent }}
              className="grid size-14 place-items-center rounded-2xl text-white"
            >
              <MessageSquare size={24} />
            </div>
          )}
          {mode === "smokey" && (
            <div
              role="img"
              aria-label="Smokey preview"
              className="h-32 w-24 bg-no-repeat [image-rendering:pixelated]"
              style={{
                backgroundImage: `url(${publicApiUrl}/api/widget/default-asset)`,
                backgroundSize: "400% 200%",
                backgroundPosition: "0 0",
              }}
            />
          )}
          {mode === "custom" && hasAsset && assetType === "sprite" && (
            <div
              role="img"
              aria-label="Custom sprite preview"
              className="h-28 w-28 bg-no-repeat [image-rendering:pixelated]"
              style={{
                backgroundImage: `url(${assetUrl})`,
                backgroundSize: `${columns * 100}% ${rows * 100}%`,
                backgroundPosition: spritePosition,
              }}
            />
          )}
          {mode === "custom" && hasAsset && assetType === "static" && (
            <img
              key={assetVersion}
              src={assetUrl}
              alt="Custom mascot preview"
              className="max-h-28 max-w-28 object-contain"
            />
          )}
          {mode === "custom" && !hasAsset && (
            <div className="grid size-24 place-items-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-400">
              Upload image
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          The live widget adapts its size and position to each visitor’s screen.
        </p>
      </CardContent>
    </Card>
  );
};
