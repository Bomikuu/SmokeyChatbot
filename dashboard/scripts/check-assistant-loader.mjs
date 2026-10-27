import assert from "node:assert/strict";
import { withModules } from "./assistant-check-tools.mjs";
await withModules(async (load) => {
  const { validateManifest } = await load("sdk/manifest.ts");
  const version = { major: 1, minor: 0 },
    url = "https://host.test/smokey-assets/channels/stable-v1.json";
  const manifest = {
    schemaVersion: 1,
    release: "1.0.0",
    adapter: { major: 1, minMinor: 0 },
    hostApi: { major: 1, minMinor: 0 },
    entry: "../releases/1.0.0/smokey.123.mjs",
    stylesheet: "../releases/1.0.0/smokey.123.css",
    assets: "../releases/1.0.0/assets/",
  };
  assert.equal(
    validateManifest(manifest, url, version, version).entry,
    "https://host.test/smokey-assets/releases/1.0.0/smokey.123.mjs",
  );
  for (const entry of [
    "https://evil.test/smokey.mjs",
    "//evil.test/module.mjs",
    "../releases/2.0.0/smokey.mjs",
    "../../../auth/module.mjs",
    "../releases/1.0.0/smokey.mjs?secret=1",
    "../releases/1.0.0/%2fmodule.mjs",
  ])
    assert.throws(() => validateManifest({ ...manifest, entry }, url, version, version), {
      code: "INVALID_MANIFEST",
    });
  assert.throws(
    () =>
      validateManifest({ ...manifest, adapter: { major: 2, minMinor: 0 } }, url, version, version),
    { code: "INCOMPATIBLE_MODULE" },
  );
  assert.throws(
    () =>
      validateManifest({ ...manifest, hostApi: { major: 1, minMinor: 1 } }, url, version, version),
    { code: "INCOMPATIBLE_MODULE" },
  );
  const { loadSmokeyRelease, validateModuleExports } = await load("sdk/loader.ts");
  assert.throws(
    () => validateModuleExports({ contractVersion: version, sdkVersion: "1.0.0" }, "1.0.0"),
    { code: "INVALID_MODULE" },
  );
  assert.throws(
    () =>
      validateModuleExports(
        { contractVersion: version, sdkVersion: "2.0.0", mountSmokey() {} },
        "1.0.0",
      ),
    { code: "INVALID_MODULE" },
  );
  validateModuleExports(
    { contractVersion: version, sdkVersion: "1.0.0", mountSmokey() {} },
    "1.0.0",
  );
  const savedFetch = globalThis.fetch,
    savedLocation = globalThis.location;
  globalThis.location = { href: url, origin: "https://host.test" };
  try {
    globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
    await assert.rejects(
      loadSmokeyRelease(url, { adapterVersion: version, hostApiVersion: version }),
      { code: "MODULE_UNAVAILABLE" },
    );
    globalThis.fetch = async (_url, options) =>
      options.method === "HEAD"
        ? new Response("", { headers: { "content-type": "text/html" } })
        : new Response(JSON.stringify(manifest), {
            headers: { "content-type": "application/json" },
          });
    await assert.rejects(
      loadSmokeyRelease(url, { adapterVersion: version, hostApiVersion: version }),
      { code: "INVALID_MODULE" },
    );
    globalThis.fetch = async (asset, options) =>
      options.method === "HEAD"
        ? new Response("", {
            headers: {
              "content-type": String(asset).endsWith(".css")
                ? "text/html"
                : "application/javascript",
            },
          })
        : new Response(JSON.stringify(manifest), {
            headers: { "content-type": "application/json" },
          });
    await assert.rejects(
      loadSmokeyRelease(url, { adapterVersion: version, hostApiVersion: version }),
      /styles could not load/,
    );
    await assert.rejects(
      loadSmokeyRelease("https://evil.test/smokey-assets/channels/stable-v1.json", {
        adapterVersion: version,
        hostApiVersion: version,
      }),
      { code: "INVALID_MANIFEST" },
    );
  } finally {
    globalThis.fetch = savedFetch;
    if (savedLocation === undefined) delete globalThis.location;
    else globalThis.location = savedLocation;
  }
  console.log("Assistant loader: version, release confinement and traversal checks passed.");
});
