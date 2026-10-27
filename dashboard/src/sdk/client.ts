import {
  accessKey,
  operations,
  type SmokeyContext,
  type SmokeyHostAdapter,
  type SmokeyOperation,
} from "./contracts";
import { normalizedError, SmokeyAdapterError } from "./errors";
import { parseAssistantPath } from "./paths";
import type { Business, Generation, GenerationPlan } from "@/types/assistant";
export const assistantPath = (_business: Business, path = "") => path;
export type RequestOptions = { idempotencyKey?: string; signal?: AbortSignal };
export const createAssistantClient = (
  adapter: SmokeyHostAdapter,
  getContext: () => SmokeyContext,
) => {
  const outstanding = new Set<AbortController>();
  let destroyed = false;
  const request = async <T>(
    operation: SmokeyOperation,
    params?: Record<string, string | number>,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> => {
    if (destroyed) throw new SmokeyAdapterError("ABORTED", "Assistant was closed.");
    if (!operations.includes(operation))
      throw new SmokeyAdapterError("INVALID_OPERATION", "Unsupported assistant operation.");
    const context = getContext();
    const key = accessKey(context);
    const identity = Object.freeze({ ...context.identity });
    const controller = new AbortController();
    outstanding.add(controller);
    const timeout = AbortSignal.timeout(15000);
    const signal = AbortSignal.any([
      controller.signal,
      timeout,
      ...(options.signal ? [options.signal] : []),
    ]);
    try {
      if (signal.aborted) throw signal.reason;
      const result = await adapter.request<T>({
        operation,
        identity,
        params,
        body,
        idempotencyKey: options.idempotencyKey,
        signal,
      });
      if (destroyed || signal.aborted)
        throw new SmokeyAdapterError("ABORTED", "The request was stopped.");
      if (key !== accessKey(getContext()))
        throw new SmokeyAdapterError("STALE_CONTEXT", "Your business context changed.");
      return result;
    } catch (error) {
      if (key !== accessKey(getContext()))
        throw new SmokeyAdapterError("STALE_CONTEXT", "Your business context changed.");
      if (timeout.aborted)
        throw new SmokeyAdapterError(
          "TIMEOUT",
          "The request timed out. Please try again.",
          408,
          true,
        );
      throw normalizedError(error);
    } finally {
      outstanding.delete(controller);
    }
  };
  const requestPath = async <T>(path: string, options: RequestInit = {}) => {
    const parsed = parseAssistantPath(path, options.method);
    let body: unknown = options.body;
    if (typeof body === "string") body = JSON.parse(body);
    return request<T>(parsed.operation, parsed.params, body, {
      signal: options.signal || undefined,
      idempotencyKey: new Headers(options.headers).get("Idempotency-Key") || undefined,
    });
  };
  const abort = () => {
    outstanding.forEach((controller) => controller.abort());
    outstanding.clear();
  };
  return {
    request,
    requestPath,
    start: (prompt: string, plan: GenerationPlan | undefined, key: string) =>
      request<Generation>(
        "generations.create",
        undefined,
        { prompt, ...(plan ? { plan } : {}) },
        { idempotencyKey: key },
      ),
    poll: (generationId: string) => request<Generation>("generations.get", { generationId }),
    stop: (generationId: string) => request<Generation>("generations.cancel", { generationId }),
    abort,
    destroy: () => {
      destroyed = true;
      abort();
    },
    resolveSourceLink: adapter.resolveSourceLink,
  };
};
export type AssistantClient = ReturnType<typeof createAssistantClient>;
