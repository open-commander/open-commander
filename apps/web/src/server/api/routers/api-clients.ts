import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// Type helper for database until Prisma regenerates with new models
type DbWithApiModels = {
  apiClient: {
    findMany: (args: unknown) => Promise<unknown[]>;
    findFirst: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
  };
  apiSecret: {
    create: (args: unknown) => Promise<unknown>;
    findFirst: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
  };
  apiCallLog: {
    findMany: (args: unknown) => Promise<unknown[]>;
    count: (args: unknown) => Promise<number>;
  };
};

// Result types for API client operations
type ApiClientWithSecrets = {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  secrets: {
    id: string;
    name: string;
    keyPrefix: string;
    lastUsedAt: Date | null;
    createdAt: Date;
  }[];
  _count: { callLogs: number };
};

type ApiSecretWithClient = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  client: { userId: string };
};

type ApiCallLogWithClient = {
  id: string;
  clientId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  ipAddress: string | null;
  userAgent: string | null;
  responseMs: number | null;
  errorMessage: string | null;
  createdAt: Date;
  client: { id: string; name: string };
};

/**
 * Generate a random API secret key with prefix.
 */
function generateSecretKey(): string {
  const randomPart = randomBytes(24).toString("base64url");
  return `oc_sk_${randomPart}`;
}

/**
 * Hash a secret key using SHA-256.
 */
function hashSecretKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Get the prefix of a secret key for display.
 */
function getKeyPrefix(key: string): string {
  return key.slice(0, 12);
}

export const apiClientsRouter = createTRPCRouter({
  /**
   * List all API clients for the current user.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const db = ctx.db as unknown as DbWithApiModels;

    const clients = (await db.apiClient.findMany({
      where: { userId },
      include: {
        secrets: {
          select: {
            id: true,
            name: true,
            keyPrefix: true,
            lastUsedAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: { callLogs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })) as ApiClientWithSecrets[];

    return clients.map((client) => ({
      ...client,
      callLogsCount: client._count.callLogs,
    }));
  }),

  /**
   * Get a single API client by ID.
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const db = ctx.db as unknown as DbWithApiModels;

      const client = (await db.apiClient.findFirst({
        where: { id: input.id, userId },
        include: {
          secrets: {
            select: {
              id: true,
              name: true,
              keyPrefix: true,
              lastUsedAt: true,
              createdAt: true,
            },
          },
        },
      })) as ApiClientWithSecrets | null;

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API client not found",
        });
      }

      return client;
    }),

  /**
   * Create a new API client.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const db = ctx.db as unknown as DbWithApiModels;

      const client = await db.apiClient.create({
        data: {
          name: input.name,
          description: input.description,
          userId,
        },
      });

      return client;
    }),

  /**
   * Update an API client.
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { id, ...data } = input;
      const db = ctx.db as unknown as DbWithApiModels;

      // Verify ownership
      const existing = await db.apiClient.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API client not found",
        });
      }

      const client = await db.apiClient.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined
            ? { description: data.description }
            : {}),
        },
      });

      return client;
    }),

  /**
   * Delete an API client.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const db = ctx.db as unknown as DbWithApiModels;

      // Verify ownership
      const existing = await db.apiClient.findFirst({
        where: { id: input.id, userId },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API client not found",
        });
      }

      await db.apiClient.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Create a new API secret for a client.
   * Returns the full secret key only once.
   */
  createSecret: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        name: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const db = ctx.db as unknown as DbWithApiModels;

      // Verify client ownership
      const client = await db.apiClient.findFirst({
        where: { id: input.clientId, userId },
      });

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API client not found",
        });
      }

      // Generate secret key
      const secretKey = generateSecretKey();
      const keyHash = hashSecretKey(secretKey);
      const keyPrefix = getKeyPrefix(secretKey);

      const secret = (await db.apiSecret.create({
        data: {
          name: input.name,
          keyHash,
          keyPrefix,
          clientId: input.clientId,
        },
      })) as { id: string; name: string; keyPrefix: string; createdAt: Date };

      // Return the full secret key only this once
      return {
        id: secret.id,
        name: secret.name,
        secretKey, // Only returned on creation!
        keyPrefix: secret.keyPrefix,
        createdAt: secret.createdAt,
      };
    }),

  /**
   * Delete an API secret.
   */
  deleteSecret: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const db = ctx.db as unknown as DbWithApiModels;

      // Find secret with client to verify ownership
      const secret = (await db.apiSecret.findFirst({
        where: { id: input.id },
        include: { client: true },
      })) as ApiSecretWithClient | null;

      if (!secret || secret.client.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API secret not found",
        });
      }

      await db.apiSecret.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Get API call logs for the current user.
   */
  getCallLogs: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const db = ctx.db as unknown as DbWithApiModels;

      // Build where clause
      const where = input.clientId
        ? { clientId: input.clientId, client: { userId } }
        : { client: { userId } };

      const [logs, total] = await Promise.all([
        db.apiCallLog.findMany({
          where,
          include: {
            client: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }) as Promise<ApiCallLogWithClient[]>,
        db.apiCallLog.count({ where }),
      ]);

      return { logs, total };
    }),
});
