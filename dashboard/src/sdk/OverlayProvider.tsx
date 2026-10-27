import { createContext, useContext, type ReactNode } from "react";
const PortalContext = createContext<HTMLElement | undefined>(undefined);
export const OverlayProvider = ({
  container,
  children,
}: {
  container?: HTMLElement;
  children: ReactNode;
}) => <PortalContext.Provider value={container}>{children}</PortalContext.Provider>;
export const useOverlayContainer = () => useContext(PortalContext);
