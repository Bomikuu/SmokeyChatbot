export type AnswerMode = "portfolio" | "store" | "general";
export type MascotMode = "smokey" | "custom" | "standard";
export type AssetType = "static" | "sprite";
export type SpriteState = "idle" | "walk1" | "walk2" | "speak" | "sleep";
export type SpriteFrames = Partial<Record<SpriteState, [number, number]>>;

export interface Site {
  id: string;
  name: string;
  mode: AnswerMode;
  mascotMode: MascotMode;
  customAssetType: AssetType;
  hasCustomAsset: boolean;
  spriteColumns: number;
  spriteRows: number;
  spriteFrames: SpriteFrames;
  accentColor: string;
  roaming: boolean;
  allowedOrigins: string[];
  createdAt: string;
}

export type SiteSettingsInput = Pick<Site, "name" | "mode" | "allowedOrigins">;
export type AppearanceInput = Pick<
  Site,
  | "mascotMode"
  | "customAssetType"
  | "accentColor"
  | "roaming"
  | "spriteColumns"
  | "spriteRows"
  | "spriteFrames"
>;

export interface Usage {
  today: number;
  ownerToday: number;
  dailyLimit: number;
  ownerDailyLimit: number;
  last30Days: { requests: number; input_tokens: number; output_tokens: number };
}

export interface KnowledgeSource {
  id: number;
  title: string;
  kind: "file" | "text";
  status: "processing" | "ready" | "error";
  error: string;
  createdAt: string;
}
