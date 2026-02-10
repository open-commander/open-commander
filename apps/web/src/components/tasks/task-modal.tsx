"use client";

import { ChevronDown, Loader2, Paperclip, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AGENT_IDS, AGENT_LABELS, type AgentId } from "@/lib/agent-preferences";
import type { AgentPreferencesMap } from "@/server/api/routers/settings";
import type { TaskAttachment } from "@/server/api/routers/tasks";
import { api } from "@/trpc/react";

export type TaskFormData = {
  body: string;
  agentId: AgentId | null;
  mountPoint: string;
  attachments: TaskAttachment[];
};

export type TaskModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialData?: Partial<TaskFormData>;
  agentPreferences?: AgentPreferencesMap;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
};

/**
 * Modal for creating or editing a task.
 */
export function TaskModal({
  open,
  mode,
  initialData,
  agentPreferences,
  isSaving,
  onClose,
  onSubmit,
}: TaskModalProps) {
  const [body, setBody] = useState("");
  const [agentId, setAgentId] = useState<AgentId | null>(null);
  const [mountPoint, setMountPoint] = useState("");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Workspace options query
  const workspaceQuery = api.terminal.workspaceOptions.useQuery(undefined, {
    enabled: open,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const workspaceEnabled = workspaceQuery.data?.enabled ?? false;
  const workspaceOptions = workspaceQuery.isLoading
    ? [{ label: "Loading workspace...", value: "" }]
    : workspaceQuery.data?.options?.length
      ? workspaceQuery.data.options
      : [{ label: "Workspace root", value: "" }];
  const workspaceTarget = mountPoint
    ? `/workspace/${mountPoint}`
    : "/workspace";

  // Get enabled agents sorted by user preference order
  const enabledAgents = agentPreferences
    ? AGENT_IDS.filter((id) => agentPreferences[id]?.active).sort(
        (a, b) =>
          (agentPreferences[a]?.order ?? 0) - (agentPreferences[b]?.order ?? 0),
      )
    : AGENT_IDS;

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!body.trim()) return;
      onSubmit({
        body: body.trim(),
        agentId,
        mountPoint: mountPoint.trim(),
        attachments,
      });
    },
    [body, agentId, mountPoint, attachments, onSubmit],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newAttachments: TaskAttachment[] = Array.from(files).map(
        (file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          url: URL.createObjectURL(file),
          type: file.type,
          size: file.size,
        }),
      );

      setAttachments((prev) => [...prev, ...newAttachments]);
      e.target.value = "";
    },
    [],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  useEffect(() => {
    if (open) {
      setBody(initialData?.body ?? "");
      setAgentId(initialData?.agentId ?? null);
      setMountPoint(initialData?.mountPoint ?? "");
      setAttachments(initialData?.attachments ?? []);
      const t = requestAnimationFrame(() => {
        bodyInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(t);
    }
  }, [open, initialData]);

  // Sync mountPoint with available options
  useEffect(() => {
    if (!open) return;
    if (workspaceOptions.length === 0) {
      setMountPoint("");
      return;
    }
    // If current mountPoint is not in options, reset to first option (or keep if editing)
    if (!workspaceOptions.some((option) => option.value === mountPoint)) {
      // Only reset if not editing (initialData would have the mount point)
      if (!initialData?.mountPoint) {
        setMountPoint(workspaceOptions[0]?.value ?? "");
      }
    }
  }, [open, workspaceOptions, mountPoint, initialData?.mountPoint]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "create" ? "Create task" : "Edit task"}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <form
        className="relative z-10 flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-white/10 bg-(--oc-panel-strong) p-6 shadow-xl"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {mode === "create" ? "New Task" : "Edit Task"}
          </h2>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="task-body"
            className="text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            Task
          </label>
          <textarea
            ref={bodyInputRef}
            id="task-body"
            name="task-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe what you want the agent to do..."
            rows={4}
            className="w-full resize-none rounded-xl border border-white/10 bg-(--oc-panel) px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20"
            aria-label="Task description"
            spellCheck={false}
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="task-agent"
            className="text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            Agent
          </label>
          <div className="relative">
            <select
              id="task-agent"
              name="task-agent"
              value={agentId ?? ""}
              onChange={(e) =>
                setAgentId(e.target.value ? (e.target.value as AgentId) : null)
              }
              className="w-full appearance-none rounded-xl border border-white/10 bg-(--oc-panel) px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20"
            >
              <option value="">No agent assigned</option>
              {enabledAgents.map((id) => (
                <option key={id} value={id}>
                  {AGENT_LABELS[id]}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              strokeWidth={2}
              aria-hidden
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="task-mount-point"
            className="text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            Workspace
          </label>
          <div className="relative">
            <select
              id="task-mount-point"
              name="task-mount-point"
              value={mountPoint}
              onChange={(e) => setMountPoint(e.target.value)}
              disabled={!workspaceEnabled || workspaceQuery.isLoading}
              className="w-full appearance-none rounded-xl border border-white/10 bg-(--oc-panel) px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-slate-400"
            >
              {workspaceOptions.map((option) => (
                <option key={option.value || "root"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              strokeWidth={2}
              aria-hidden
            />
          </div>
          <p className="text-xs text-slate-500">
            {workspaceEnabled
              ? `Mounts ${workspaceTarget} inside the container.`
              : "AGENT_WORKSPACE is not configured for this environment."}
          </p>
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="task-attachments"
            className="text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            Attachments
          </label>
          <input
            id="task-attachments"
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-(--oc-panel) px-2 py-1 text-xs text-slate-300"
              >
                <Paperclip className="h-3 w-3" />
                <span className="max-w-[120px] truncate">
                  {attachment.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  className="flex h-4 w-4 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white"
                  aria-label={`Remove ${attachment.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 rounded-lg border border-dashed border-white/20 px-2 py-1 text-xs text-slate-400 transition-colors hover:border-orange-400/50 hover:text-orange-300"
            >
              <Paperclip className="h-3 w-3" />
              Add file
            </button>
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="text-slate-300 hover:bg-white/10"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-orange-500/90 text-white hover:bg-orange-500"
            disabled={!body.trim() || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving...
              </>
            ) : mode === "create" ? (
              "Create"
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
