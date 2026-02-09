"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";

export type CreateSessionModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, workspaceSuffix: string) => void;
};

/**
 * Modal to create a new session: asks only for the session name.
 * Create button or Enter submits; Escape or Cancel closes. Input is focused when opened.
 */
export function CreateSessionModal({
  open,
  onClose,
  onSubmit,
}: CreateSessionModalProps) {
  const [name, setName] = useState("");
  const [workspaceSuffix, setWorkspaceSuffix] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
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
  const workspaceTarget = workspaceSuffix
    ? `/workspace/${workspaceSuffix}`
    : "/workspace";

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = name.trim() || "New session";
      onSubmit(trimmed, workspaceEnabled ? workspaceSuffix : "");
      setName("");
      setWorkspaceSuffix("");
      onClose();
    },
    [name, onSubmit, onClose, workspaceEnabled, workspaceSuffix],
  );

  useEffect(() => {
    if (open) {
      setName("");
      setWorkspaceSuffix("");
      const t = requestAnimationFrame(() => {
        nameInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (workspaceOptions.length === 0) {
      setWorkspaceSuffix("");
      return;
    }
    if (!workspaceOptions.some((option) => option.value === workspaceSuffix)) {
      setWorkspaceSuffix(workspaceOptions[0]?.value ?? "");
    }
  }, [open, workspaceOptions, workspaceSuffix]);

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
      aria-label="Create session"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <form
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-(--oc-panel-strong) p-6 shadow-xl"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-2">
          <label
            htmlFor="create-session-name"
            className="text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            Name
          </label>
          <input
            ref={nameInputRef}
            id="create-session-name"
            name="create-session-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New session"
            className="w-full rounded-xl border border-white/10 bg-(--oc-panel) px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
            aria-label="Session name"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
          />
        </div>
        <div className="mt-4 grid gap-2">
          <label
            htmlFor="create-session-workspace"
            className="text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            Workspace
          </label>
          <div className="relative">
            <select
              id="create-session-workspace"
              name="create-session-workspace"
              value={workspaceSuffix}
              onChange={(e) => setWorkspaceSuffix(e.target.value)}
              disabled={!workspaceEnabled || workspaceQuery.isLoading}
              className="w-full appearance-none rounded-xl border border-white/10 bg-(--oc-panel) px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-slate-400"
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
          <p className="text-xs text-slate-400">
            {workspaceEnabled
              ? `Mounts ${workspaceTarget} inside the container.`
              : "AGENT_WORKSPACE is not configured for this environment."}
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="text-slate-300 hover:bg-white/10"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-emerald-500/90 text-white hover:bg-emerald-500"
          >
            Create
          </Button>
        </div>
      </form>
    </div>
  );
}
