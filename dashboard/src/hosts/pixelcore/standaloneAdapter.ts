import {
  sameIdentity,
  type SmokeyContext,
  type SmokeyHostAdapter,
  type SmokeyRequest,
} from "@/sdk/contracts";
import { normalizedError, SmokeyAdapterError } from "@/sdk/errors";
import { pixelCoreOperation } from "./operations";
export const createPixelCoreStandaloneAdapter = (
  transport: <T>(path: string, options?: RequestInit) => Promise<T>,
  currentContext: () => SmokeyContext,
  navigate: SmokeyHostAdapter["navigate"],
  sourceOrigin: string,
): SmokeyHostAdapter => ({
  contractVersion: { major: 1, minor: 0 },
  navigate,
  resolveSourceLink: ({ href }) => {
    if (!/^\/workspace(?:\/|$)/.test(href) || href.includes("\\")) return null;
    const url = new URL(href, sourceOrigin);
    return url.origin === new URL(sourceOrigin).origin ? url.href : null;
  },
  async request<T>(request: SmokeyRequest) {
    const check = () => {
      if (!sameIdentity(request.identity, currentContext().identity))
        throw new SmokeyAdapterError("STALE_CONTEXT", "Your business context changed.");
    };
    check();
    const operation = pixelCoreOperation(request);
    const headers = new Headers();
    if (request.operation === "generations.create" && request.idempotencyKey)
      headers.set("Idempotency-Key", request.idempotencyKey);
    try {
      const result = await transport<T>(operation.path, {
        method: operation.method,
        headers,
        signal: request.signal,
        ...(operation.body === undefined
          ? {}
          : {
              body:
                operation.body instanceof FormData
                  ? operation.body
                  : JSON.stringify(operation.body),
            }),
      });
      check();
      return result;
    } catch (error) {
      check();
      throw normalizedError(error);
    }
  },
});
