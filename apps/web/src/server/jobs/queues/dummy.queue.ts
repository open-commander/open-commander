import { Queue } from "bullmq";
import { redisConnection } from "@/server/jobs/redis";
// import Sentry from "@/sentry.node.config"

export const dummyQueueName = "dummyQueue";

export const dummyQueue = new Queue(dummyQueueName, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

dummyQueue.on("error", (err) => {
  console.error(err);
  // Sentry.captureException(err)
});
