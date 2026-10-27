import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAssistantClient, useAssistantRuntime, useRuntimeSnapshot } from "@/sdk/RuntimeProvider";
import { normalizedError } from "@/sdk/errors";
import { errorMessage } from "@/lib/errors";
export const useBusinessResource = <T>(path: string | null) => {
  const client = useAssistantClient(),
    { epoch } = useRuntimeSnapshot();
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(Boolean(path)),
    [error, setError] = useState("");
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await client.requestPath<T>(path);
      if (current === sequence.current) setData(result);
    } catch (issue) {
      const normalized = normalizedError(issue);
      if (current === sequence.current && !["ABORTED", "STALE_CONTEXT"].includes(normalized.code))
        setError(normalized.message);
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [path, client, epoch]);
  useEffect(() => {
    setData(null);
    void refresh();
    return () => {
      sequence.current++;
    };
  }, [refresh]);
  return { data, loading, error, refresh };
};
export const useBusinessAction = () => {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const running = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const act = async (message: string, task: () => Promise<unknown>, success = "") => {
    if (running.current) return;
    running.current = true;
    setBusy(message);
    setError("");
    setNotice("");
    try {
      await task();
      if (mounted.current) setNotice(success);
    } catch (issue) {
      if (mounted.current) setError(errorMessage(issue));
    } finally {
      running.current = false;
      if (mounted.current) setBusy("");
    }
  };
  return { busy, error, notice, act };
};

export const useGeneration = () => {
  const controller = useAssistantRuntime().getController();
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  return {
    state: snapshot.generation,
    turns: snapshot.turns,
    draft: snapshot.draft,
    setDraft: controller.setDraft,
    interrupted: snapshot.interrupted,
    busy: snapshot.busy,
    submit: controller.submit,
    resume: controller.recover,
    stop: controller.stop,
  };
};
