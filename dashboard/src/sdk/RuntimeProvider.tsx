import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { AssistantRuntimeStore } from "./runtimeStore";
const Context = createContext<AssistantRuntimeStore | null>(null);
export const AssistantRuntimeProvider = ({
  runtime,
  children,
}: {
  runtime: AssistantRuntimeStore;
  children: ReactNode;
}) => <Context.Provider value={runtime}>{children}</Context.Provider>;
export const useOptionalAssistantRuntime = () => useContext(Context);
export const useAssistantRuntime = () => {
  const runtime = useContext(Context);
  if (!runtime) throw new Error("Smokey needs its runtime provider.");
  return runtime;
};
export const useRuntimeSnapshot = () => {
  const runtime = useAssistantRuntime();
  return useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot);
};
export const useAssistantClient = () => useAssistantRuntime().getClient();
export const useRequestSnapshot = () => {
  const controller = useAssistantRuntime().getController();
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
};
