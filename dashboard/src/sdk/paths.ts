import type { SmokeyOperation } from "./contracts";
import { SmokeyAdapterError } from "./errors";
export interface OperationPath {
  operation: SmokeyOperation;
  params: Record<string, string | number>;
}
export const parseAssistantPath = (path: string, method = "GET"): OperationPath => {
  const routePath = path?.split("?")[0] || "";
  if (
    !path ||
    path.startsWith("/") ||
    /%2e|%2f|%5c/i.test(routePath) ||
    /(^|\/)\.\.(\/|$)|:|\\/.test(routePath) ||
    path.includes("#")
  )
    throw new SmokeyAdapterError("INVALID_OPERATION", "Unsupported assistant operation.");
  const url = new URL(path, "https://smokey.invalid/");
  const params: Record<string, string | number> = Object.fromEntries(url.searchParams);
  const patterns: [RegExp, Partial<Record<string, SmokeyOperation>>][] = [
    [/^settings\/$/, { GET: "settings.get", PATCH: "settings.update" }],
    [/^connections\/$/, { GET: "connections.list", POST: "connections.create" }],
    [
      /^connections\/([^/]+)\/(models|check)\/$/,
      { GET: "connections.models", POST: "connections.check" },
    ],
    [/^connections\/([^/]+)\/$/, { PATCH: "connections.update", DELETE: "connections.delete" }],
    [/^models\/$/, { POST: "models.discover" }],
    [/^generations\/$/, { POST: "generations.create" }],
    [/^generations\/([^/]+)\/cancel\/$/, { POST: "generations.cancel" }],
    [/^generations\/([^/]+)\/$/, { GET: "generations.get" }],
    [/^reports\/$/, { GET: "reports.list" }],
    [/^reports\/([^/]+)\/tables\/([^/]+)\/$/, { GET: "reports.rows" }],
    [/^reports\/([^/]+)\/$/, { GET: "reports.get", DELETE: "reports.delete" }],
    [/^usage\/$/, { GET: "usage.get" }],
    [/^asset\/$/, { GET: "asset.get", POST: "asset.upload" }],
  ];
  for (const [pattern, methods] of patterns) {
    const match = url.pathname.slice(1).match(pattern);
    if (!match) continue;
    const operation = methods[method.toUpperCase()];
    if (!operation) break;
    if (match[1])
      params[
        operation.startsWith("connections")
          ? "connectionId"
          : operation.startsWith("generations")
            ? "generationId"
            : "reportId"
      ] = decodeURIComponent(match[1]);
    if (operation === "reports.rows") params.tableKey = decodeURIComponent(match[2]);
    if (
      (operation === "connections.models" && match[2] !== "models") ||
      (operation === "connections.check" && match[2] !== "check")
    )
      break;
    return { operation, params };
  }
  throw new SmokeyAdapterError("INVALID_OPERATION", "Unsupported assistant operation.");
};
