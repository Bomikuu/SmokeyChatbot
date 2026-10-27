export const contractVersion = { major: 1, minor: 0 } as const;
export const sdkVersion = "1.0.0";
export type SmokeyPermission = "configure" | "generate" | "view_reports" | "delete_reports";
export type SmokeySection =
  "overview" | "assistant" | "reports" | "connections" | "appearance" | "usage";
export type SmokeyRoute = { section: SmokeySection; reportId?: string };
export interface SmokeyIdentity {
  hostId: string;
  organizationId: string;
  actorId: string;
  revision: number;
}
export interface SmokeyContext {
  identity: SmokeyIdentity;
  organization: { name: string; timezone: string };
  installed: boolean;
  enabled: boolean;
  permissions: readonly SmokeyPermission[];
  reportKinds: readonly string[];
  theme: "light" | "dark";
}
export const operations = [
  "integration.get",
  "module.enable",
  "settings.get",
  "settings.update",
  "connections.list",
  "connections.create",
  "connections.update",
  "connections.delete",
  "connections.models",
  "connections.check",
  "models.discover",
  "generations.create",
  "generations.get",
  "generations.cancel",
  "reports.list",
  "reports.get",
  "reports.rows",
  "reports.delete",
  "usage.get",
  "asset.get",
  "asset.upload",
] as const;
export type SmokeyOperation = (typeof operations)[number];
export interface SmokeyRequest {
  operation: SmokeyOperation;
  identity: Readonly<SmokeyIdentity>;
  params?: Readonly<Record<string, string | number>>;
  body?: unknown;
  idempotencyKey?: string;
  signal?: AbortSignal;
}
export interface SmokeyHostAdapter {
  contractVersion: { major: number; minor: number };
  request<T>(request: SmokeyRequest): Promise<T>;
  navigate(route: SmokeyRoute): void;
  resolveSourceLink(source: { href: string; label: string }): string | null;
}
export type SmokeyEvent =
  | { type: "ready" | "assistant-open" | "assistant-close" | "module-enabled" | "session-expired" }
  | { type: "route-requested"; route: SmokeyRoute }
  | { type: "error"; code: string };
export interface SmokeyRuntime {
  attachDashboard(container: HTMLElement, route: SmokeyRoute): void;
  detachDashboard(): void;
  setRoute(route: SmokeyRoute): void;
  updateContext(context: SmokeyContext): void;
  openAssistant(trigger?: HTMLElement): void;
  closeAssistant(): void;
  toggleAssistant(trigger?: HTMLElement): void;
  setHostOverlayActive(active: boolean): void;
  destroy(): void;
}
export interface MountSmokeyOptions {
  owner: HTMLElement;
  adapter: SmokeyHostAdapter;
  context: SmokeyContext;
  assetsBaseUrl: string;
  stylesheetUrl?: string;
  onEvent?: (event: SmokeyEvent) => void;
  bottomOffset?: number;
  pageHeader?: "inline" | "host";
}
export const sameIdentity = (a: SmokeyIdentity, b: SmokeyIdentity) =>
  a.hostId === b.hostId &&
  a.organizationId === b.organizationId &&
  a.actorId === b.actorId &&
  a.revision === b.revision;
export const accessKey = (context: SmokeyContext) =>
  JSON.stringify([
    context.identity,
    context.installed,
    context.enabled,
    [...context.permissions].sort(),
    [...context.reportKinds].sort(),
  ]);
