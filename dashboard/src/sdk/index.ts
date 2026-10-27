import { mountSmokey as mount } from "./mount";
import type { MountSmokeyOptions } from "./contracts";
export { contractVersion, sdkVersion } from "./contracts";
export type * from "./contracts";
const inlineCss = import.meta.env.DEV
  ? (await import("../styles/assistant.css?inline")).default
  : "";
export const mountSmokey = (options: MountSmokeyOptions) => mount({ ...options, inlineCss });
