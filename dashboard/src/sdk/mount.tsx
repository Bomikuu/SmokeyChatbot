import { createRoot } from "react-dom/client";
import { createPortal, flushSync } from "react-dom";
import { useEffect } from "react";
import { createAssistantRuntime } from "./runtimeStore";
import { AssistantRuntimeProvider, useRuntimeSnapshot } from "./RuntimeProvider";
import { OverlayProvider } from "./OverlayProvider";
import { createSmokeySurface, type SmokeySurface } from "./surface";
import { BusinessDashboard } from "@/features/business/BusinessDashboard";
import { AssistantControls } from "@/features/assistant/AssistantControls";
import { contractVersion, type MountSmokeyOptions, type SmokeyRuntime } from "./contracts";
const mounted = new WeakSet<HTMLElement>();
export const mountSmokey = (
  options: MountSmokeyOptions & { inlineCss?: string },
): SmokeyRuntime => {
  const {
    owner,
    adapter,
    context,
    onEvent,
    assetsBaseUrl,
    stylesheetUrl = "",
    inlineCss = "",
  } = options;
  if (mounted.has(owner) || owner.childNodes.length)
    throw new Error("Smokey is already mounted in this container.");
  if (adapter.contractVersion.major !== contractVersion.major)
    throw new Error("Unsupported Smokey host adapter.");
  const surface = createSmokeySurface(owner, stylesheetUrl, inlineCss);
  const runtime = createAssistantRuntime(adapter, context, { assetsBaseUrl, onEvent });
  surface.setTheme(context.theme);
  const root = createRoot(surface.content, {
    onUncaughtError: () => onEvent?.({ type: "error", code: "RENDER_FAILED" }),
  });
  let dashboard: SmokeySurface | undefined;
  let destroyed = false;
  mounted.add(owner);
  owner.dataset.smokeyRuntime = "";
  const RootView = () => {
    const snapshot = useRuntimeSnapshot();
    useEffect(() => {
      surface.setTheme(snapshot.context.theme);
      dashboard?.setTheme(snapshot.context.theme);
    }, [snapshot.context.theme, snapshot.pageAttached]);
    return (
      <OverlayProvider container={surface.portal}>
        <div key={snapshot.epoch}>
          {dashboard &&
            snapshot.pageAttached &&
            createPortal(
              <BusinessDashboard
                route={snapshot.route}
                showHeader={options.pageHeader !== "host"}
              />,
              dashboard.content,
            )}
          <AssistantControls bottomOffset={options.bottomOffset} />
        </div>
      </OverlayProvider>
    );
  };
  root.render(
    <AssistantRuntimeProvider runtime={runtime}>
      <RootView />
    </AssistantRuntimeProvider>,
  );
  const detachDashboard = () => {
    if (destroyed || !dashboard) return;
    flushSync(() => runtime.setPageAttached(false));
    dashboard.destroy();
    dashboard = undefined;
  };
  void runtime.refreshSettings();
  onEvent?.({ type: "ready" });
  return {
    attachDashboard: (container, route) => {
      if (destroyed) return;
      if (dashboard?.host === container) {
        runtime.setRoute(route);
        return;
      }
      detachDashboard();
      dashboard = createSmokeySurface(container, stylesheetUrl, inlineCss);
      dashboard.setTheme(runtime.getSnapshot().context.theme);
      runtime.setRoute(route);
      runtime.setPageAttached(true);
    },
    detachDashboard,
    setRoute: runtime.setRoute,
    updateContext: runtime.updateContext,
    openAssistant: runtime.openAssistant,
    closeAssistant: runtime.closeAssistant,
    toggleAssistant: runtime.toggleAssistant,
    setHostOverlayActive: runtime.setHostOverlayActive,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      runtime.destroy();
      root.unmount();
      dashboard?.destroy();
      dashboard = undefined;
      surface.destroy();
      delete owner.dataset.smokeyRuntime;
      mounted.delete(owner);
    },
  };
};
