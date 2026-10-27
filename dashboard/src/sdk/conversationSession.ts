import type { Generation } from "@/types/assistant";
import type { SmokeyContext } from "./contracts";

// Host revisions fence requests, but may restart at a different value on refresh.
// Persist only across the same user, business and effective access permissions.
export const conversationScope = (context: SmokeyContext) =>
  JSON.stringify([
    context.identity.hostId,
    context.identity.organizationId,
    context.identity.actorId,
    context.installed,
    context.enabled,
    [...context.permissions].sort(),
    [...context.reportKinds].sort(),
  ]);

export interface ConversationTurn {
  key: string;
  prompt: string;
  generation: Generation;
}
export interface ConversationMemory {
  draft: string;
  turns: ConversationTurn[];
}
type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const states = new Set([
  "queued",
  "searching",
  "generating",
  "succeeded",
  "empty",
  "failed",
  "cancelled",
]);
const compactGeneration = (generation: Generation): Generation => ({
  state: generation.state,
  ...(generation.id ? { id: generation.id } : {}),
  ...(generation.report_id ? { report_id: generation.report_id } : {}),
  ...(generation.plan ? { plan: generation.plan } : {}),
  ...(generation.clarification ? { clarification: generation.clarification.slice(0, 500) } : {}),
  ...(generation.error
    ? { error: { message: generation.error.message.slice(0, 300), code: generation.error.code } }
    : {}),
});
export const createConversationSession = (scope: string, storage?: StoragePort) => {
  const key = `smokey.conversation.v1:${scope}`;
  const clear = () => {
    try {
      storage?.removeItem(key);
    } catch {
      /* Storage may be disabled. */
    }
  };
  return {
    read: (): ConversationMemory => {
      const empty = { draft: "", turns: [] };
      try {
        const raw = storage?.getItem(key);
        if (!raw || raw.length > 250000) return empty;
        const value = JSON.parse(raw);
        if (!Array.isArray(value.turns) || typeof value.draft !== "string") return empty;
        const turns: ConversationTurn[] = value.turns
          .slice(-30)
          .filter(
            (turn: ConversationTurn) =>
              typeof turn?.key === "string" &&
              turn.key.length <= 100 &&
              typeof turn.prompt === "string" &&
              turn.prompt.length <= 4000 &&
              turn.generation &&
              states.has(turn.generation.state) &&
              (!turn.generation.id || typeof turn.generation.id === "string") &&
              (!turn.generation.report_id || typeof turn.generation.report_id === "string") &&
              (!turn.generation.clarification ||
                typeof turn.generation.clarification === "string") &&
              (!turn.generation.error || typeof turn.generation.error.message === "string"),
          );
        return { draft: value.draft.slice(0, 4000), turns };
      } catch {
        clear();
        return empty;
      }
    },
    write: (value: ConversationMemory) => {
      try {
        storage?.setItem(
          key,
          JSON.stringify({
            draft: value.draft,
            turns: value.turns
              .slice(-30)
              .map((turn) => ({ ...turn, generation: compactGeneration(turn.generation) })),
          }),
        );
      } catch {
        /* In-memory chat remains usable if session storage is full. */
      }
    },
    clear,
  };
};
export type ConversationSession = ReturnType<typeof createConversationSession>;
export const browserSessionStorage = (): StoragePort | undefined => {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
};
export const clearBrowserConversations = () => {
  try {
    const storage = window.sessionStorage;
    Object.keys(storage)
      .filter((key) => key.startsWith("smokey.conversation.v1:"))
      .forEach((key) => storage.removeItem(key));
  } catch {
    /* Logging out must work without browser storage. */
  }
};
