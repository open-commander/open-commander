import { PrismaPg } from "@prisma/adapter-pg";
import { IS_DEV } from "@/config/constants";
import { env } from "@/env";
import { PrismaClient } from "@/generated/prisma";
import { userExtension } from "./extensions/user"; // Import the extension

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const LOG_SQL = false;

function getExtendedClient() {
  return new PrismaClient({
    log: LOG_SQL && IS_DEV ? ["query", "error", "warn"] : ["error"],
    adapter,
  }).$extends(userExtension);
}

type ExtendedPrismaClient = ReturnType<typeof getExtendedClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined; // Use the extended type here
};

if (globalForPrisma.prisma && !("agent" in globalForPrisma.prisma)) {
  globalForPrisma.prisma = undefined;
}

const prisma = globalForPrisma.prisma ?? getExtendedClient(); // Use the function to get the client

if (IS_DEV) globalForPrisma.prisma = prisma;

export const db = prisma;

export * from "@/generated/prisma";
