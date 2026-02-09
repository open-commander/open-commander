"use client";

import { Box, Server } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";

/**
 * Popup with tabs: MCP, Egress, Ingress, Plugins.
 * Egress: container name + green/red dot (running).
 * Ingress: per session id, two dots (session container + ingress container).
 */
export function StatusPopup() {
  const egress = api.terminal.egressStatus.useQuery();
  const ingress = api.terminal.ingressStatus.useQuery();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden md:flex-initial">
      <Tabs
        defaultValue="egress"
        className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-initial"
      >
        <TabsList className="grid w-full grid-cols-4 shrink-0 gap-3 rounded-b-none rounded-t-lg border-b border-white/10 bg-black/40 p-2.5 group-data-[orientation=horizontal]/tabs:min-h-14 group-data-[orientation=horizontal]/tabs:h-auto md:rounded-b-none md:rounded-t-lg md:border-b-0 md:p-2">
          <TabsTrigger
            value="egress"
            className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-8 py-3 text-xs"
          >
            <Server className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Egress
          </TabsTrigger>
          <TabsTrigger
            value="ingress"
            className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-8 py-3 text-xs"
          >
            <Box className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Ingress
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="egress"
          className="mt-0 flex-1 overflow-auto p-3 md:mt-3 pb-8"
        >
          <ul className="flex flex-col gap-2">
            {egress.isLoading ? (
              <li className="text-sm text-slate-400">Loading…</li>
            ) : egress.data?.containers.length ? (
              egress.data.containers.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center gap-2 text-sm text-slate-200"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: c.running
                        ? "rgb(34, 197, 94)"
                        : "rgb(239, 68, 68)",
                    }}
                    aria-hidden
                  />
                  <span className="truncate font-mono text-xs">{c.name}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-400">No egress container.</li>
            )}
          </ul>
        </TabsContent>

        <TabsContent
          value="ingress"
          className="mt-0 flex-1 overflow-auto p-3 md:mt-3 pb-8"
        >
          <ul className="flex flex-col gap-3">
            {ingress.isLoading ? (
              <li className="text-sm text-slate-400">Loading…</li>
            ) : ingress.data?.sessions.length ? (
              ingress.data.sessions.map((s) => (
                <li key={s.sessionId} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <span className="font-mono text-xs text-slate-400">
                      {s.sessionId.slice(0, 8)}…
                    </span>
                    <span className="truncate text-slate-300">
                      {s.sessionName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pl-1">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: s.sessionContainer.running
                          ? "rgb(34, 197, 94)"
                          : "rgb(239, 68, 68)",
                      }}
                      title={`Session: ${s.sessionContainer.name}`}
                      aria-hidden
                    />
                    <span className="text-xs text-slate-500">session</span>
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: s.ingressContainer.running
                          ? "rgb(34, 197, 94)"
                          : "rgb(239, 68, 68)",
                      }}
                      title={`Ingress: ${s.ingressContainer.name}`}
                      aria-hidden
                    />
                    <span className="text-xs text-slate-500">ingress</span>
                  </div>
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-400">
                No sessions with ingress.
              </li>
            )}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}
