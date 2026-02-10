import type { AgentId } from "@/lib/agent-preferences";
import type { TaskAttachment } from "@/server/api/routers/tasks";

export type TaskStatus = "todo" | "doing" | "done" | "canceled";

export type Task = {
  id: string;
  title: string;
  body: string | null;
  status: TaskStatus;
  agentId: AgentId | null;
  attachments: TaskAttachment[];
  createdAt: Date;
  updatedAt: Date;
};
