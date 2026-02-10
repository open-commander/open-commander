import { Worker } from "bullmq";
import {
  type EmailQueueParams,
  emailQueueName,
} from "@/server/jobs/queues/email.queue";
import { redisConnection } from "@/server/jobs/redis";

// import Sentry from "@/sentry.node.config"

const emailWorker = new Worker<EmailQueueParams>(
  emailQueueName,
  async (job) => {
    const data = job?.data;
    console.log("Email worker received data:", data);
    // TODO: implement email sending
    await job.updateProgress(100);
  },
  {
    connection: redisConnection,
    concurrency: 5,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
);

emailWorker.on("error", (err) => {
  console.error(err);
  // Sentry.captureException(err)
});

emailWorker.on("failed", (_job, error) => {
  console.error(error);
  // Sentry.captureException(error)
});

export default emailWorker;
