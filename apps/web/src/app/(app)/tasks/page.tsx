"use client";

import {
  CheckCircle2,
  CheckSquare,
  Circle,
  Clock,
  Globe,
  KanbanSquare,
  List,
  Loader2,
  Plus,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ExecutionLogsModal } from "@/components/tasks/execution-logs-modal";
import { TaskCard, type TaskStatus } from "@/components/tasks/task-card";
import { TaskDetailsModal } from "@/components/tasks/task-details-modal";
import { type TaskFormData, TaskModal } from "@/components/tasks/task-modal";
import { AnimatedPageTitle } from "@/components/ui/animated-page-title";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/use-page-title";
import type { AgentId } from "@/lib/agent-preferences";
import type { TaskAttachment } from "@/server/api/routers/tasks";
import { api } from "@/trpc/react";

type TaskData = {
  id: string;
  body: string;
  status: TaskStatus;
  agentId: AgentId | null;
  mountPoint: string | null;
  attachments: TaskAttachment[];
  createdAt: Date;
  updatedAt: Date;
};

type ViewMode = "list" | "kanban";

type KanbanColumn = {
  id: string;
  label: string;
  icon: typeof Circle;
  statuses: TaskStatus[];
};

const COLUMNS: KanbanColumn[] = [
  { id: "todo", label: "To Do", icon: Circle, statuses: ["todo"] },
  { id: "doing", label: "In Progress", icon: Clock, statuses: ["doing"] },
  {
    id: "done",
    label: "Done",
    icon: CheckCircle2,
    statuses: ["done", "canceled"],
  },
];

/**
 * Tasks page with list and kanban views.
 */
export default function TasksPage() {
  usePageTitle("Tasks");

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [includeApiTasks, setIncludeApiTasks] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<{
    id: string;
    body: string;
    agentId: string | null;
    mountPoint: string;
    attachments: {
      id: string;
      name: string;
      url: string;
      type: string;
      size: number;
    }[];
  } | null>(null);
  const [executionsTaskId, setExecutionsTaskId] = useState<string | null>(null);
  const [detailsTaskId, setDetailsTaskId] = useState<string | null>(null);
  const [runningTasks, setRunningTasks] = useState<Set<string>>(new Set());

  const utils = api.useUtils();
  const tasksQuery = api.tasks.list.useQuery(
    { includeApiTasks },
    { refetchInterval: 5000 },
  );
  const agentPrefsQuery = api.settings.getAgentPreferences.useQuery();

  const createMutation = api.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setModalOpen(false);
    },
  });

  const updateMutation = api.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setEditingTask(null);
    },
  });

  const updateStatusMutation = api.tasks.updateStatus.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
    },
  });

  const deleteMutation = api.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
    },
  });

  const runMutation = api.tasks.run.useMutation({
    onMutate: ({ id }) => {
      setRunningTasks((prev) => new Set(prev).add(id));
    },
    onSuccess: () => {
      utils.tasks.list.invalidate();
    },
    onError: (_error, { id }) => {
      setRunningTasks((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
  });

  // Sync runningTasks with actual task statuses to fix loading state bug
  useEffect(() => {
    if (!tasksQuery.data) return;
    const taskData = tasksQuery.data as TaskData[];
    setRunningTasks((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        const task = taskData.find((t) => t.id === id);
        // Only keep in runningTasks if task is still "doing"
        if (task && task.status === "doing") {
          next.add(id);
        }
      }
      // Return same reference if no changes to avoid re-renders
      if (next.size === prev.size && [...next].every((id) => prev.has(id))) {
        return prev;
      }
      return next;
    });
  }, [tasksQuery.data]);

  const handleCreate = useCallback(
    (data: TaskFormData) => {
      createMutation.mutate({
        body: data.body,
        agentId: data.agentId,
        mountPoint: data.mountPoint || undefined,
        attachments: data.attachments,
      });
    },
    [createMutation],
  );

  const handleEdit = useCallback(
    (data: TaskFormData) => {
      if (!editingTask) return;
      updateMutation.mutate({
        id: editingTask.id,
        body: data.body,
        agentId: data.agentId,
        mountPoint: data.mountPoint || null,
        attachments: data.attachments,
      });
    },
    [editingTask, updateMutation],
  );

  const handleStatusChange = useCallback(
    (id: string, status: TaskStatus) => {
      updateStatusMutation.mutate({ id, status });
      // Clear running state if task is reset
      if (status === "todo") {
        setRunningTasks((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [updateStatusMutation],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (confirm("Are you sure you want to delete this task?")) {
        deleteMutation.mutate({ id });
      }
    },
    [deleteMutation],
  );

  const handleRun = useCallback(
    (id: string) => {
      runMutation.mutate({ id });
    },
    [runMutation],
  );

  const handleViewExecutions = useCallback((id: string) => {
    setExecutionsTaskId(id);
  }, []);

  const handleViewDetails = useCallback((id: string) => {
    setDetailsTaskId(id);
  }, []);

  const tasks = (tasksQuery.data ?? []) as TaskData[];
  const isLoading = tasksQuery.isLoading;

  const openEditModal = useCallback(
    (id: string) => {
      const task = tasks.find((t: TaskData) => t.id === id);
      if (task) {
        setEditingTask({
          id: task.id,
          body: task.body,
          agentId: task.agentId,
          mountPoint: task.mountPoint ?? "",
          attachments: task.attachments,
        });
      }
    },
    [tasks],
  );

  // Group tasks by column for kanban view
  const tasksByColumn = COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = tasks.filter((task: TaskData) =>
        col.statuses.includes(task.status),
      );
      return acc;
    },
    {} as Record<string, TaskData[]>,
  );

  // Filter active tasks for list view (exclude canceled by default)
  const activeTasks = tasks.filter(
    (task: TaskData) => task.status !== "canceled",
  );
  const canceledTasks = tasks.filter(
    (task: TaskData) => task.status === "canceled",
  );

  // Get task being viewed for executions
  const executionsTask = executionsTaskId
    ? tasks.find((t) => t.id === executionsTaskId)
    : null;

  const renderTaskCard = (task: TaskData) => (
    <TaskCard
      key={task.id}
      id={task.id}
      body={task.body}
      status={task.status as TaskStatus}
      agentId={task.agentId}
      attachments={task.attachments}
      isRunning={task.status === "doing" || runningTasks.has(task.id)}
      onEdit={openEditModal}
      onView={handleViewDetails}
      onStatusChange={handleStatusChange}
      onDelete={handleDelete}
      onRun={handleRun}
      onViewExecutions={handleViewExecutions}
    />
  );

  return (
    <>
      <header className="relative z-10 flex shrink-0 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <AnimatedPageTitle
            icon={CheckSquare}
            text="Tasks Board"
            iconClassName="text-orange-400"
            styledRange={{ start: 5, className: "text-orange-400" }}
            cursor={{ character: "|" }}
          />
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-white/10 bg-(--oc-panel) p-0.5">
              <button
                type="button"
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  viewMode === "list"
                    ? "bg-orange-500/25 text-orange-200"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
              >
                <List className="h-4 w-4" />
                List
              </button>
              <button
                type="button"
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  viewMode === "kanban"
                    ? "bg-orange-500/25 text-orange-200"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setViewMode("kanban")}
                aria-pressed={viewMode === "kanban"}
              >
                <KanbanSquare className="h-4 w-4" />
                Kanban
              </button>
            </div>
            <button
              type="button"
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                includeApiTasks
                  ? "border-blue-500/30 bg-blue-500/20 text-blue-200"
                  : "border-white/10 bg-(--oc-panel) text-slate-400 hover:text-slate-200"
              }`}
              onClick={() => setIncludeApiTasks(!includeApiTasks)}
              aria-pressed={includeApiTasks}
              title="Show tasks created via API"
            >
              <Globe className="h-4 w-4" />
              API
            </button>
            <Button
              className="bg-orange-500/90 text-white hover:bg-orange-500"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col gap-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-(--oc-panel) py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-(--oc-panel-strong)">
              <CheckCircle2 className="h-6 w-6 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-white">No tasks yet</p>
              <p className="text-sm text-slate-400">
                Create your first task to get started
              </p>
            </div>
            <Button
              className="bg-orange-500/90 text-white hover:bg-orange-500"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Task
            </Button>
          </div>
        ) : viewMode === "list" ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {activeTasks.map(renderTaskCard)}
            </div>
            {canceledTasks.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer list-none text-sm text-slate-400 hover:text-slate-300">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Canceled tasks ({canceledTasks.length})
                  </span>
                </summary>
                <div className="mt-2 flex flex-col gap-2 opacity-60">
                  {canceledTasks.map(renderTaskCard)}
                </div>
              </details>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {COLUMNS.map((col) => {
              const Icon = col.icon;
              const columnTasks = tasksByColumn[col.id];
              return (
                <div
                  key={col.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-(--oc-panel-strong) p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`h-4 w-4 ${
                          col.id === "done"
                            ? "text-emerald-400"
                            : col.id === "doing"
                              ? "text-blue-400"
                              : "text-slate-400"
                        }`}
                      />
                      <span className="text-sm font-medium text-white">
                        {col.label}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {columnTasks.length}
                    </span>
                  </div>
                  <div className="flex min-h-[120px] flex-col gap-2">
                    {columnTasks.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-white/10 py-8">
                        <span className="text-xs text-slate-500">No tasks</span>
                      </div>
                    ) : (
                      columnTasks.map(renderTaskCard)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TaskModal
        open={modalOpen}
        mode="create"
        agentPreferences={agentPrefsQuery.data}
        isSaving={createMutation.isPending}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />

      <TaskModal
        open={!!editingTask}
        mode="edit"
        initialData={
          editingTask
            ? {
                body: editingTask.body,
                agentId: editingTask.agentId as AgentId | null,
                mountPoint: editingTask.mountPoint,
                attachments: editingTask.attachments,
              }
            : undefined
        }
        agentPreferences={agentPrefsQuery.data}
        isSaving={updateMutation.isPending}
        onClose={() => setEditingTask(null)}
        onSubmit={handleEdit}
      />

      {executionsTask && executionsTaskId && (
        <ExecutionLogsModal
          open={!!executionsTaskId}
          taskId={executionsTaskId}
          taskBody={executionsTask.body}
          onClose={() => setExecutionsTaskId(null)}
        />
      )}

      {detailsTaskId && (
        <TaskDetailsModal
          open={!!detailsTaskId}
          taskId={detailsTaskId}
          onClose={() => setDetailsTaskId(null)}
          onEdit={() => {
            setDetailsTaskId(null);
            openEditModal(detailsTaskId);
          }}
          onRun={() => {
            handleRun(detailsTaskId);
          }}
        />
      )}
    </>
  );
}
