import { z } from "zod";
import { env } from "@/env";
import { dockerService } from "@/lib/docker/docker.service";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

const logFilterSchema = z.object({
  domain: z.string().trim().optional(),
  status: z.enum(["all", "approved", "denied"]).default("all"),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(10).max(200).default(40),
});

type Decision = "approved" | "denied";

type ParsedLog = {
  timestamp: string;
  epochMs: number;
  elapsedMs: number;
  clientIp: string;
  action: string;
  statusCode: number | null;
  bytes: number;
  method: string;
  url: string;
  domain: string;
  decision: Decision;
  containerName: string | null;
  sessionId: string | null;
  sessionName: string | null;
  sessionUrl: string | null;
};

const ACCESS_LINE_PREFIX = /^\d+\.\d+\s+\d+\s+\d+\.\d+\.\d+\.\d+/;

const parseAccessLine = (line: string) => {
  if (!ACCESS_LINE_PREFIX.test(line)) return null;
  const parts = line.trim().split(/\s+/);
  if (parts.length < 7) return null;

  const epochSeconds = Number.parseFloat(parts[0]);
  if (!Number.isFinite(epochSeconds)) return null;
  const elapsedMs = Number.parseInt(parts[1] ?? "0", 10);
  const clientIp = parts[2] ?? "";
  const actionStatus = parts[3] ?? "";
  const bytes = Number.parseInt(parts[4] ?? "0", 10);
  const method = parts[5] ?? "";
  const url = parts[6] ?? "";

  const [action, statusRaw] = actionStatus.split("/");
  const statusCode = statusRaw ? Number.parseInt(statusRaw, 10) : null;

  let domain = "";
  if (url.includes("://")) {
    try {
      domain = new URL(url).hostname;
    } catch {
      domain = "";
    }
  } else {
    const host = url.split("/")[0] ?? "";
    domain = host.split(":")[0] ?? "";
  }

  const decision: Decision =
    action.includes("DENIED") || (statusCode !== null && statusCode >= 400)
      ? "denied"
      : "approved";

  const epochMs = Math.round(epochSeconds * 1000);
  const timestamp = new Date(epochMs).toISOString();

  return {
    timestamp,
    epochMs,
    elapsedMs,
    clientIp,
    action,
    statusCode,
    bytes: Number.isFinite(bytes) ? bytes : 0,
    method,
    url,
    domain,
    decision,
  };
};

const buildDomainMatcher = (raw: string) => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.includes("*")) {
    const escaped = trimmed
      .split("*")
      .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    return new RegExp(`^${escaped}$`);
  }
  return trimmed;
};

export const securityRouter = createTRPCRouter({
  egressLogs: publicProcedure
    .input(logFilterSchema)
    .query(async ({ ctx, input }) => {
      const rawLogs = await dockerService.logs(
        env.EGRESS_PROXY_CONTAINER_NAME,
        { tail: 2000 },
      );
      const lines = rawLogs.split("\n").filter(Boolean);
      const parsed = lines
        .map(parseAccessLine)
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

      const containers = await dockerService.getNetworkContainers(
        env.TTYD_INTERNAL_NETWORK,
      );
      const ipToContainer = new Map<string, string>();
      Object.values(containers).forEach((container) => {
        if (!container || typeof container !== "object") return;
        const name = (container as { Name?: string }).Name;
        const ipWithMask = (container as { IPv4Address?: string }).IPv4Address;
        if (!name || !ipWithMask) return;
        const ip = ipWithMask.split("/")[0] ?? "";
        if (ip) {
          ipToContainer.set(ip, name);
        }
      });

      const prefix = `${env.TTYD_CONTAINER_NAME}-`;
      const sessionIds = new Set<string>();

      const hydrated = parsed.map((entry) => {
        const containerName = ipToContainer.get(entry.clientIp) ?? null;
        let sessionId: string | null = null;
        if (containerName?.startsWith(prefix)) {
          sessionId = containerName.slice(prefix.length);
          sessionIds.add(sessionId);
        }
        return { ...entry, containerName, sessionId };
      });

      const sessionList =
        sessionIds.size > 0
          ? await ctx.db.terminalSession.findMany({
              where: { id: { in: Array.from(sessionIds) } },
              select: { id: true, name: true },
            })
          : [];
      const sessionMap = new Map(
        sessionList.map((session) => [session.id, session]),
      );

      const withSessions: ParsedLog[] = hydrated.map((entry) => {
        const session = entry.sessionId
          ? sessionMap.get(entry.sessionId)
          : null;
        return {
          ...entry,
          sessionName: session?.name ?? null,
          sessionUrl: session ? `/sessions?sessionId=${session.id}` : null,
        };
      });

      const matcher = input.domain ? buildDomainMatcher(input.domain) : null;
      let filtered = withSessions.filter((entry) => entry.domain);
      if (matcher) {
        filtered = filtered.filter((entry) => {
          const candidate = entry.domain.toLowerCase();
          return matcher instanceof RegExp
            ? matcher.test(candidate)
            : candidate.includes(matcher);
        });
      }
      if (input.status !== "all") {
        filtered = filtered.filter((entry) => entry.decision === input.status);
      }

      filtered.sort((a, b) => b.epochMs - a.epochMs);

      const total = filtered.length;
      const pageSize = input.pageSize;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const page = Math.min(input.page, totalPages);
      const start = (page - 1) * pageSize;
      const entries = filtered.slice(start, start + pageSize);

      return {
        entries,
        total,
        page,
        pageSize,
        totalPages,
        generatedAt: new Date().toISOString(),
      };
    }),

  egressChartData: publicProcedure.query(async () => {
    const rawLogs = await dockerService.logs(env.EGRESS_PROXY_CONTAINER_NAME, {
      tail: 5000,
    });
    const lines = rawLogs.split("\n").filter(Boolean);
    const parsed = lines
      .map(parseAccessLine)
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const bucketMs = 60 * 60 * 1000;
    const buckets = new Map<number, { approved: number; denied: number }>();
    for (let t = now - oneDayMs; t <= now; t += bucketMs) {
      const key = Math.floor(t / bucketMs) * bucketMs;
      buckets.set(key, { approved: 0, denied: 0 });
    }
    for (const entry of parsed) {
      if (entry.epochMs < now - oneDayMs) continue;
      const key = Math.floor(entry.epochMs / bucketMs) * bucketMs;
      const b = buckets.get(key);
      if (b) {
        if (entry.decision === "approved") b.approved += 1;
        else b.denied += 1;
      }
    }
    const sorted = Array.from(buckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([ts, counts]) => ({
        label: new Date(ts).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        ...counts,
      }));
    return { buckets: sorted };
  }),
});
