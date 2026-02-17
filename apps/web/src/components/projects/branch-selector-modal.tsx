"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";

export type BranchSelectorModalProps = {
  open: boolean;
  workspaceSuffix: string;
  title: string;
  defaultName: string;
  onClose: () => void;
  onConfirm: (name: string, gitBranch: string) => void;
};

/**
 * Modal for creating a session with a name and optional git branch selector.
 * If the workspace is not a git repo, auto-confirms with just the name.
 */
export function BranchSelectorModal({
  open,
  workspaceSuffix,
  title,
  defaultName,
  onClose,
  onConfirm,
}: BranchSelectorModalProps) {
  const [name, setName] = useState("");
  const [gitBranch, setGitBranch] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const branchesQuery = api.terminal.listBranches.useQuery(
    { workspaceSuffix },
    {
      enabled: open,
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
  );
  const isGitRepo = branchesQuery.data?.isGitRepo ?? false;
  const branches = branchesQuery.data?.branches ?? [];
  const currentBranch = branchesQuery.data?.current ?? null;

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      onConfirm(name.trim() || defaultName, gitBranch);
      setName("");
      setGitBranch("");
      onClose();
    },
    [name, defaultName, gitBranch, onConfirm, onClose],
  );

  useEffect(() => {
    if (!open || !defaultName) return;
    setName(defaultName);
  }, [open, defaultName]);

  useEffect(() => {
    if (open) {
      setGitBranch("");
      const t = requestAnimationFrame(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      });
      return () => cancelAnimationFrame(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!isGitRepo) {
      setGitBranch("");
      return;
    }
    if (currentBranch && branches.includes(currentBranch)) {
      setGitBranch(currentBranch);
    } else if (branches.length > 0) {
      setGitBranch(branches[0]);
    } else {
      setGitBranch("");
    }
  }, [open, isGitRepo, branches, currentBranch]);

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
      aria-label={title}
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
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </p>
        <div className="mt-4 grid gap-2">
          <label
            htmlFor="branch-modal-name"
            className="text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            Name
          </label>
          <input
            ref={nameInputRef}
            id="branch-modal-name"
            name="branch-modal-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Session name"
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
        {isGitRepo && branches.length > 0 && (
          <div className="mt-4 grid gap-2">
            <label
              htmlFor="branch-selector"
              className="text-xs font-medium uppercase tracking-wider text-slate-400"
            >
              Branch
            </label>
            <div className="relative">
              <select
                id="branch-selector"
                name="branch-selector"
                value={gitBranch}
                onChange={(e) => setGitBranch(e.target.value)}
                disabled={branchesQuery.isLoading}
                className="w-full appearance-none rounded-xl border border-white/10 bg-(--oc-panel) px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-slate-400"
              >
                {branches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                    {branch === currentBranch ? " (current)" : ""}
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
        )}
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
