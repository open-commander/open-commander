"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export type ConfirmRemoveSessionModalProps = {
  open: boolean;
  sessionName: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmRemoveSessionModal({
  open,
  sessionName,
  onClose,
  onConfirm,
}: ConfirmRemoveSessionModalProps) {
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
      aria-labelledby="remove-session-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-(--oc-panel-strong) p-6 shadow-xl">
        <h2
          id="remove-session-title"
          className="text-lg font-semibold text-white"
        >
          Remove session?
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          This will stop and remove{" "}
          <span className="font-semibold text-white">{sessionName}</span>.
        </p>
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
            type="button"
            className="bg-rose-500/90 text-white hover:bg-rose-500"
            onClick={onConfirm}
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
