import type { AgentId } from "@/lib/agent-preferences";

declare global {
  namespace PrismaJson {
    type UserPreferencesAgents = {
      [key in AgentId]: {
        active: boolean;
        order: number;
      };
    };
  }
}
