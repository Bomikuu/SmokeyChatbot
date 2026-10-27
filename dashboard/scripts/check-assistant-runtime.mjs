import assert from "node:assert/strict";
import { withModules, context, deferred } from "./assistant-check-tools.mjs";
await withModules(async (load) => {
  const { createRequestController } = await load("sdk/requestController.ts");
  const { createConversationSession, conversationScope } = await load("sdk/conversationSession.ts");
  assert.equal(conversationScope(context("same", 1)), conversationScope(context("same", 9)));
  assert.notEqual(conversationScope(context("same", 1)), conversationScope(context("other", 1)));
  assert.notEqual(
    conversationScope(context()),
    conversationScope({ ...context(), permissions: ["view_reports"] }),
  );
  const saved = new Map();
  const storage = {
    getItem: (key) => saved.get(key) || null,
    setItem: (key, value) => saved.set(key, value),
    removeItem: (key) => saved.delete(key),
  };
  const session = createConversationSession("actor:business", storage);
  session.write({
    draft: "Long draft",
    turns: Array.from({ length: 35 }, (_, index) => ({
      key: `long-${index}`,
      prompt: "q".repeat(4000),
      generation: { state: "empty", prompt: "q".repeat(4000), clarification: "Answer" },
    })),
  });
  assert.equal(session.read().turns.length, 30);
  assert.equal(session.read().turns[0].key, "long-5");
  assert.equal(
    session.read().turns[0].generation.prompt,
    undefined,
    "Do not duplicate prompts or retain full report payloads",
  );
  session.clear();
  let sequence = 0,
    sessionStarts = 0;
  const sessionClient = {
    start: async (prompt) => {
      sessionStarts++;
      return { id: `job-${sessionStarts}`, state: "empty", clarification: `Reply to ${prompt}` };
    },
    poll: async () => ({ id: "pending-job", state: "succeeded", report_id: "saved-report" }),
    stop: async () => ({ state: "cancelled" }),
  };
  const conversation = createRequestController(sessionClient, {
    session,
    newKey: () => `turn-${++sequence}`,
  });
  await conversation.submit("First question");
  await conversation.submit("Second question");
  assert.deepEqual(
    conversation.getSnapshot().turns.map((turn) => turn.prompt),
    ["First question", "Second question"],
  );
  assert.equal(
    conversation.getSnapshot().turns[0].generation.clarification,
    "Reply to First question",
  );
  conversation.setDraft("Unsent draft");
  conversation.destroy();
  const restored = createRequestController(sessionClient, { session });
  assert.equal(restored.getSnapshot().turns.length, 2);
  assert.equal(restored.getSnapshot().draft, "Unsent draft");
  assert.equal(sessionStarts, 2, "Restoration must not start paid generation");
  assert.equal(createConversationSession("another-actor", storage).read().turns.length, 0);
  restored.reset();
  assert.equal(session.read().turns.length, 0, "Access changes clear the old conversation");
  session.write({
    draft: "",
    turns: [
      {
        key: "pending-key",
        prompt: "Pending question",
        generation: { id: "pending-job", state: "queued" },
      },
    ],
  });
  const pendingSession = createRequestController(sessionClient, { session });
  assert.ok(pendingSession.getSnapshot().interrupted);
  await pendingSession.recover();
  assert.equal(sessionStarts, 2, "Recovery with a saved request ID must only poll");
  assert.equal(pendingSession.getSnapshot().turns[0].generation.report_id, "saved-report");
  pendingSession.reset();
  pendingSession.destroy();
  restored.destroy();
  saved.set("smokey.conversation.v1:actor:business", "invalid-json");
  assert.equal(session.read().turns.length, 0);
  const blocked = createConversationSession("blocked", {
    getItem: () => {
      throw Error("blocked");
    },
    setItem: () => {
      throw Error("blocked");
    },
    removeItem: () => {},
  });
  assert.equal(blocked.read().turns.length, 0);
  blocked.write({ draft: "", turns: [] });
  const tasks = [];
  const keys = [];
  let starts = 0,
    polls = 0;
  const client = {
    start: async (_prompt, _plan, key) => {
      starts++;
      keys.push(key);
      if (starts === 1) throw new Error("Lost creation response");
      return { id: "job", state: "queued" };
    },
    poll: async () => {
      polls++;
      return { id: "job", state: "succeeded", report_id: "report" };
    },
    stop: async () => ({ id: "job", state: "cancelled" }),
  };
  const controller = createRequestController(client, {
    schedule: (fn, delay) => {
      assert.equal(delay, 1500);
      tasks.push(fn);
      return tasks.length;
    },
    unschedule() {},
    newKey: () => "same-key",
  });
  controller.setDraft("Who attended?");
  await controller.submit("Who attended?");
  assert.ok(controller.getSnapshot().interrupted);
  await controller.submit("A second job");
  assert.equal(starts, 1);
  await controller.recover();
  assert.deepEqual(keys, ["same-key", "same-key"]);
  assert.equal(controller.getSnapshot().draft, "Who attended?");
  await tasks.shift()();
  assert.equal(polls, 1);
  assert.equal(controller.getSnapshot().generation.state, "succeeded");
  const late = deferred();
  const second = createRequestController({ ...client, start: () => late.promise });
  const pending = second.submit("Daily");
  second.reset(context("other", 2));
  late.resolve({ id: "old", state: "queued" });
  await pending;
  assert.equal(second.getSnapshot().generation.state, "idle");
  second.destroy();
  controller.destroy();
  const delayed = deferred();
  let cancelled = 0;
  const stopped = createRequestController({
    ...client,
    start: () => delayed.promise,
    stop: async () => {
      cancelled++;
      if (cancelled === 1) throw new Error("Cancel response lost");
      return { id: "stopping", state: "cancelled" };
    },
  });
  const creating = stopped.submit("Stop during creation");
  await stopped.stop();
  delayed.resolve({ id: "stopping", state: "queued" });
  await creating;
  assert.equal(cancelled, 1);
  assert.ok(stopped.getSnapshot().interrupted);
  await stopped.recover();
  assert.equal(cancelled, 2);
  assert.equal(stopped.getSnapshot().generation.state, "cancelled");
  stopped.destroy();
  const lateCancel = deferred();
  let cancels = 0;
  const fenced = createRequestController(
    {
      ...client,
      start: async () => ({ id: "current", state: "queued" }),
      stop: () => {
        cancels++;
        return lateCancel.promise;
      },
    },
    { schedule: () => 1, unschedule() {} },
  );
  await fenced.submit("Old");
  const oldStop = fenced.stop();
  fenced.reset();
  await fenced.submit("New");
  const newStop = fenced.stop();
  lateCancel.resolve({ id: "current", state: "cancelled" });
  await Promise.all([oldStop, newStop]);
  assert.equal(cancels, 2);
  fenced.destroy();
  assert.equal(fenced.getSnapshot().draft, "");
  const stopResponse = deferred();
  let stopCalls = 0;
  const repeatedStop = createRequestController(
    {
      ...client,
      start: async () => ({ id: "repeat", state: "queued" }),
      stop: () => {
        stopCalls++;
        return stopResponse.promise;
      },
    },
    { schedule: () => 1, unschedule() {} },
  );
  await repeatedStop.submit("Double stop");
  const firstStop = repeatedStop.stop();
  await repeatedStop.stop();
  assert.equal(stopCalls, 1);
  stopResponse.resolve({ id: "repeat", state: "cancelled" });
  await firstStop;
  assert.equal(repeatedStop.getSnapshot().generation.state, "cancelled");
  repeatedStop.destroy();
  console.log(
    "Assistant controller: recovery, duplicate submission and late-result checks passed.",
  );
});
