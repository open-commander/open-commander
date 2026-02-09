import { z } from "zod";
import {
  AGENT_IDS,
  type AgentId,
  DEFAULT_AGENT_ORDER,
} from "@/lib/agent-preferences";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const agentEntrySchema = z.object({
  active: z.boolean(),
  order: z.number(),
});
const agentsInputSchema = z.record(
  z.string(),
  z.object({ active: z.boolean(), order: z.number() }),
);

export type AgentPreferenceEntry = z.infer<typeof agentEntrySchema>;
export type AgentPreferencesMap = Record<AgentId, AgentPreferenceEntry>;

function defaultAgents(): AgentPreferencesMap {
  return DEFAULT_AGENT_ORDER.reduce((acc, id, index) => {
    acc[id] = { active: true, order: index };
    return acc;
  }, {} as AgentPreferencesMap);
}

function normalizeAgents(
  agents: Partial<Record<AgentId, AgentPreferenceEntry>>,
): AgentPreferencesMap {
  const def = defaultAgents();
  return AGENT_IDS.reduce((acc, id) => {
    const existing = agents[id];
    acc[id] = existing
      ? { active: existing.active, order: existing.order }
      : { active: def[id].active, order: def[id].order };
    return acc;
  }, {} as AgentPreferencesMap);
}

export const settingsRouter = createTRPCRouter({
  getAgentPreferences: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const existing = await ctx.db.userPreferences.findUnique({
      where: { userId },
    });
    if (!existing) {
      const created = await ctx.db.userPreferences.create({
        data: { userId, agents: defaultAgents() },
      });
      return created.agents as AgentPreferencesMap;
    }
    return normalizeAgents(
      (existing.agents ?? {}) as Partial<AgentPreferencesMap>,
    );
  }),
  updateAgentPreferences: protectedProcedure
    .input(z.object({ agents: agentsInputSchema }))
    .mutation(async ({ ctx, input }) => {
      const agents = normalizeAgents(
        input.agents as Partial<Record<AgentId, AgentPreferenceEntry>>,
      );
      const userId = ctx.session.user.id;
      const saved = await ctx.db.userPreferences.upsert({
        where: { userId },
        update: { agents },
        create: { userId, agents },
      });
      return saved.agents as AgentPreferencesMap;
    }),
});
