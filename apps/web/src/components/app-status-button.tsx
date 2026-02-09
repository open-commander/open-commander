"use client";

import { Activity } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { api } from "@/trpc/react";
import { StatusPopup } from "./status-popup";

export type AppStatusButtonRef = { close: () => void };

type AppStatusButtonProps = {
  onOpen?: () => void;
  onClose?: () => void;
};

export const AppStatusButton = forwardRef<
  AppStatusButtonRef,
  AppStatusButtonProps
>(function AppStatusButton({ onOpen, onClose }, ref) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose]);

  const openPopup = useCallback(() => {
    setOpen(true);
    onOpen?.();
  }, [onOpen]);

  useImperativeHandle(ref, () => ({ close }), [close]);

  const egressStatus = api.terminal.egressStatus.useQuery(undefined, {
    refetchInterval: open ? 5_000 : false,
  });
  const proxyUp = egressStatus.data?.containers[0]?.running ?? false;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open, close]);

  const toggle = () => (open ? close() : openPopup());

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 outline-none ring-purple-400/50 transition hover:border-purple-500/30 hover:bg-white/10 focus-visible:ring-2"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="System status"
      >
        <Activity
          className="h-4 w-4 shrink-0 text-slate-300"
          strokeWidth={2}
          aria-hidden
        />
        <span
          className="absolute right-1 top-1 h-2 w-2 shrink-0 rounded-full ring-2 ring-(--oc-panel)"
          style={{
            backgroundColor: proxyUp ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)",
          }}
          aria-hidden
        />
      </button>

      <div
        className={`fixed inset-4 z-50 flex flex-col rounded-lg border border-purple-500/25 bg-(--oc-panel-strong) shadow-xl transition-all duration-200 ease-out md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:min-w-100 md:w-100 md:max-h-[85vh] ${
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        role="dialog"
        aria-hidden={!open}
        aria-label="Status: Egress, Ingress, MCP, Plugins"
      >
        <StatusPopup />
      </div>
    </div>
  );
});
