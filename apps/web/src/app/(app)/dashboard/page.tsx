"use client";

import { Activity } from "lucide-react";
import { AppPageShell } from "@/components/app-page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/use-page-title";
import { api } from "@/trpc/react";

function EgressChart({
  data,
}: {
  data: { label: string; approved: number; denied: number }[];
}) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.flatMap((d) => [d.approved, d.denied]));
  const w = 100;
  const h = 40;
  const pad = 2;
  const pointsApproved = data
    .map((d, i) => {
      const x = pad + (i / Math.max(1, data.length - 1)) * (w - 2 * pad);
      const y = h - pad - (d.approved / max) * (h - 2 * pad);
      return `${x},${y}`;
    })
    .join(" ");
  const pointsDenied = data
    .map((d, i) => {
      const x = pad + (i / Math.max(1, data.length - 1)) * (w - 2 * pad);
      const y = h - pad - (d.denied / max) * (h - 2 * pad);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-4 text-xs">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded-full bg-emerald-400" aria-hidden />
          Approved
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded-full bg-red-400" aria-hidden />
          Denied
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-32 w-full max-w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Chart of approved and denied requests in the last 24 hours"
      >
        <title>Approved and denied requests per hour (last 24h)</title>
        <polyline
          points={pointsApproved}
          fill="none"
          stroke="rgb(52, 211, 153)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={pointsDenied}
          fill="none"
          stroke="rgb(248, 113, 113)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex justify-between gap-1 overflow-hidden text-[10px] text-slate-500">
        {data
          .filter(
            (_, i) =>
              i === 0 ||
              i === data.length - 1 ||
              i % Math.max(1, Math.floor(data.length / 5)) === 0,
          )
          .map((d, i) => (
            <span key={`${d.label}-${i}`} className="truncate">
              {d.label}
            </span>
          ))}
      </div>
    </div>
  );
}

export default function Home() {
  usePageTitle();

  const sessionStats = api.terminal.sessionStats.useQuery();
  const chartData = api.security.egressChartData.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const active = sessionStats.data?.activeSessions ?? 0;
  const total = sessionStats.data?.totalSessions ?? 0;

  return (
    <AppPageShell
      title="Command Center"
      titleStyledRange={{ start: 8, className: "text-purple-400" }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex items-center justify-between">
              <Badge variant="muted">
                {sessionStats.isLoading ? "…" : "Sessions"}
              </Badge>
              <Activity className="h-5 w-5 text-emerald-200" />
            </div>
            <CardTitle className="text-sm uppercase tracking-[0.3em] text-slate-400">
              Live sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="gap-2">
            <p className="text-3xl font-semibold text-white">
              {sessionStats.isLoading ? "—" : `${active} / ${total}`}
            </p>
            <p className="text-sm text-slate-400">
              {sessionStats.isLoading
                ? "Loading…"
                : "Currently active / total created."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.3em] text-slate-400">
              Egress – requests processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.isLoading ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Loading…
              </p>
            ) : chartData.data?.buckets.length ? (
              <EgressChart data={chartData.data.buckets} />
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">
                No data in the last 24 h.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
}
