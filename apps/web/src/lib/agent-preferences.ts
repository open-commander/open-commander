export const AGENT_IDS = ["opencode", "claude", "codex", "cursor"] as const;

export type AgentId = (typeof AGENT_IDS)[number];

export const AGENT_LABELS: Record<AgentId, string> = {
  opencode: "OpenCode",
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
};

export const DEFAULT_AGENT_ORDER = [...AGENT_IDS] as AgentId[];

export const normalizeAgentOrder = (order: readonly AgentId[]) => {
  const unique = Array.from(new Set(order)).filter((id) =>
    AGENT_IDS.includes(id),
  );
  const missing = AGENT_IDS.filter((id) => !unique.includes(id));
  return [...unique, ...missing] as AgentId[];
};
