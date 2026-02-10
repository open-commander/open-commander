import { Queue } from "bullmq";
import { redisConnection } from "@/server/jobs/redis";

export const commanderQueueName = "commander";

/**
 * Commander queue - runs periodically to enqueue pending tasks.
 */
export const commanderQueue = new Queue(commanderQueueName, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100,
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
      count: 100,
    },
  },
});

commanderQueue.on("error", (err) => {
  console.error("[commander.queue] Queue error:", err);
});

/**
 * Setup the repeatable job that runs every minute.
 */
export async function setupCommanderRepeatable(): Promise<void> {
  console.log("[commander.queue] Setting up repeatable job (every minute)");

  // Remove any existing repeatable jobs first to avoid duplicates
  const existingJobs = await commanderQueue.getRepeatableJobs();
  for (const job of existingJobs) {
    await commanderQueue.removeRepeatableByKey(job.key);
    console.log(`[commander.queue] Removed existing repeatable: ${job.key}`);
  }

  // Add the repeatable job
  await commanderQueue.add(
    "process-pending-tasks",
    {},
    {
      repeat: {
        every: 60000, // Every 60 seconds
      },
    },
  );

  console.log("[commander.queue] Repeatable job configured successfully");
}
