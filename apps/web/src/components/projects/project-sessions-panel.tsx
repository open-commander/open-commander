"use client";

import {
  AlertTriangle,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/trpc/react";
import { useProject } from "./project-context";

type SessionMenuState = {
  sessionId: string;
  x: number;
  y: number;
} | null;

/**
 * Secondary sidebar panel listing sessions for the selected project.
 * Renders on both desktop (permanent aside) and mobile (slide-over).
 */
export function ProjectSessionsPanel() {
  const {
    selectedProjectId,
    selectedSessionId,
    setSelectedSessionId,
    isPanelOpen,
    markSessionCreated,
  } = useProject();
  const utils = api.useUtils();

  const projectQuery = api.project.list.useQuery(undefined, {
    enabled: isPanelOpen,
  });
  const project = projectQuery.data?.find(
    (p: { id: string }) => p.id === selectedProjectId,
  );

  const sessionsQuery = api.project.listSessions.useQuery(
    { projectId: selectedProjectId! },
    {
      enabled: Boolean(selectedProjectId),
      refetchInterval: 5000,
    },
  );
  const sessions = sessionsQuery.data ?? [];

  const createSessionMutation = api.project.createSession.useMutation({
    onSuccess: (session) => {
      void utils.project.listSessions.invalidate({
        projectId: selectedProjectId!,
      });
      markSessionCreated(session.id);
      setSelectedSessionId(session.id);
    },
  });

  const removeSessionMutation = api.terminal.removeSession.useMutation({
    onSuccess: (_result, variables) => {
      void utils.project.listSessions.invalidate({
        projectId: selectedProjectId!,
      });
      if (selectedSessionId === variables.id) {
        setSelectedSessionId(null);
      }
    },
  });

  const updateNameMutation = api.terminal.updateSessionName.useMutation({
    onSuccess: () => {
      void utils.project.listSessions.invalidate({
        projectId: selectedProjectId!,
      });
    },
  });

  const [sessionMenu, setSessionMenu] = useState<SessionMenuState>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-open mobile panel when a project is selected
  useEffect(() => {
    if (isPanelOpen) setMobileOpen(true);
    else setMobileOpen(false);
  }, [isPanelOpen, selectedProjectId]);

  useEffect(() => {
    if (!sessionMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setSessionMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [sessionMenu]);

  const handleCreateSession = useCallback(() => {
    if (!selectedProjectId) return;
    const count = sessions.length + 1;
    createSessionMutation.mutate({
      projectId: selectedProjectId,
      name: `Session ${count}`,
    });
  }, [selectedProjectId, sessions.length, createSessionMutation]);

  const handleRename = useCallback(
    (sessionId: string, currentName: string) => {
      setSessionMenu(null);
      const newName = window.prompt("Rename session", currentName);
      if (newName?.trim()) {
        updateNameMutation.mutate({ id: sessionId, name: newName.trim() });
      }
    },
    [updateNameMutation],
  );

  const handleRemove = useCallback(
    (sessionId: string) => {
      setSessionMenu(null);
      removeSessionMutation.mutate({ id: sessionId });
    },
    [removeSessionMutation],
  );

  const dismissCreateError = useCallback(() => {
    createSessionMutation.reset();
  }, [createSessionMutation]);

  const dismissRemoveError = useCallback(() => {
    removeSessionMutation.reset();
  }, [removeSessionMutation]);

  if (!isPanelOpen) return null;

  const statusColor = (status: string) => {
    if (status === "running") return "bg-emerald-400";
    if (status === "starting" || status === "pending") return "bg-yellow-400";
    return "bg-slate-500";
  };

  const panelContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <span className="truncate text-xs font-semibold uppercase tracking-widest text-slate-400">
          {project?.name ?? "Project"}
        </span>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-emerald-400/10 hover:text-emerald-300"
                  aria-label="New session"
                  onClick={handleCreateSession}
                  disabled={createSessionMutation.isPending}
                >
                  {createSessionMutation.isPending ? (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden
                    />
                  ) : (
                    <Plus
                      className="h-3.5 w-3.5"
                      strokeWidth={2}
                      aria-hidden
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">New Session</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {/* Mobile close */}
          <button
            type="button"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200 md:hidden"
            aria-label="Close panel"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>

      {/* Inline error: create session */}
      {createSessionMutation.isError && (
        <div className="mx-2 mt-2 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
          <AlertTriangle
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400"
            aria-hidden
          />
          <div className="flex-1">
            <p className="text-xs font-medium text-rose-200">
              Failed to create session
            </p>
            <p className="mt-0.5 text-xs text-rose-300/80">
              {createSessionMutation.error?.message ?? "Unknown error."}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 text-rose-400 hover:text-rose-200"
            onClick={dismissCreateError}
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" strokeWidth={2} aria-hidden />
          </button>
        </div>
      )}

      {/* Inline error: remove session */}
      {removeSessionMutation.isError && (
        <div className="mx-2 mt-2 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
          <AlertTriangle
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400"
            aria-hidden
          />
          <div className="flex-1">
            <p className="text-xs font-medium text-rose-200">
              Failed to remove session
            </p>
            <p className="mt-0.5 text-xs text-rose-300/80">
              {removeSessionMutation.error?.message ?? "Unknown error."}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 text-rose-400 hover:text-rose-200"
            onClick={dismissRemoveError}
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" strokeWidth={2} aria-hidden />
          </button>
        </div>
      )}

      {/* Sessions list */}
      <div className="flex flex-1 flex-col overflow-y-auto px-2 py-2">
        {sessionsQuery.isLoading ? (
          <div className="flex items-center gap-2 px-2 py-4 text-xs text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Loading...
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
            <p className="text-xs text-slate-500">No sessions yet.</p>
            <button
              type="button"
              className="text-xs text-emerald-400 transition hover:text-emerald-300"
              onClick={handleCreateSession}
            >
              Create one to start.
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {sessions.map((session) => {
              const isActive = session.id === selectedSessionId;
              return (
                <div
                  key={session.id}
                  className={`group relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
                    isActive
                      ? "bg-emerald-400/15 text-emerald-200"
                      : "text-slate-300 hover:bg-white/5 hover:text-slate-100"
                  }`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                    onClick={() => {
                      setSelectedSessionId(session.id);
                      setMobileOpen(false);
                    }}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${statusColor(session.status)}`}
                      aria-hidden
                    />
                    <span className="truncate">{session.name}</span>
                  </button>
                  <button
                    type="button"
                    className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-slate-500 opacity-0 transition hover:bg-white/10 hover:text-slate-300 group-hover:opacity-100"
                    aria-label="Session options"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSessionMenu({
                        sessionId: session.id,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                  >
                    <MoreVertical
                      className="h-3.5 w-3.5"
                      strokeWidth={1.6}
                      aria-hidden
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </>
  );

  return (
    <>
      {/* Desktop: permanent aside */}
      <aside className="hidden w-56 flex-col border-r border-purple-500/25 bg-(--oc-panel) md:flex">
        {panelContent}
      </aside>

      {/* Mobile: slide-over drawer */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Close sessions panel"
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`relative z-10 flex h-full w-72 flex-col border-r border-purple-500/25 bg-(--oc-panel) backdrop-blur transition-transform duration-200 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {panelContent}
        </aside>
      </div>

      {/* Context menu — rendered once at top level so ref + z-index work reliably */}
      {sessionMenu && (
        <div
          ref={menuRef}
          className="fixed z-[100] min-w-[140px] rounded-lg border border-white/10 bg-(--oc-panel-strong) py-1 shadow-xl"
          style={{ left: sessionMenu.x, top: sessionMenu.y }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-200 transition hover:bg-white/10"
            onClick={() => {
              const s = sessions.find((s) => s.id === sessionMenu.sessionId);
              if (s) handleRename(s.id, s.name);
            }}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
            Rename
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-rose-300 transition hover:bg-rose-500/10"
            onClick={() => handleRemove(sessionMenu.sessionId)}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
            Remove
          </button>
        </div>
      )}
    </>
  );
}
