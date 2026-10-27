// Host pages do not load module-dev.html, so install React Refresh before React modules execute.
const base = import.meta.env.BASE_URL;
const origin = new URL(base, import.meta.url).origin;
const refresh = await import(/* @vite-ignore */ new URL(base + "@react-refresh", origin).href);
refresh.default.injectIntoGlobalHook(window);
Object.assign(window, {
  $RefreshReg$: () => {},
  $RefreshSig$: () => (type: unknown) => type,
  __vite_plugin_react_preamble_installed__: true,
});
await import(/* @vite-ignore */ new URL(base + "@vite/client", origin).href);
const sdk = await import("./index");
export const mountSmokey = sdk.mountSmokey;
export const contractVersion = sdk.contractVersion;
export const sdkVersion = sdk.sdkVersion;
