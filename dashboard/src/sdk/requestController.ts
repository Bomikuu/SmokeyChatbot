import type { Generation, GenerationPlan } from "@/types/assistant";
import type { AssistantClient } from "./client";
import { normalizedError } from "./errors";
import type { ConversationTurn, ConversationSession } from "./conversationSession";
const terminal = new Set(["succeeded", "empty", "failed", "cancelled"]);
export interface RequestSnapshot {
  draft: string;
  generation: Generation;
  interrupted: string;
  busy: boolean;
  idempotencyKey?: string;
  turns: ConversationTurn[];
}
type ControllerClient = Pick<AssistantClient, "start" | "poll" | "stop">;
export const createRequestController = (
  client: ControllerClient,
  options: {
    schedule?: typeof setTimeout;
    unschedule?: typeof clearTimeout;
    newKey?: () => string;
    session?: ConversationSession;
  } = {},
) => {
  const schedule = options.schedule || setTimeout,
    unschedule = options.unschedule || clearTimeout,
    newKey = options.newKey || (() => crypto.randomUUID());
  let session = options.session;
  const restored = session?.read();
  const last = restored?.turns.at(-1);
  let snapshot: RequestSnapshot = {
    draft: restored?.draft || "",
    turns: restored?.turns || [],
    generation: last?.generation || { state: "idle" },
    interrupted:
      last && !terminal.has(last.generation.state)
        ? "Session restored. Recover this request to check its progress."
        : "",
    busy: Boolean(last && !terminal.has(last.generation.state)),
    idempotencyKey: last?.key,
  };
  let epoch = 0,
    destroyed = false,
    creating = false,
    cancelling = false,
    stopRequested = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let submission: { prompt: string; plan?: GenerationPlan; key: string } | null = last
    ? {
        prompt: last.prompt,
        key: last.key,
        ...(last.generation.plan?.kind &&
        last.generation.plan.date_from &&
        last.generation.plan.date_to
          ? { plan: last.generation.plan as GenerationPlan }
          : {}),
      }
    : null;
  const listeners = new Set<() => void>();
  const publish = (value: Partial<RequestSnapshot>) => {
    if (destroyed) return;
    snapshot = { ...snapshot, ...value };
    if (value.generation && snapshot.idempotencyKey) {
      snapshot.turns = snapshot.turns.map((turn) =>
        turn.key === snapshot.idempotencyKey ? { ...turn, generation: value.generation! } : turn,
      );
    }
    snapshot.busy = ["queued", "searching", "generating"].includes(snapshot.generation.state);
    session?.write({ draft: snapshot.draft, turns: snapshot.turns });
    listeners.forEach((listener) => listener());
  };
  const clear = () => {
    if (timer !== undefined) unschedule(timer);
    timer = undefined;
  };
  const valid = (token: number) => !destroyed && token === epoch;
  const accept = (generation: Generation) => publish({ generation, interrupted: "" });
  const fail = (error: unknown, token: number) => {
    if (!valid(token)) return;
    const issue = normalizedError(error);
    if (["ABORTED", "STALE_CONTEXT"].includes(issue.code)) return;
    publish({ interrupted: issue.message });
  };
  const poll = async (token: number) => {
    if (!valid(token) || !snapshot.generation.id) return;
    try {
      const next = await client.poll(snapshot.generation.id);
      if (!valid(token)) return;
      accept(next);
      if (!terminal.has(next.state))
        timer = schedule(() => {
          void poll(token);
        }, 1500);
    } catch (error) {
      fail(error, token);
    }
  };
  const cancel = async (token: number, id: string) => {
    if (cancelling) return;
    cancelling = true;
    try {
      const next = await client.stop(id);
      if (valid(token)) accept(next);
    } catch (error) {
      fail(error, token);
    } finally {
      if (valid(token)) cancelling = false;
    }
  };
  const recover = async () => {
    if (destroyed || creating || cancelling) return;
    clear();
    const token = ++epoch;
    publish({ interrupted: "" });
    if (snapshot.generation.id) {
      if (stopRequested) await cancel(token, snapshot.generation.id);
      else await poll(token);
      return;
    }
    if (!submission) return;
    creating = true;
    try {
      const next = await client.start(submission.prompt, submission.plan, submission.key);
      if (!valid(token)) return;
      accept(next);
      if (stopRequested && !terminal.has(next.state)) await cancel(token, next.id!);
      else if (!terminal.has(next.state))
        timer = schedule(() => {
          void poll(token);
        }, 1500);
    } catch (error) {
      const issue = normalizedError(error);
      if (
        valid(token) &&
        issue.status >= 400 &&
        issue.status < 500 &&
        ![408, 429].includes(issue.status)
      )
        accept({
          ...snapshot.generation,
          state: "failed",
          error: { message: issue.message, code: issue.code },
        });
      else fail(error, token);
    } finally {
      if (valid(token)) creating = false;
    }
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setDraft: (draft: string) => publish({ draft: draft.slice(0, 4000) }),
    submit: async (prompt: string, plan?: GenerationPlan) => {
      if (
        destroyed ||
        creating ||
        cancelling ||
        (submission && !terminal.has(snapshot.generation.state))
      )
        return;
      if (!prompt.trim() || prompt.length > 4000) return;
      submission = { prompt: prompt.trim(), plan, key: newKey() };
      stopRequested = false;
      publish({
        generation: { state: "queued", prompt: submission.prompt, ...(plan ? { plan } : {}) },
        idempotencyKey: submission.key,
        interrupted: "",
        turns: [
          ...snapshot.turns,
          { key: submission.key, prompt: submission.prompt, generation: { state: "queued" } },
        ].slice(-30),
      });
      await recover();
    },
    recover,
    stop: async () => {
      if (
        destroyed ||
        cancelling ||
        terminal.has(snapshot.generation.state) ||
        snapshot.generation.state === "idle"
      )
        return;
      stopRequested = true;
      clear();
      if (creating) return;
      if (!snapshot.generation.id) {
        await recover();
        return;
      }
      const token = ++epoch;
      await cancel(token, snapshot.generation.id);
    },
    reset: (_context?: unknown) => {
      epoch++;
      clear();
      creating = false;
      cancelling = false;
      stopRequested = false;
      submission = null;
      session?.clear();
      session = undefined;
      publish({
        draft: "",
        generation: { state: "idle" },
        interrupted: "",
        idempotencyKey: undefined,
        turns: [],
      });
    },
    setSession: (next: ConversationSession) => {
      session = next;
    },
    destroy: () => {
      epoch++;
      clear();
      destroyed = true;
      listeners.clear();
      submission = null;
      snapshot = {
        draft: "",
        turns: [],
        generation: { state: "idle" },
        interrupted: "",
        busy: false,
      };
    },
  };
};
export type RequestController = ReturnType<typeof createRequestController>;
