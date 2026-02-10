console.log(">> Starting worker: dummy");

import dummyWorker from "./workers/dummy.worker";

console.log(">> Starting worker: email");

import emailWorker from "./workers/email.worker";

console.log(">> Starting worker: command");

import commandWorker from "./workers/command.worker";

console.log(">> Starting worker: commander");

import { setupCommanderRepeatable } from "./queues/commander.queue";
import commanderWorker from "./workers/commander.worker";

// Setup repeatable jobs
setupCommanderRepeatable().catch((err) => {
  console.error("Failed to setup commander repeatable:", err);
});

const gracefulShutdown = async (signal: unknown) => {
  console.log(`!!! Received ${signal}, closing server...`);
  await Promise.all([
    emailWorker.close(),
    dummyWorker.close(),
    commandWorker.close(),
    commanderWorker.close(),
  ]);
  // Other asynchronous closings
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("uncaughtException", (err) => {
  // Handle the error safely
  console.error(err, "Uncaught exception");
  // Sentry.captureException(err)
});

process.on("unhandledRejection", (reason, promise) => {
  // Handle the error safely
  console.error({ promise, reason }, "Unhandled Rejection at: Promise");
  // Sentry.captureException({ promise, reason })
});
