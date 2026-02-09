import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { adminRouter } from "./routers/admin";
import { authRouter } from "./routers/auth";
import { egressRouter } from "./routers/egress";
import { securityRouter } from "./routers/security";
import { settingsRouter } from "./routers/settings";
import { terminalRouter } from "./routers/terminal";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  admin: adminRouter,
  egress: egressRouter,
  security: securityRouter,
  settings: settingsRouter,
  terminal: terminalRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
