"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AGENT_LABELS, type AgentId } from "@/lib/agent-preferences";
import { api } from "@/trpc/react";

export type ExecutionLogsModalProps = {
  open: boolean;
  taskId: string;
  taskBody: string;
  onClose: () => void;
};

type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "needs_input";

type TaskExecution = {
  id: string;
  taskId: string;
  status: ExecutionStatus;
  agentId: string | null;
  containerName: string | null;
  completed: boolean;
  needsInput: boolean;
  inputRequest: string | null;
  result: string | null;
  errorMessage: string | null;
  logs: string | null;
  memoryUsage: number | null;
  tokenCount: number | null;
  context: unknown;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const STATUS_CONFIG: Record<
  ExecutionStatus,
  {
    icon: typeof Clock;
    label: string;
    badgeVariant: "muted" | "info" | "success" | "danger";
  }
> = {
  pending: { icon: Clock, label: "Pending", badgeVariant: "muted" },
  running: { icon: Loader2, label: "Running", badgeVariant: "info" },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    badgeVariant: "success",
  },
  failed: { icon: AlertCircle, label: "Failed", badgeVariant: "danger" },
  needs_input: {
    icon: MessageSquare,
    label: "Needs Input",
    badgeVariant: "info",
  },
};

/**
 * Modal for viewing task execution history and logs.
 */
export function ExecutionLogsModal({
  open,
  taskId,
  taskBody,
  onClose,
}: ExecutionLogsModalProps) {
  const executionsQuery = api.tasks.getExecutions.useQuery(
    { taskId },
    { enabled: open, refetchInterval: 5000 },
  );

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const executions = executionsQuery.data ?? [];

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Execution logs"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-(--oc-panel-strong) shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex-1 min-w-0 mr-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Execution History
            </p>
            <p className="text-sm text-white line-clamp-2">{taskBody}</p>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {executionsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-400">
              <Clock className="h-8 w-8" />
              <p>No executions yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {(executions as TaskExecution[]).map((execution) => {
                const config =
                  STATUS_CONFIG[execution.status as ExecutionStatus] ??
                  STATUS_CONFIG.pending;
                const StatusIcon = config.icon;

                return (
                  <div
                    key={execution.id}
                    className="rounded-xl border border-white/10 bg-(--oc-panel) p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <StatusIcon
                          className={`h-5 w-5 ${
                            execution.status === "running"
                              ? "animate-spin text-orange-400"
                              : execution.status === "completed"
                                ? "text-emerald-400"
                                : execution.status === "failed"
                                  ? "text-rose-400"
                                  : "text-slate-400"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {execution.agentId
                              ? AGENT_LABELS[execution.agentId as AgentId]
                              : "Unknown Agent"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(execution.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={config.badgeVariant}>
                        {config.label}
                      </Badge>
                    </div>

                    {execution.result && (
                      <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                        <p className="text-xs font-medium uppercase text-emerald-400">
                          Result
                        </p>
                        <p className="mt-1 text-sm text-emerald-200">
                          {execution.result}
                        </p>
                      </div>
                    )}

                    {execution.needsInput && execution.inputRequest && (
                      <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                        <p className="text-xs font-medium uppercase text-blue-400">
                          Input Required
                        </p>
                        <p className="mt-1 text-sm text-blue-200">
                          {execution.inputRequest}
                        </p>
                      </div>
                    )}

                    {execution.errorMessage && (
                      <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3">
                        <p className="text-xs font-medium uppercase text-rose-400">
                          Error
                        </p>
                        <p className="mt-1 text-sm text-rose-200">
                          {execution.errorMessage}
                        </p>
                      </div>
                    )}

                    {execution.logs && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-300">
                          View Logs
                        </summary>
                        <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-black/30 p-3 font-mono text-xs text-slate-300">
                          {execution.logs}
                        </pre>
                      </details>
                    )}

                    <div className="mt-3 flex gap-4 text-xs text-slate-500">
                      {execution.tokenCount && (
                        <span>Tokens: {execution.tokenCount}</span>
                      )}
                      {execution.memoryUsage && (
                        <span>
                          Memory:{" "}
                          {Math.round(execution.memoryUsage / 1024 / 1024)}
                          MB
                        </span>
                      )}
                      {execution.startedAt && execution.finishedAt && (
                        <span>
                          Duration:{" "}
                          {Math.round(
                            (new Date(execution.finishedAt).getTime() -
                              new Date(execution.startedAt).getTime()) /
                              1000,
                          )}
                          s
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-4">
          <Button
            variant="ghost"
            className="w-full text-slate-300 hover:bg-white/10"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
