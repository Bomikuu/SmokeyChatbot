import assert from "node:assert/strict";
import { withModules, context, deferred } from "./assistant-check-tools.mjs";
await withModules(async (load) => {
  const { createAssistantClient } = await load("sdk/client.ts");
  let current = context();
  const slow = deferred();
  const seen = [];
  const adapter = {
    contractVersion: { major: 1, minor: 0 },
    request: async (request) => {
      seen.push(request);
      return slow.promise;
    },
    navigate() {},
    resolveSourceLink() {
      return null;
    },
  };
  const client = createAssistantClient(adapter, () => current);
  const pending = client.request("settings.get");
  current = context("org-b", 2);
  slow.resolve({ private: "A" });
  await assert.rejects(pending, (error) => error.code === "STALE_CONTEXT");
  assert.equal(seen[0].identity.organizationId, "org-a");
  await assert.rejects(
    client.requestPath("https://evil.test/api"),
    (error) => error.code === "INVALID_OPERATION",
  );
  await assert.rejects(
    client.requestPath("../settings/"),
    (error) => error.code === "INVALID_OPERATION",
  );
  for (const path of ["%2e%2e/settings/", "reports/%2fsecret/", "connections/%5csecret/"])
    await assert.rejects(client.requestPath(path), (error) => error.code === "INVALID_OPERATION");
  assert.equal(seen.length, 1);
  const second = createAssistantClient(
    { ...adapter, request: async () => ({ host: "independent" }) },
    () => context("second"),
  );
  assert.deepEqual(await second.request("settings.get"), { host: "independent" });
  second.destroy();
  client.destroy();
  await assert.rejects(client.request("settings.get"), (error) => error.code === "ABORTED");
  const originalTimeout = AbortSignal.timeout,
    expired = new AbortController();
  expired.abort(new DOMException("Timed out", "TimeoutError"));
  try {
    AbortSignal.timeout = (duration) => {
      assert.equal(duration, 15000);
      return expired.signal;
    };
    const timed = createAssistantClient(
      {
        ...adapter,
        request: async () => {
          throw new Error("An expired request must not dispatch");
        },
      },
      () => context(),
    );
    await assert.rejects(
      timed.request("generations.create"),
      (error) => error.code === "TIMEOUT" && error.status === 408,
    );
    timed.destroy();
  } finally {
    AbortSignal.timeout = originalTimeout;
  }
  console.log("Assistant contract: identity fencing and forbidden paths passed.");
});
