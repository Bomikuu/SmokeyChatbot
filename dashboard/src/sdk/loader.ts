import { validateManifest } from "./manifest";
import { SmokeyAdapterError } from "./errors";
import type { MountSmokeyOptions, SmokeyRuntime } from "./contracts";
export interface SmokeyModule {
  sdkVersion: string;
  contractVersion: { major: number; minor: number };
  mountSmokey: (options: MountSmokeyOptions) => SmokeyRuntime;
}
export const validateModuleExports = (module: Partial<SmokeyModule>, release: string) => {
  if (
    module.contractVersion?.major !== 1 ||
    typeof module.mountSmokey !== "function" ||
    module.sdkVersion !== release
  )
    throw new SmokeyAdapterError(
      "INVALID_MODULE",
      "Smokey release exports do not match the manifest.",
    );
  return module as SmokeyModule;
};
export const loadSmokeyRelease = async (
  manifestUrl: string,
  options: {
    adapterVersion: { major: number; minor: number };
    hostApiVersion: { major: number; minor: number };
    signal?: AbortSignal;
  },
) => {
  const url = new URL(manifestUrl, location.href);
  if (url.origin !== location.origin || !url.pathname.startsWith("/smokey-assets/channels/"))
    throw new SmokeyAdapterError(
      "INVALID_MANIFEST",
      "Use the host asset origin for Smokey releases.",
    );
  const response = await fetch(url, {
    cache: "no-cache",
    signal: options.signal ?? AbortSignal.timeout(15000),
  });
  if (!response.ok || !response.headers.get("content-type")?.includes("json"))
    throw new SmokeyAdapterError(
      "MODULE_UNAVAILABLE",
      "Smokey could not load its release. Please try again.",
    );
  const manifest = validateManifest(
    await response.json(),
    new URL(manifestUrl, location.href).href,
    options.adapterVersion,
    options.hostApiVersion,
  );
  const head = await fetch(manifest.entry, {
    method: "HEAD",
    signal: options.signal ?? AbortSignal.timeout(15000),
  });
  if (!head.ok || !/javascript/.test(head.headers.get("content-type") || ""))
    throw new SmokeyAdapterError(
      "INVALID_MODULE",
      "Smokey module has an unsupported content type.",
    );
  const stylesheet = await fetch(manifest.stylesheet, {
    method: "HEAD",
    signal: options.signal ?? AbortSignal.timeout(15000),
  });
  if (!stylesheet.ok || !stylesheet.headers.get("content-type")?.startsWith("text/css"))
    throw new SmokeyAdapterError(
      "INVALID_MODULE",
      "Smokey styles could not load. Please try again.",
    );
  let module: SmokeyModule;
  try {
    module = validateModuleExports(
      await import(/* @vite-ignore */ manifest.entry),
      manifest.release,
    );
  } catch (error) {
    if (error instanceof SmokeyAdapterError) throw error;
    throw new SmokeyAdapterError(
      "MODULE_UNAVAILABLE",
      "Smokey could not load its module. Please reload and try again.",
    );
  }
  return { module, manifest };
};
