"use client";

import { ArrowDown, ArrowUp, GripVertical, Loader2 } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AGENT_IDS,
  AGENT_LABELS,
  type AgentId,
  DEFAULT_AGENT_ORDER,
} from "@/lib/agent-preferences";
import type { AgentPreferencesMap } from "@/server/api/routers/settings";
import { api } from "@/trpc/react";

const AGENT_LOGO: Record<AgentId, string> = {
  opencode: "/imgs/agents/opencode.png",
  claude: "/imgs/agents/claude.webp",
  codex: "/imgs/agents/codex.webp",
  cursor: "/imgs/agents/cursor.png",
};

function defaultAgentsState(): AgentPreferencesMap {
  return DEFAULT_AGENT_ORDER.reduce((acc, id, index) => {
    acc[id] = { active: true, order: index };
    return acc;
  }, {} as AgentPreferencesMap);
}

/** Display order: IDs sorted by preference order. */
function orderFromAgents(agents: AgentPreferencesMap): AgentId[] {
  return [...AGENT_IDS].sort(
    (a, b) => (agents[a]?.order ?? 0) - (agents[b]?.order ?? 0),
  );
}

function agentsEqual(a: AgentPreferencesMap, b: AgentPreferencesMap): boolean {
  return AGENT_IDS.every((id) => {
    const x = a[id];
    const y = b[id];
    return x?.active === y?.active && x?.order === y?.order;
  });
}

export function ModelPreferencesPanel() {
  const utils = api.useUtils();
  const preferencesQuery = api.settings.getAgentPreferences.useQuery(
    undefined,
    { staleTime: 60_000 },
  );
  const updateMutation = api.settings.updateAgentPreferences.useMutation({
    onSuccess: (data) => {
      utils.settings.getAgentPreferences.setData(undefined, data);
      setModalOpen(false);
    },
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [agents, setAgents] = useState<AgentPreferencesMap>(
    defaultAgentsState(),
  );
  const [dragState, setDragState] = useState<{
    id: AgentId;
    currentX: number;
    currentY: number;
    offsetX: number;
    offsetY: number;
    itemHeight: number;
    itemGap: number;
    itemWidth: number;
    previewOrder: AgentId[];
  } | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const agentsRef = useRef<AgentPreferencesMap>(agents);
  const itemRefs = useRef(new Map<AgentId, HTMLDivElement>());

  const order = useMemo(() => orderFromAgents(agents), [agents]);
  const previewOrder = dragState?.previewOrder ?? order;

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    if (!modalOpen || !preferencesQuery.data) return;
    setAgents(preferencesQuery.data);
  }, [modalOpen, preferencesQuery.data]);

  const isDirty = useMemo(() => {
    const data = preferencesQuery.data;
    if (!data) return true;
    return !agentsEqual(agents, data);
  }, [agents, preferencesQuery.data]);

  const setOrderFromList = useCallback((newOrder: AgentId[]) => {
    setAgents((prev) => {
      const next = { ...prev };
      newOrder.forEach((id, i) => {
        next[id] = { ...next[id], order: i };
      });
      return next;
    });
  }, []);

  const toggleActive = useCallback((agentId: AgentId) => {
    setAgents((prev) => ({
      ...prev,
      [agentId]: { ...prev[agentId], active: !prev[agentId].active },
    }));
  }, []);

  const handleMove = useCallback(
    (id: AgentId, delta: number) => {
      const idx = order.indexOf(id);
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= order.length) return;
      const nextOrder = [...order];
      const [removed] = nextOrder.splice(idx, 1);
      nextOrder.splice(nextIdx, 0, removed);
      setOrderFromList(nextOrder);
    },
    [order, setOrderFromList],
  );

  const handlePointerDown =
    (id: AgentId) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const listEl = listRef.current;
      const gapValue = listEl
        ? Number.parseFloat(getComputedStyle(listEl).rowGap || "0")
        : 0;
      setDragState({
        id,
        currentX: event.clientX,
        currentY: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        itemHeight: rect.height,
        itemWidth: rect.width,
        itemGap: Number.isNaN(gapValue) ? 0 : gapValue,
        previewOrder: order,
      });
      event.currentTarget.setPointerCapture(event.pointerId);
    };

  useEffect(() => {
    if (!dragState) return;
    const handlePointerMove = (event: PointerEvent) => {
      setDragState((prev) => {
        if (!prev) return prev;
        const orderNow = orderFromAgents(agentsRef.current);
        const items = orderNow.filter((item) => item !== prev.id);
        let insertIndex = items.length;
        for (let i = 0; i < items.length; i += 1) {
          const el = itemRefs.current.get(items[i]);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          const mid = rect.top + rect.height / 2;
          if (event.clientY < mid) {
            insertIndex = i;
            break;
          }
        }
        const nextOrder = [...items];
        nextOrder.splice(insertIndex, 0, prev.id);
        return {
          ...prev,
          currentX: event.clientX,
          currentY: event.clientY,
          previewOrder: nextOrder,
        };
      });
    };
    const handlePointerUp = () => {
      const state = dragState;
      if (!state) {
        setDragState(null);
        return;
      }
      const currentOrder = orderFromAgents(agentsRef.current);
      if (state.previewOrder.join("|") !== currentOrder.join("|")) {
        setOrderFromList(state.previewOrder);
      }
      setDragState(null);
    };
    const handlePointerCancel = () => setDragState(null);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [dragState, setOrderFromList]);

  const handleSave = () => {
    updateMutation.reset();
    updateMutation.mutate({ agents });
  };

  return (
    <>
      <button
        type="button"
        className="w-full cursor-pointer text-left"
        aria-label="Edit agent preferences"
        onClick={() => setModalOpen(true)}
      >
        <Card className="transition hover:border-emerald-400/50 hover:bg-white/5">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-[0.3em] text-slate-400">
              Agent preferences
            </CardTitle>
            <Badge variant="muted">{order.length} agents</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-300">
              Set the priority order for agent suggestions. Drag to reorder or
              use the arrows in the modal.
            </p>
          </CardContent>
        </Card>
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="model-preferences-title"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-(--oc-panel-strong) p-6 shadow-xl">
            <div>
              <h2
                id="model-preferences-title"
                className="text-lg font-semibold text-white"
              >
                Agent preferences
              </h2>
              <p className="text-sm text-slate-300">
                Reorder agents to control their priority.
              </p>
            </div>

            <ul ref={listRef} className="mt-6 flex flex-col gap-2">
              {order.map((agentId, index) => {
                const entry = agents[agentId];
                const active = entry?.active ?? true;
                const logoSrc = AGENT_LOGO[agentId];
                const isDragging = dragState?.id === agentId;
                const itemSize = dragState
                  ? dragState.itemHeight + dragState.itemGap
                  : 0;
                const currentIndex = index;
                const targetIndex = previewOrder.indexOf(agentId);
                const offset =
                  dragState && !isDragging && itemSize > 0 && targetIndex !== -1
                    ? (targetIndex - currentIndex) * itemSize
                    : 0;
                return (
                  <li key={agentId}>
                    <div
                      ref={(node) => {
                        if (node) itemRefs.current.set(agentId, node);
                        else itemRefs.current.delete(agentId);
                      }}
                      className={`flex cursor-grab items-center justify-between rounded-xl border px-3 py-2 active:cursor-grabbing ${
                        !active
                          ? "border-white/5 bg-slate-500/10 opacity-60"
                          : "border-white/10 bg-white/5"
                      } ${
                        isDragging
                          ? "opacity-0"
                          : "transition-transform duration-200 ease-out"
                      }`}
                      onPointerDown={handlePointerDown(agentId)}
                      style={{
                        transform: offset
                          ? `translateY(${offset}px)`
                          : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical
                          className="h-4 w-4 shrink-0 text-slate-500"
                          aria-hidden
                        />
                        <Image
                          src={logoSrc}
                          alt=""
                          width={32}
                          height={32}
                          className="h-8 w-8 shrink-0 rounded-[999px] object-contain"
                          aria-hidden
                        />
                        <span
                          className={`text-sm font-medium ${
                            !active ? "text-slate-400" : "text-white"
                          }`}
                        >
                          {AGENT_LABELS[agentId]}
                        </span>
                      </div>
                      <div
                        className={`flex items-center gap-2 ${isDragging ? "invisible pointer-events-none" : ""}`}
                      >
                        <button
                          type="button"
                          role="switch"
                          aria-checked={active}
                          aria-label={`${active ? "Disable" : "Enable"} ${AGENT_LABELS[agentId]}`}
                          className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${
                            !active
                              ? "border-white/10 bg-white/10"
                              : "border-emerald-400/50 bg-emerald-400/30"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActive(agentId);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <span
                            className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition-[left] ${
                              !active ? "left-1" : "left-5"
                            }`}
                            aria-hidden
                          />
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-lg border border-white/10 text-slate-300 hover:border-emerald-400/60 hover:bg-emerald-400/10 disabled:opacity-40"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMove(agentId, -1);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          disabled={index === 0 || isDragging}
                          aria-label={`Move ${AGENT_LABELS[agentId]} up`}
                        >
                          <ArrowUp className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-lg border border-white/10 text-slate-300 hover:border-emerald-400/60 hover:bg-emerald-400/10 disabled:opacity-40"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMove(agentId, 1);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          disabled={index === order.length - 1 || isDragging}
                          aria-label={`Move ${AGENT_LABELS[agentId]} down`}
                        >
                          <ArrowDown className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {dragState && (
              <div className="pointer-events-none fixed inset-0 z-110">
                <div
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 shadow-2xl ${
                    !agents[dragState.id]?.active
                      ? "border-white/5 bg-slate-500/20 opacity-80"
                      : "border-white/10 bg-[rgb(28,32,40)]"
                  }`}
                  style={{
                    width: dragState.itemWidth,
                    transform: `translate(${dragState.currentX - dragState.offsetX}px, ${dragState.currentY - dragState.offsetY}px)`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical
                      className="h-4 w-4 shrink-0 text-slate-500"
                      aria-hidden
                    />
                    <Image
                      src={AGENT_LOGO[dragState.id]}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 shrink-0 rounded-[999px] object-contain"
                      aria-hidden
                    />
                    <span className="text-sm font-medium text-white">
                      {AGENT_LABELS[dragState.id]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span
                      className={`inline-block h-6 w-10 shrink-0 rounded-full border ${
                        !agents[dragState.id]?.active
                          ? "border-white/10 bg-white/10"
                          : "border-emerald-400/50 bg-emerald-400/30"
                      }`}
                      aria-hidden
                    />
                    <ArrowUp className="h-4 w-4" aria-hidden />
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </div>
                </div>
              </div>
            )}

            {updateMutation.error && (
              <p className="mt-4 text-sm text-rose-400" role="alert">
                {updateMutation.error.message}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="text-slate-300 hover:bg-white/10"
                onClick={() => setModalOpen(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-emerald-500/90 text-white hover:bg-emerald-500"
                onClick={handleSave}
                disabled={!isDirty || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2
                      className="h-4 w-4 shrink-0 animate-spin"
                      aria-hidden
                    />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
