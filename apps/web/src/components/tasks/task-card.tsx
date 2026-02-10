"use client";

import {
  CheckCircle2,
  Circle,
  Clock,
  History,
  Loader2,
  MoreVertical,
  Paperclip,
  Pencil,
  Play,
  Square,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AGENT_LABELS, type AgentId } from "@/lib/agent-preferences";
import type { TaskAttachment } from "@/server/api/routers/tasks";

export type TaskStatus = "todo" | "doing" | "done" | "canceled";

export type TaskCardProps = {
  id: string;
  body: string;
  status: TaskStatus;
  agentId?: AgentId | null;
  attachments?: TaskAttachment[];
  executionCount?: number;
  isRunning?: boolean;
  onEdit: (id: string) => void;
  onView?: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onRun?: (id: string) => void;
  onViewExecutions?: (id: string) => void;
};

const STATUS_CONFIG: Record<
  TaskStatus,
  {
    icon: typeof Circle;
    label: string;
    badgeVariant: "muted" | "info" | "success" | "danger";
  }
> = {
  todo: { icon: Circle, label: "To Do", badgeVariant: "muted" },
  doing: { icon: Clock, label: "In Progress", badgeVariant: "info" },
  done: { icon: CheckCircle2, label: "Done", badgeVariant: "success" },
  canceled: { icon: XCircle, label: "Canceled", badgeVariant: "danger" },
};

/**
 * Task card component for displaying a single task.
 */
export function TaskCard({
  id,
  body,
  status,
  agentId,
  attachments,
  executionCount = 0,
  isRunning = false,
  onEdit,
  onView,
  onStatusChange,
  onDelete,
  onRun,
  onViewExecutions,
}: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;
  const canRun = status === "todo" && agentId && onRun;

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen, handleClickOutside]);

  // Get first line or truncated body for display
  const displayText = body.split("\n")[0]?.slice(0, 100) || body.slice(0, 100);
  const hasMore = body.length > 100 || body.includes("\n");

  return (
    <div className="group relative flex flex-col gap-2 rounded-xl border border-white/10 bg-(--oc-panel) p-4 transition-colors hover:border-orange-500/30">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div className="mt-0.5 flex-shrink-0">
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
            ) : (
              <StatusIcon
                className={`h-4 w-4 ${
                  status === "done"
                    ? "text-emerald-400"
                    : status === "doing"
                      ? "text-blue-400"
                      : status === "canceled"
                        ? "text-rose-400"
                        : "text-slate-400"
                }`}
              />
            )}
          </div>
          {onView ? (
            <button
              type="button"
              className="text-sm text-slate-200 text-left hover:text-orange-300 transition-colors line-clamp-2"
              onClick={() => onView(id)}
            >
              {displayText}
              {hasMore && "..."}
            </button>
          ) : (
            <p className="text-sm text-slate-200 line-clamp-2">
              {displayText}
              {hasMore && "..."}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {canRun && !isRunning && (
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 transition-colors hover:bg-orange-500/30 hover:text-orange-300"
              onClick={() => onRun(id)}
              aria-label="Run task"
              title="Run with agent"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}

          {isRunning && (
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 transition-colors hover:bg-rose-500/30 hover:text-rose-300"
              onClick={() => onStatusChange(id, "todo")}
              aria-label="Stop task"
              title="Stop execution"
            >
              <Square className="h-3 w-3" />
            </button>
          )}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Task actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-white/10 bg-(--oc-panel-strong) py-1 shadow-xl">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-white/10"
                  onClick={() => {
                    onEdit(id);
                    setMenuOpen(false);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                {executionCount > 0 && onViewExecutions && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-white/10"
                    onClick={() => {
                      onViewExecutions(id);
                      setMenuOpen(false);
                    }}
                  >
                    <History className="h-3.5 w-3.5" />
                    View Executions ({executionCount})
                  </button>
                )}
                {canRun && !isRunning && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-orange-300 hover:bg-white/10"
                    onClick={() => {
                      onRun(id);
                      setMenuOpen(false);
                    }}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run with Agent
                  </button>
                )}
                {status !== "todo" && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-white/10"
                    onClick={() => {
                      onStatusChange(id, "todo");
                      setMenuOpen(false);
                    }}
                  >
                    <Circle className="h-3.5 w-3.5" />
                    Move to To Do
                  </button>
                )}
                {status !== "doing" && status !== "canceled" && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-white/10"
                    onClick={() => {
                      onStatusChange(id, "doing");
                      setMenuOpen(false);
                    }}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Start
                  </button>
                )}
                {status !== "done" && status !== "canceled" && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-white/10"
                    onClick={() => {
                      onStatusChange(id, "done");
                      setMenuOpen(false);
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark Done
                  </button>
                )}
                {status !== "canceled" && status !== "done" && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-rose-300 hover:bg-white/10"
                    onClick={() => {
                      onStatusChange(id, "canceled");
                      setMenuOpen(false);
                    }}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                )}
                <div className="my-1 border-t border-white/10" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-rose-300 hover:bg-white/10"
                  onClick={() => {
                    onDelete(id);
                    setMenuOpen(false);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={config.badgeVariant}>
          {isRunning ? "Running..." : config.label}
        </Badge>
        {agentId && <Badge variant="outline">{AGENT_LABELS[agentId]}</Badge>}
        {attachments && attachments.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Paperclip className="h-3 w-3" />
            {attachments.length}
          </span>
        )}
        {executionCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <History className="h-3 w-3" />
            {executionCount} run{executionCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
