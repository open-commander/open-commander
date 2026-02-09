import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { env } from "@/env";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";

const EGRESS_FILE_MAP = {
  domains: "allowed-domains.txt",
  ips: "allowed-ips.txt",
} as const;

const egressContentSchema = z.object({
  content: z.string(),
});

/**
 * Returns the absolute path for an egress allowlist file.
 */
const getEgressFilePath = (key: keyof typeof EGRESS_FILE_MAP) =>
  path.resolve(
    env.COMMANDER_BASE_PATH,
    "docker",
    "egress",
    EGRESS_FILE_MAP[key],
  );

/**
 * Reads the allowlist file content, returning an empty string if missing.
 */
const readEgressFile = async (key: keyof typeof EGRESS_FILE_MAP) => {
  const filePath = getEgressFilePath(key);
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
};

/**
 * Writes allowlist content to the target file.
 */
const writeEgressFile = async (
  key: keyof typeof EGRESS_FILE_MAP,
  content: string,
) => {
  const filePath = getEgressFilePath(key);
  await fs.writeFile(filePath, content, "utf8");
};

export const egressRouter = createTRPCRouter({
  getAllowedDomains: adminProcedure.query(async () => {
    const content = await readEgressFile("domains");
    return { content };
  }),
  saveAllowedDomains: adminProcedure
    .input(egressContentSchema)
    .mutation(async ({ input }) => {
      await writeEgressFile("domains", input.content);
      return { ok: true };
    }),
  getAllowedIps: adminProcedure.query(async () => {
    const content = await readEgressFile("ips");
    return { content };
  }),
  saveAllowedIps: adminProcedure
    .input(egressContentSchema)
    .mutation(async ({ input }) => {
      await writeEgressFile("ips", input.content);
      return { ok: true };
    }),
});
