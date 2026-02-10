import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import type { AgentProvider, TaskExecutionStatus } from "@/generated/prisma";
import { db } from "@/server/db";

type DbAny = typeof db & {
  apiSecret: {
    findFirst: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
  apiCallLog: {
    create: (args: unknown) => Promise<unknown>;
  };
};

/**
 * Hash a secret key using SHA-256.
 */
function hashSecretKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Extract API key from Authorization header.
 */
function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * Validate API key and return associated client and user.
 */
async function validateApiKey(apiKey: string) {
  const keyHash = hashSecretKey(apiKey);
  const dbAny = db as DbAny;

  const secret = (await dbAny.apiSecret.findFirst({
    where: { keyHash },
    include: {
      client: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  })) as {
    id: string;
    client: {
      id: string;
      user: { id: string; name: string; email: string };
    };
  } | null;

  if (!secret) return null;

  await dbAny.apiSecret.update({
    where: { id: secret.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    secret,
    client: secret.client,
    user: secret.client.user,
  };
}

/**
 * Log API call.
 */
async function logApiCall(
  clientId: string,
  request: NextRequest,
  statusCode: number,
  startTime: number,
  taskId: string,
  errorMessage?: string,
) {
  const responseMs = Date.now() - startTime;
  const dbAny = db as DbAny;

  await dbAny.apiCallLog.create({
    data: {
      clientId,
      endpoint: `/api/tasks/${taskId}`,
      method: request.method,
      statusCode,
      ipAddress:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
      responseMs,
      errorMessage,
    },
  });
}

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/tasks/[id] - Get a single task by ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id: taskId } = await params;
  let clientId: string | null = null;

  console.log(`[api/tasks/${taskId}] GET request received`);

  try {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      console.log(`[api/tasks/${taskId}] Missing authorization header`);
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 },
      );
    }

    const auth = await validateApiKey(apiKey);
    if (!auth) {
      console.log(`[api/tasks/${taskId}] Invalid API key`);
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    clientId = auth.client.id;
    console.log(
      `[api/tasks/${taskId}] Authenticated as user: ${auth.user.email}`,
    );

    // Fetch task with executions
    type TaskExecution = {
      id: string;
      status: TaskExecutionStatus;
      agentId: AgentProvider;
      jobId: string | null;
      containerName: string | null;
      completed: boolean;
      needsInput: boolean;
      inputRequest: string | null;
      result: string | null;
      errorMessage: string | null;
      logs: string | null;
      startedAt: Date | null;
      finishedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    };

    type TaskWithExecutions = {
      id: string;
      body: string;
      status: string;
      agentId: AgentProvider | null;
      mountPoint: string | null;
      attachments: unknown;
      createdAt: Date;
      updatedAt: Date;
      executions: TaskExecution[];
    };

    const task = (await db.task.findFirst({
      where: {
        id: taskId,
        userId: auth.user.id,
      },
      include: {
        executions: {
          orderBy: { createdAt: "desc" },
        },
      },
    })) as TaskWithExecutions | null;

    if (!task) {
      console.log(`[api/tasks/${taskId}] Task not found`);
      await logApiCall(clientId, request, 404, startTime, taskId, "Not found");
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    console.log(
      `[api/tasks/${taskId}] Task found, executions: ${task.executions.length}`,
    );

    await logApiCall(clientId, request, 200, startTime, taskId);

    return NextResponse.json({
      task: {
        ...task,
        latestExecution: task.executions[0] || null,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";

    console.error(`[api/tasks/${taskId}] Error:`, errorMessage);

    if (clientId) {
      await logApiCall(clientId, request, 500, startTime, taskId, errorMessage);
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
