"use client";

import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Shield,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatedPageTitle } from "@/components/ui/animated-page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePageTitle } from "@/hooks/use-page-title";
import { api } from "@/trpc/react";

type StatusFilter = "all" | "approved" | "denied";

const statusLabels: Record<StatusFilter, string> = {
  all: "All",
  approved: "Approved",
  denied: "Denied",
};

/** Relative time in English (e.g. "5 min ago", "2 h ago"). */
function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffH = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffH / 24);
  if (diffSec < 10) return "now";
  if (diffSec < 60) return `${diffSec} s ago`;
  if (diffMin < 60) return diffMin === 1 ? "1 min ago" : `${diffMin} min ago`;
  if (diffH < 24) return diffH === 1 ? "1 h ago" : `${diffH} h ago`;
  if (diffDay === 1) return "1 day ago";
  if (diffDay < 7) return `${diffDay} days ago`;
  return formatFullDateTime(iso);
}

/** Full date and time for tooltip (e.g. "Feb 3, 2025, 2:32:15 PM"). */
function formatFullDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function SecurityDashboardPage() {
  usePageTitle("Security");

  const router = useRouter();
  const [domainFilter, setDomainFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [draftDomain, setDraftDomain] = useState("");
  const [draftStatus, setDraftStatus] = useState<StatusFilter>("all");
  const [pinnedTooltipIndex, setPinnedTooltipIndex] = useState<number | null>(
    null,
  );
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  const queryInput = useMemo(
    () => ({
      domain: domainFilter.trim() || undefined,
      status: statusFilter,
      page,
      pageSize: 10,
    }),
    [domainFilter, statusFilter, page],
  );

  const logsQuery = api.security.egressLogs.useQuery(queryInput, {
    refetchInterval: 5000,
    placeholderData: (previous) => previous,
  });

  const data = logsQuery.data;
  const entries = data?.entries ?? [];
  const totalPages = data?.totalPages ?? 1;

  // Reset to page 1 when filters change
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [domainFilter, statusFilter]);

  useEffect(() => {
    if (!data) return;
    if (page > data.totalPages) {
      setPage(data.totalPages);
    }
  }, [data, page]);

  const openFilterModal = () => {
    setDraftDomain(domainFilter);
    setDraftStatus(statusFilter);
    setFilterModalOpen(true);
  };

  const applyFilterModal = () => {
    setDomainFilter(draftDomain);
    setStatusFilter(draftStatus);
    setPage(1);
    setFilterModalOpen(false);
  };

  const closeFilterModal = () => setFilterModalOpen(false);

  const hasActiveFilters =
    statusFilter !== "all" || domainFilter.trim().length > 0;

  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <AnimatedPageTitle
          icon={Shield}
          text="Security Overview"
          iconClassName="text-red-400"
          styledRange={{ start: 8, className: "text-red-400" }}
          cursor={{ character: "|" }}
        />
        <Button
          type="button"
          variant="outline"
          className={`flex items-center gap-2 rounded-lg ${
            hasActiveFilters
              ? "border-yellow-400/60 bg-yellow-400/10 text-yellow-400 hover:border-yellow-400/80 hover:bg-yellow-400/20"
              : "border-white/10 bg-white/5 text-slate-200 hover:border-red-400/50 hover:bg-red-400/10"
          }`}
          onClick={openFilterModal}
          aria-label={
            hasActiveFilters ? "Active filters – open filters" : "Open filters"
          }
        >
          <span className="relative inline-flex">
            <Filter
              className="h-4 w-4"
              strokeWidth={hasActiveFilters ? 2.5 : 2}
              fill={hasActiveFilters ? "currentColor" : "none"}
              aria-hidden
            />
            {hasActiveFilters && (
              <span
                className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-yellow-400"
                aria-hidden
              />
            )}
          </span>
          <span className="hidden md:inline">Filter</span>
        </Button>
      </header>

      {filterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="filter-modal-title"
          tabIndex={-1}
          onClick={(e) => e.target === e.currentTarget && closeFilterModal()}
          onKeyDown={(e) => e.key === "Escape" && closeFilterModal()}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-(--oc-panel-strong) p-6 shadow-xl">
            <h2
              id="filter-modal-title"
              className="mb-4 text-lg font-semibold text-white"
            >
              Filters
            </h2>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label
                  htmlFor="modal-domain-filter"
                  className="text-xs uppercase tracking-[0.25em] text-slate-400"
                >
                  Domain (DNS, wildcard)
                </label>
                <input
                  id="modal-domain-filter"
                  value={draftDomain}
                  onChange={(e) => setDraftDomain(e.target.value)}
                  placeholder="e.g. *.google.com or openai.com"
                  className="w-full rounded-xl border border-white/10 bg-(--oc-panel) px-3 py-2 text-sm text-white outline-none transition focus:border-red-400/60 focus:ring-2 focus:ring-red-400/20"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  Status
                </span>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(statusLabels) as StatusFilter[]).map((key) => (
                    <Button
                      key={key}
                      type="button"
                      variant="ghost"
                      className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.2em] ${
                        draftStatus === key
                          ? "border-red-400/70 bg-red-400/20 text-white"
                          : "border-white/10 text-slate-300 hover:border-red-400/50 hover:bg-red-400/10"
                      }`}
                      onClick={() => setDraftStatus(key)}
                    >
                      {statusLabels[key]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="text-slate-300 hover:bg-white/10"
                onClick={closeFilterModal}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-500/90 text-white hover:bg-red-500"
                onClick={applyFilterModal}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      <section className="min-h-0 flex-1">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-(--oc-panel)">
          <TooltipProvider delayDuration={300}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-200">
                <thead className="bg-white/5 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Domain</th>
                    <th className="hidden px-4 py-3 md:table-cell">Method</th>
                    <th className="hidden px-4 py-3 md:table-cell">Status</th>
                    <th className="px-4 py-3">Decision</th>
                    <th className="hidden px-4 py-3 md:table-cell">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-sm text-slate-400"
                      >
                        No logs found with current filters.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry, index) => {
                      const hasSession = Boolean(entry.sessionUrl);
                      return (
                        <tr
                          key={`${entry.epochMs}-${entry.clientIp}-${entry.url}-${entry.action}-${entry.statusCode ?? "x"}-${entry.bytes}-${index}`}
                          className={`border-t border-white/5 ${hasSession ? "cursor-pointer hover:bg-white/10" : "hover:bg-white/5"}`}
                          role={hasSession ? "button" : undefined}
                          tabIndex={hasSession ? 0 : undefined}
                          onClick={() => {
                            if (didLongPressRef.current) {
                              didLongPressRef.current = false;
                              return;
                            }
                            if (hasSession && entry.sessionUrl)
                              router.push(entry.sessionUrl);
                          }}
                          onKeyDown={(e) => {
                            const url = entry.sessionUrl;
                            if (
                              hasSession &&
                              url &&
                              (e.key === "Enter" || e.key === " ")
                            ) {
                              e.preventDefault();
                              router.push(url);
                            }
                          }}
                          aria-label={
                            hasSession
                              ? `Go to session ${entry.sessionName ?? entry.sessionId ?? ""}`
                              : undefined
                          }
                        >
                          <td className="px-4 py-3">
                            <Tooltip
                              open={pinnedTooltipIndex === index}
                              onOpenChange={(open) => {
                                if (!open) {
                                  setPinnedTooltipIndex(null);
                                  didLongPressRef.current = false;
                                }
                              }}
                            >
                              <TooltipTrigger asChild>
                                <span
                                  className="cursor-default"
                                  onTouchStart={() => {
                                    didLongPressRef.current = false;
                                    longPressTimerRef.current = setTimeout(
                                      () => {
                                        didLongPressRef.current = true;
                                        setPinnedTooltipIndex(index);
                                      },
                                      500,
                                    );
                                  }}
                                  onTouchEnd={() => {
                                    if (longPressTimerRef.current) {
                                      clearTimeout(longPressTimerRef.current);
                                      longPressTimerRef.current = null;
                                    }
                                  }}
                                  onTouchCancel={() => {
                                    if (longPressTimerRef.current) {
                                      clearTimeout(longPressTimerRef.current);
                                      longPressTimerRef.current = null;
                                    }
                                  }}
                                >
                                  {formatRelativeTime(entry.timestamp)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {formatFullDateTime(entry.timestamp)}
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="px-4 py-3 font-medium text-white">
                            {entry.domain || "—"}
                          </td>
                          <td className="hidden px-4 py-3 text-slate-300 md:table-cell">
                            {entry.method}
                          </td>
                          <td className="hidden px-4 py-3 text-slate-300 md:table-cell">
                            {entry.action}/{entry.statusCode ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                entry.decision === "approved"
                                  ? "default"
                                  : "danger"
                              }
                              className="inline-flex items-center gap-1.5"
                              aria-label={
                                entry.decision === "approved"
                                  ? "Approved"
                                  : "Denied"
                              }
                            >
                              {entry.decision === "approved" ? (
                                <CheckCircle
                                  className="h-4 w-4 shrink-0"
                                  strokeWidth={2}
                                  aria-hidden
                                />
                              ) : (
                                <XCircle
                                  className="h-4 w-4 shrink-0"
                                  strokeWidth={2}
                                  aria-hidden
                                />
                              )}
                              <span className="hidden md:inline">
                                {entry.decision === "approved"
                                  ? "Approved"
                                  : "Denied"}
                              </span>
                            </Badge>
                          </td>
                          <td className="hidden px-4 py-3 text-slate-400 md:table-cell">
                            {entry.clientIp}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </TooltipProvider>
          <div className="flex flex-wrap items-center justify-center gap-1 border-t border-white/10 px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-lg border border-white/10 text-slate-300 hover:border-red-400/50 hover:bg-red-400/10 disabled:opacity-50"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
            </Button>
            {(() => {
              const windowStart =
                totalPages <= 3
                  ? 1
                  : page <= 1
                    ? 1
                    : page >= totalPages
                      ? Math.max(1, totalPages - 2)
                      : Math.max(1, page - 1);
              const windowEnd =
                totalPages <= 3
                  ? totalPages
                  : page <= 1
                    ? Math.min(3, totalPages)
                    : page >= totalPages
                      ? totalPages
                      : Math.min(totalPages, page + 1);
              const items: Array<number | "ellipsis-start" | "ellipsis-end"> = [
                1,
              ];
              if (windowStart > 2) items.push("ellipsis-start");
              for (let i = windowStart; i <= windowEnd; i++) {
                if (i !== 1 && i !== totalPages) items.push(i);
              }
              if (windowEnd < totalPages - 1 && totalPages > 1)
                items.push("ellipsis-end");
              if (totalPages > 1) items.push(totalPages);
              return items.map((item) =>
                item === "ellipsis-start" || item === "ellipsis-end" ? (
                  <span key={item} className="px-2 text-slate-500" aria-hidden>
                    …
                  </span>
                ) : (
                  <Button
                    key={item}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`min-w-9 rounded-lg border px-3 py-1.5 text-sm tabular-nums ${
                      page === item
                        ? "border-red-400/70 bg-red-400/20 text-white cursor-default"
                        : "border-white/10 text-slate-300 hover:border-red-400/50 hover:bg-red-400/10"
                    }`}
                    onClick={() => page !== item && setPage(item)}
                    disabled={page === item}
                    aria-label={
                      page === item ? "Current page" : `Go to page ${item}`
                    }
                    aria-current={page === item ? "page" : undefined}
                  >
                    {item}
                  </Button>
                ),
              );
            })()}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-lg border border-white/10 text-slate-300 hover:border-red-400/50 hover:bg-red-400/10 disabled:opacity-50"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
