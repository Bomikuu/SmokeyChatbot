import { SmokeyAdapterError } from "./errors";
export interface ReleaseManifest {
  schemaVersion: 1;
  release: string;
  adapter: { major: number; minMinor: number };
  hostApi: { major: number; minMinor: number };
  entry: string;
  stylesheet: string;
  assets: string;
}
export const validateManifest = (
  value: unknown,
  manifestUrl: string,
  adapter: { major: number; minor: number },
  hostApi: { major: number; minor: number },
) => {
  const data = value as ReleaseManifest;
  const base = new URL(manifestUrl, globalThis.location?.href || "http://localhost");
  if (!data || data.schemaVersion !== 1 || !/^\d+\.\d+\.\d+$/.test(data.release || ""))
    throw new SmokeyAdapterError("INVALID_MANIFEST", "Unsupported Smokey release manifest.");
  for (const [required, current] of [
    [data.adapter, adapter],
    [data.hostApi, hostApi],
  ] as const)
    if (
      !required ||
      !Number.isInteger(required.major) ||
      !Number.isInteger(required.minMinor) ||
      required.major !== current.major ||
      required.minMinor < 0 ||
      required.minMinor > current.minor
    )
      throw new SmokeyAdapterError(
        "INCOMPATIBLE_MODULE",
        "This Smokey release needs a compatible host update.",
      );
  const urls = {} as Record<"entry" | "stylesheet" | "assets", string>;
  for (const key of ["entry", "stylesheet", "assets"] as const) {
    const path = data[key];
    if (
      typeof path !== "string" ||
      path.startsWith("//") ||
      path.includes("\\") ||
      /%2f|%5c/i.test(path)
    )
      throw new SmokeyAdapterError("INVALID_MANIFEST", "Invalid Smokey release asset.");
    const url = new URL(path, base);
    if (
      url.origin !== base.origin ||
      !url.pathname.startsWith("/smokey-assets/releases/" + data.release + "/") ||
      url.search ||
      url.hash
    )
      throw new SmokeyAdapterError(
        "INVALID_MANIFEST",
        "Smokey assets must belong to the selected release.",
      );
    urls[key] = url.href;
  }
  if (!/\.mjs$/.test(urls.entry) || !/\.css$/.test(urls.stylesheet) || !urls.assets.endsWith("/"))
    throw new SmokeyAdapterError("INVALID_MANIFEST", "Unsupported Smokey asset format.");
  return { ...data, ...urls };
};
