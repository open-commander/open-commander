"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ShortcutItem } from "./shortcuts-types";

type ShortcutsModalProps = {
  open: boolean;
  onClose: () => void;
  shortcuts: ShortcutItem[];
  focusSearchOnOpen?: boolean;
};

/**
 * Modal that lists shortcuts with a search input to filter by description.
 * Reusable: receives shortcuts and open/close state from parent/context.
 */
export function ShortcutsModal({
  open,
  onClose,
  shortcuts,
  focusSearchOnOpen = false,
}: ShortcutsModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return shortcuts;
    const q = query.toLowerCase().trim();
    return shortcuts.filter(
      (s) =>
        s.description.toLowerCase().includes(q) ||
        s.keys.some((k) => k.toLowerCase().includes(q)),
    );
  }, [shortcuts, query]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, ShortcutItem[]>();
    for (const s of filtered) {
      const cat = s.category ?? "General";
      const list = byCategory.get(cat) ?? [];
      list.push(s);
      byCategory.set(cat, list);
    }
    return Array.from(byCategory.entries());
  }, [filtered]);

  const focusSearch = useCallback(() => {
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    if (open && focusSearchOnOpen) focusSearch();
  }, [open, focusSearchOnOpen, focusSearch]);

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
      className="fixed inset-0 z-100 flex items-start justify-center p-4 pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Shortcuts"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-(--oc-panel-strong) shadow-xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Search
            className="h-4 w-4 shrink-0 text-slate-400"
            strokeWidth={2}
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shortcuts…"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            aria-label="Search shortcuts"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {grouped.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No shortcuts match your search.
            </p>
          ) : (
            grouped.map(([category, items]) => (
              <div key={category} className="mb-4 last:mb-0">
                <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                  {category}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {items.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm text-slate-200"
                    >
                      <span>{s.description}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {s.keys.map((k) => (
                          <kbd
                            key={k}
                            className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-xs tabular-nums text-slate-300"
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
