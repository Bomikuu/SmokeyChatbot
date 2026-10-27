export const resolveAssistantAsset = (path: string, assetsBaseUrl: string) => {
  if (/(^|\/)\.\.(\/|$)|^\/|:|\\/.test(path)) throw new Error("Invalid Smokey asset path.");
  return new URL(path, new URL(assetsBaseUrl, globalThis.location?.href || "http://localhost/"))
    .href;
};
