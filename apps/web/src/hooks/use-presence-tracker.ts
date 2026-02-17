import { useEffect, useRef } from "react";
import { env } from "@/env";
import { api } from "@/trpc/react";

const HEARTBEAT_INTERVAL_MS = 15_000;
const ACTIVE_THRESHOLD_MS = 30_000;
const VIEWING_THRESHOLD_MS = 2 * 60_000;

/**
 * Compute presence status from the last interaction timestamp.
 */
function computeStatus(
  lastInteractionMs: number,
): "active" | "viewing" | "inactive" {
  const elapsed = Date.now() - lastInteractionMs;
  if (elapsed < ACTIVE_THRESHOLD_MS) return "active";
  if (elapsed < VIEWING_THRESHOLD_MS) return "viewing";
  return "inactive";
}

/**
 * Tracks the current user's presence in a terminal session.
 * Sends heartbeats every 15s and cleans up on unmount / beforeunload.
 * When sessionId changes, the heartbeat upsert atomically moves the user
 * to the new session — no leave/delete needed on switch.
 * No-ops when auth is disabled.
 */
export function usePresenceTracker(sessionId: string | null): void {
  const lastInteraction = useRef(Date.now());
  const utils = api.useUtils();
  const { mutate: heartbeat } = api.presence.heartbeat.useMutation({
    onSuccess: () => {
      void utils.presence.listByProject.invalidate();
    },
  });
  const { mutate: leave } = api.presence.leave.useMutation({
    onSuccess: () => {
      void utils.presence.listByProject.invalidate();
    },
  });
  const heartbeatMutateRef = useRef(heartbeat);
  const leaveMutateRef = useRef(leave);
  const sessionIdRef = useRef(sessionId);

  useEffect(() => {
    heartbeatMutateRef.current = heartbeat;
  }, [heartbeat]);

  useEffect(() => {
    leaveMutateRef.current = leave;
  }, [leave]);

  // Keep sessionId ref in sync
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Track user interactions
  useEffect(() => {
    if (env.NEXT_PUBLIC_DISABLE_AUTH) return;

    const onInteraction = () => {
      lastInteraction.current = Date.now();
    };

    const events = ["mousemove", "keydown", "click", "scroll"] as const;
    for (const evt of events) {
      document.addEventListener(evt, onInteraction, { passive: true });
    }

    return () => {
      for (const evt of events) {
        document.removeEventListener(evt, onInteraction);
      }
    };
  }, []);

  // Heartbeat interval — fires immediately on session change, then every 15s.
  // Does NOT call leave on session switch; the upsert handles the move atomically.
  useEffect(() => {
    if (env.NEXT_PUBLIC_DISABLE_AUTH || !sessionId) return;

    const emitHeartbeat = () => {
      const status = computeStatus(lastInteraction.current);
      heartbeatMutateRef.current({ sessionId, status });
    };
    emitHeartbeat();

    const interval = window.setInterval(emitHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [sessionId]);

  // Leave only on real unmount / tab close
  useEffect(() => {
    if (env.NEXT_PUBLIC_DISABLE_AUTH) return;

    const onBeforeUnload = () => {
      leaveMutateRef.current();
    };

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      leaveMutateRef.current();
    };
  }, []);
}
