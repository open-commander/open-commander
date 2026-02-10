"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  Loader2,
  MessageSquare,
  Pencil,
  Play,
  Terminal,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AGENT_LABELS, type AgentId } from "@/lib/agent-preferences";
import { api } from "@/trpc/react";

export type TaskDetailsModalProps = {
  open: boolean;
  taskId: string;
  onClose: () => void;
  onEdit: () => void;
  onRun: () => void;
};

type TabId = "input" | "output" | "logs";

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
    color: string;
  }
> = {
  pending: { icon: Clock, label: "Pending", color: "text-slate-400" },
  running: { icon: Loader2, label: "Running", color: "text-orange-400" },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    color: "text-emerald-400",
  },
  failed: { icon: AlertCircle, label: "Failed", color: "text-rose-400" },
  needs_input: {
    icon: MessageSquare,
    label: "Needs Input",
    color: "text-blue-400",
  },
};

/**
 * Modal for viewing task details with input/output tabs.
 */
export function TaskDetailsModal({
  open,
  taskId,
  onClose,
  onEdit,
  onRun,
}: TaskDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("input");

  const taskQuery = api.tasks.get.useQuery(
    { id: taskId },
    { enabled: open && !!taskId },
  );

  const executionsQuery = api.tasks.getExecutions.useQuery(
    { taskId },
    { enabled: open && !!taskId, refetchInterval: 3000 },
  );

  const task = taskQuery.data;
  const executions = (executionsQuery.data ?? []) as TaskExecution[];
  const latestExecution = executions[0];
  const isRunning = latestExecution?.status === "running";
  const canRun = task?.status === "todo" && task?.agentId;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Reset tab when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab("input");
    }
  }, [open]);

  if (!open) return null;

  const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
    { id: "input", label: "Input", icon: FileText },
    { id: "output", label: "Output", icon: Terminal },
    { id: "logs", label: "Logs", icon: Terminal },
  ];

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Task details"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-(--oc-panel-strong) shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div className="flex-1 min-w-0">
            {taskQuery.isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                <span className="text-slate-400">Loading...</span>
              </div>
            ) : task ? (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Task Details
                  </p>
                  {task.agentId && (
                    <Badge variant="outline">
                      {AGENT_LABELS[task.agentId as AgentId]}
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                  <span>
                    Created {new Date(task.createdAt).toLocaleDateString()}
                  </span>
                  {executions.length > 0 && (
                    <>
                      <span>•</span>
                      <span>
                        {executions.length} execution
                        {executions.length !== 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <span className="text-slate-400">Task not found</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canRun && !isRunning && (
              <Button
                size="sm"
                className="bg-orange-500/90 text-white hover:bg-orange-500"
                onClick={() => {
                  onRun();
                  onClose();
                }}
              >
                <Play className="h-3.5 w-3.5" />
                Run
              </Button>
            )}
            {isRunning && (
              <Badge variant="info" className="animate-pulse">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Running
              </Badge>
            )}
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-slate-400 hover:text-white"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-slate-400 hover:text-white"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-orange-400 text-orange-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "input" && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Task
                </h3>
                <div className="mt-2 rounded-xl border border-white/10 bg-(--oc-panel) p-4">
                  <p className="whitespace-pre-wrap text-sm text-slate-300">
                    {task?.body}
                  </p>
                </div>
              </div>

              {task?.attachments &&
                (task.attachments as unknown[]).length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Attachments
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(task.attachments as { id: string; name: string }[]).map(
                        (attachment) => (
                          <div
                            key={attachment.id}
                            className="rounded-lg border border-white/10 bg-(--oc-panel) px-3 py-2 text-sm text-slate-300"
                          >
                            {attachment.name}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Agent Configuration
                </h3>
                <div className="mt-2 rounded-xl border border-white/10 bg-(--oc-panel) p-4">
                  {task?.agentId ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-300">
                        Assigned to:
                      </span>
                      <Badge variant="outline">
                        {AGENT_LABELS[task.agentId as AgentId]}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-sm italic text-slate-500">
                      No agent assigned - assign an agent to run this task
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Workspace
                </h3>
                <div className="mt-2 rounded-xl border border-white/10 bg-(--oc-panel) p-4">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-300 font-mono">
                      {(task as { mountPoint?: string | null })?.mountPoint
                        ? `/workspace/${(task as { mountPoint?: string | null }).mountPoint}`
                        : "/workspace (root)"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Path mounted as /workspace in the container
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "output" && (
            <div className="flex flex-col gap-4">
              {executions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 py-12">
                  <Terminal className="h-8 w-8 text-slate-500" />
                  <p className="text-sm text-slate-400">No executions yet</p>
                  {canRun && (
                    <Button
                      size="sm"
                      className="bg-orange-500/90 text-white hover:bg-orange-500"
                      onClick={() => {
                        onRun();
                        onClose();
                      }}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Run Task
                    </Button>
                  )}
                </div>
              ) : (
                executions.map((execution) => {
                  const config =
                    STATUS_CONFIG[execution.status] ?? STATUS_CONFIG.pending;
                  const StatusIcon = config.icon;

                  return (
                    <div
                      key={execution.id}
                      className="rounded-xl border border-white/10 bg-(--oc-panel) p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <StatusIcon
                            className={`h-5 w-5 ${config.color} ${
                              execution.status === "running"
                                ? "animate-spin"
                                : ""
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
                        <Badge
                          variant={
                            execution.status === "completed"
                              ? "success"
                              : execution.status === "failed"
                                ? "danger"
                                : execution.status === "running"
                                  ? "info"
                                  : "muted"
                          }
                        >
                          {config.label}
                        </Badge>
                      </div>

                      {execution.result && (
                        <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                          <p className="text-xs font-medium uppercase text-emerald-400">
                            Result
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-200">
                            {execution.result}
                          </p>
                        </div>
                      )}

                      {execution.needsInput && execution.inputRequest && (
                        <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                          <p className="text-xs font-medium uppercase text-blue-400">
                            Input Required
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-blue-200">
                            {execution.inputRequest}
                          </p>
                        </div>
                      )}

                      {execution.errorMessage && (
                        <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3">
                          <p className="text-xs font-medium uppercase text-rose-400">
                            Error
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-rose-200">
                            {execution.errorMessage}
                          </p>
                        </div>
                      )}

                      {(execution.tokenCount ||
                        execution.memoryUsage ||
                        (execution.startedAt && execution.finishedAt)) && (
                        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                          {execution.tokenCount && (
                            <span>
                              Tokens: {execution.tokenCount.toLocaleString()}
                            </span>
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
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "logs" && (
            <div className="flex flex-col gap-4">
              {executions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 py-12">
                  <Terminal className="h-8 w-8 text-slate-500" />
                  <p className="text-sm text-slate-400">No logs available</p>
                </div>
              ) : (
                executions.map((execution) => (
                  <div
                    key={execution.id}
                    className="rounded-xl border border-white/10 bg-(--oc-panel)"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                      <span className="text-xs text-slate-400">
                        {execution.agentId
                          ? AGENT_LABELS[execution.agentId as AgentId]
                          : "Execution"}{" "}
                        - {new Date(execution.createdAt).toLocaleString()}
                      </span>
                      <Badge
                        variant={
                          execution.status === "completed"
                            ? "success"
                            : execution.status === "failed"
                              ? "danger"
                              : "muted"
                        }
                      >
                        {execution.status}
                      </Badge>
                    </div>
                    <div className="p-4">
                      {execution.logs ? (
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-mono text-xs text-slate-300">
                          {execution.logs}
                        </pre>
                      ) : (
                        <p className="text-sm italic text-slate-500">
                          {execution.status === "running"
                            ? "Logs will appear when execution completes..."
                            : "No logs available"}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-white/10 p-4">
          <Button
            variant="ghost"
            className="text-slate-300 hover:bg-white/10"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
