import {
  accessKey,
  type SmokeyContext,
  type SmokeyEvent,
  type SmokeyHostAdapter,
  type SmokeyRoute,
} from "./contracts";
import { createAssistantClient } from "./client";
import { createRequestController } from "./requestController";
import {
  browserSessionStorage,
  createConversationSession,
  conversationScope,
} from "./conversationSession";
import { normalizedError, type SmokeyAdapterError } from "./errors";
import type { AssistantSettings } from "@/types/assistant";
export interface RuntimeSnapshot {
  context: SmokeyContext;
  route: SmokeyRoute;
  settings: AssistantSettings | null;
  loading: boolean;
  error: SmokeyAdapterError | null;
  opened: boolean;
  suppressed: boolean;
  pageAttached: boolean;
  assetsBaseUrl: string;
  epoch: number;
}
export const createAssistantRuntime = (
  adapter: SmokeyHostAdapter,
  initialContext: SmokeyContext,
  options: { assetsBaseUrl?: string; onEvent?: (event: SmokeyEvent) => void } = {},
) => {
  let destroyed = false,
    settingsEpoch = 0;
  let snapshot: RuntimeSnapshot = {
    context: structuredClone(initialContext),
    route: { section: "overview" },
    settings: null,
    loading: false,
    error: null,
    opened: false,
    suppressed: false,
    pageAttached: false,
    assetsBaseUrl: options.assetsBaseUrl || "/",
    epoch: 0,
  };
  const listeners = new Set<() => void>();
  let trigger: HTMLElement | undefined,
    toolbar: HTMLElement | undefined,
    composer: HTMLElement | undefined;
  const client = createAssistantClient(adapter, () => snapshot.context),
    controller = createRequestController(client, {
      session: createConversationSession(
        conversationScope(initialContext),
        browserSessionStorage(),
      ),
    });
  const emit = (event: SmokeyEvent) => options.onEvent?.(event);
  const publish = (change: Partial<RuntimeSnapshot>) => {
    if (destroyed) return;
    snapshot = { ...snapshot, ...change };
    listeners.forEach((listener) => listener());
  };
  const restoreFocus = () => {
    if (destroyed) return;
    const target = trigger?.isConnected
      ? trigger
      : toolbar?.isConnected
        ? toolbar
        : typeof document !== "undefined"
          ? document.querySelector<HTMLElement>("[data-smokey-chat-toggle]")
          : null;
    if (target?.isConnected) target.focus();
  };
  const closeAssistant = () => {
    if (!snapshot.opened) return;
    publish({ opened: false });
    emit({ type: "assistant-close" });
    queueMicrotask(restoreFocus);
  };
  const refreshSettings = async () => {
    const epoch = ++settingsEpoch;
    if (
      !snapshot.context.installed ||
      !snapshot.context.enabled ||
      !snapshot.context.permissions.includes("view_reports")
    ) {
      publish({ settings: null, loading: false, error: null });
      return;
    }
    publish({ loading: true, error: null });
    try {
      const settings = await client.request<AssistantSettings>("settings.get");
      if (!destroyed && epoch === settingsEpoch) publish({ settings, loading: false });
    } catch (error) {
      if (!destroyed && epoch === settingsEpoch) {
        const normalized = normalizedError(error);
        if ([401, 403].includes(normalized.status)) controller.reset();
        publish({ loading: false, error: normalized });
        if (normalized.status === 401) emit({ type: "session-expired" });
      }
    }
  };
  const updateContext = (context: SmokeyContext) => {
    if (destroyed) return;
    const changed = accessKey(context) !== accessKey(snapshot.context);
    if (changed) {
      settingsEpoch++;
      client.abort();
      controller.reset(context);
      controller.setSession(
        createConversationSession(conversationScope(context), browserSessionStorage()),
      );
      closeAssistant();
      publish({
        context: structuredClone(context),
        settings: null,
        error: null,
        loading: false,
        epoch: snapshot.epoch + 1,
      });
      void refreshSettings();
    } else publish({ context: structuredClone(context) });
  };
  const openAssistant = (source?: HTMLElement) => {
    if (!snapshot.settings || snapshot.suppressed) return;
    trigger = source || toolbar;
    if (snapshot.pageAttached && snapshot.route.section === "assistant") {
      composer?.focus();
      return;
    }
    publish({ opened: true });
    emit({ type: "assistant-open" });
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getClient: () => client,
    getController: () => controller,
    refreshSettings,
    updateContext,
    setRoute: (route: SmokeyRoute) => {
      publish({ route });
      if (route.section === "assistant") closeAssistant();
    },
    navigate: (route: SmokeyRoute) => {
      closeAssistant();
      adapter.navigate(route);
      emit({ type: "route-requested", route });
    },
    setPageAttached: (pageAttached: boolean) => publish({ pageAttached }),
    setAssetsBaseUrl: (assetsBaseUrl: string) => publish({ assetsBaseUrl }),
    registerComposer: (element?: HTMLElement) => {
      composer = element;
    },
    registerToolbar: (element?: HTMLElement) => {
      toolbar = element;
    },
    openAssistant,
    closeAssistant,
    toggleAssistant: (source?: HTMLElement) =>
      snapshot.opened ? closeAssistant() : openAssistant(source),
    setHostOverlayActive: (suppressed: boolean) => {
      if (suppressed) closeAssistant();
      publish({ suppressed });
    },
    enable: async () => {
      await client.request("module.enable");
      emit({ type: "module-enabled" });
    },
    destroy: () => {
      if (destroyed) return;
      closeAssistant();
      destroyed = true;
      settingsEpoch++;
      client.destroy();
      controller.destroy();
      listeners.clear();
      snapshot = { ...snapshot, settings: null, error: null, opened: false };
      trigger = undefined;
      toolbar = undefined;
      composer = undefined;
    },
  };
};
export type AssistantRuntimeStore = ReturnType<typeof createAssistantRuntime>;
