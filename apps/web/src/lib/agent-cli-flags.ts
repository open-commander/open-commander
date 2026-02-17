import type { AgentId } from "./agent-preferences";

/**
 * Extra CLI flags appended when auto-launching each agent.
 * Add entries here as we onboard more agents.
 */
const CLI_FLAGS: Partial<Record<AgentId, string[]>> = {
  claude: ["--dangerously-skip-permissions"],
};

/** Returns the full shell command for a given agent CLI. */
export function buildCliCommand(agentId: AgentId): string {
  const flags = CLI_FLAGS[agentId];
  return flags ? `${agentId} ${flags.join(" ")}` : agentId;
}
