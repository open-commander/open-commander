import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { adminRouter } from "./routers/admin";
import { apiClientsRouter } from "./routers/api-clients";
import { authRouter } from "./routers/auth";
import { egressRouter } from "./routers/egress";
import { projectRouter } from "./routers/projects";
import { securityRouter } from "./routers/security";
import { settingsRouter } from "./routers/settings";
import { tasksRouter } from "./routers/tasks";
import { terminalRouter } from "./routers/terminal";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  admin: adminRouter,
  apiClients: apiClientsRouter,
  egress: egressRouter,
  project: projectRouter,
  security: securityRouter,
  settings: settingsRouter,
  tasks: tasksRouter,
  terminal: terminalRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
