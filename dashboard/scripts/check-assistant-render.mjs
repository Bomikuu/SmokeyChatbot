import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { withModules, context } from "./assistant-check-tools.mjs";
await withModules(async (load) => {
  const { createAssistantRuntime } = await load("sdk/runtimeStore.ts");
  const { AssistantRuntimeProvider } = await load("sdk/RuntimeProvider.tsx");
  const { BusinessDashboard } = await load("features/business/BusinessDashboard.tsx");
  const { BusinessConversation } = await load("features/business/BusinessConversation.tsx");
  const { createMemoryAdapter } = await load("hosts/example/memoryAdapter.ts");
  const adapter = createMemoryAdapter(
    () => context(),
    () => {},
  );
  const runtime = createAssistantRuntime(adapter, context());
  await runtime.refreshSettings();
  for (const section of [
    "overview",
    "assistant",
    "reports",
    "connections",
    "appearance",
    "usage",
  ]) {
    const html = renderToString(
      React.createElement(
        AssistantRuntimeProvider,
        { runtime },
        React.createElement(BusinessDashboard, { route: { section } }),
      ),
    );
    assert.ok(html.includes("Example"));
    assert.ok(!html.includes("iframe"));
    assert.ok(!html.includes("/business-api"));
  }
  // Full pages and compact overlays share the same connection/permission gate.
  for (const compact of [false, true]) {
    for (const [defaultId, permissions, enabled] of [
      [null, ["configure", "generate", "view_reports"], false],
      ["verified-default", ["generate", "view_reports"], true],
      ["verified-default", ["view_reports"], false],
    ]) {
      const html = renderToString(
        React.createElement(
          AssistantRuntimeProvider,
          { runtime },
          React.createElement(BusinessConversation, {
            compact,
            business: { public_id: "org-a", display_name: "Example" },
            settings: {
              ...runtime.getSnapshot().settings,
              default_connection_id: defaultId,
              permissions,
            },
            generation: {
              state: { state: "idle" },
              draft: "Show sales today",
              busy: false,
              interrupted: "",
              setDraft: () => {},
              submit: () => {},
              resume: () => {},
              stop: () => {},
            },
            onReport: () => {},
            onConnections: () => {},
          }),
        ),
      );
      const submit = html.match(/<button[^>]*type="submit"[^>]*>/)?.[0];
      assert.ok(submit);
      assert.equal(/\sdisabled(?:=|\s|>)/.test(submit), !enabled);
      if (!defaultId) assert.ok(html.includes("Choose default connection"));
      if (!permissions.includes("generate"))
        assert.ok(html.includes("Your current role cannot generate"));
    }
  }
  const draft = runtime.getController();
  const left = [],
    right = [];
  const offLeft = draft.subscribe(() => left.push(draft.getSnapshot().draft)),
    offRight = draft.subscribe(() => right.push(draft.getSnapshot().draft));
  draft.setDraft("Two subscribers");
  assert.deepEqual(left, right);
  offLeft();
  offRight();
  let focused = 0;
  runtime.registerComposer({ focus: () => focused++ });
  runtime.setPageAttached(true);
  runtime.setRoute({ section: "assistant" });
  runtime.openAssistant();
  assert.equal(focused, 1);
  assert.equal(runtime.getSnapshot().opened, false);
  runtime.setRoute({ section: "overview" });
  runtime.openAssistant();
  runtime.setHostOverlayActive(true);
  assert.equal(runtime.getSnapshot().opened, false);
  runtime.setHostOverlayActive(false);
  draft.setDraft("Preserve this draft");
  runtime.setPageAttached(true);
  runtime.setPageAttached(false);
  runtime.updateContext({ ...context(), theme: "dark" });
  assert.equal(draft.getSnapshot().draft, "Preserve this draft");
  runtime.openAssistant();
  runtime.closeAssistant();
  assert.equal(draft.getSnapshot().draft, "Preserve this draft");
  runtime.updateContext({ ...context(), permissions: ["view_reports"] });
  assert.equal(draft.getSnapshot().draft, "");
  draft.setDraft("Another draft");
  runtime.updateContext({
    ...context(),
    enabled: false,
    permissions: ["generate", "view_reports"],
  });
  assert.equal(draft.getSnapshot().draft, "");
  assert.equal(runtime.getSnapshot().settings, null);
  const disabled = renderToString(
    React.createElement(
      AssistantRuntimeProvider,
      { runtime },
      React.createElement(BusinessDashboard, { route: { section: "overview" } }),
    ),
  );
  assert.ok(disabled.includes("Ask an owner or administrator to enable Smokey."));
  assert.ok(!disabled.includes(">Enable Smokey<"));
  runtime.updateContext(context("B", 2));
  assert.equal(draft.getSnapshot().draft, "");
  runtime.destroy();
  assert.equal(runtime.getSnapshot().settings, null);
  console.log("Assistant views: six sections, independent host and shared draft passed.");
});
