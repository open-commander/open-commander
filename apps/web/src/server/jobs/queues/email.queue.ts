import { Queue } from "bullmq";
import { redisConnection } from "@/server/jobs/redis";
// import Sentry from "@/sentry.node.config"

export const emailQueueName = "emailQueue";

export interface EmailQueueParams {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export const emailQueue = new Queue<EmailQueueParams>(emailQueueName, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

emailQueue.on("error", (err) => {
  console.error(err);
  // Sentry.captureException(err)
});
