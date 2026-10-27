import type { SmokeyHostAdapter, SmokeyContext, SmokeyRequest } from "@/sdk/contracts";
import { sameIdentity } from "@/sdk/contracts";
import { SmokeyAdapterError } from "@/sdk/errors";
// Contract example only; never registered as a real customer's data source.
export const createMemoryAdapter = (
  getContext: () => SmokeyContext,
  navigate: SmokeyHostAdapter["navigate"],
): SmokeyHostAdapter => ({
  contractVersion: { major: 1, minor: 0 },
  navigate,
  resolveSourceLink: () => null,
  async request<T>(request: SmokeyRequest) {
    if (!sameIdentity(request.identity, getContext().identity))
      throw new SmokeyAdapterError("STALE_CONTEXT", "Example organization changed.");
    if (request.operation === "settings.get")
      return {
        default_connection_id: null,
        presentation: "drawer",
        mascot: { mode: "smokey" },
        has_mascot_asset: false,
        permissions: getContext().permissions,
        timezone: getContext().organization.timezone,
        daily_requests: 100,
        monthly_requests: 2000,
        daily_tokens: 200000,
        monthly_tokens: 3000000,
      } as T;
    if (request.operation === "connections.list") return [] as T;
    if (request.operation === "reports.list") return { count: 0, results: [] } as T;
    throw new SmokeyAdapterError(
      "UNAVAILABLE_SOURCE",
      "This example has no live business records.",
      400,
    );
  },
});
