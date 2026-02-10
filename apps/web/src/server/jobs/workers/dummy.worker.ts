import { Worker } from "bullmq";
import { dummyQueueName } from "@/server/jobs/queues/dummy.queue";
import { redisConnection } from "@/server/jobs/redis";

// import Sentry from "@/sentry.node.config"

const dummyWorker = new Worker(
  dummyQueueName,
  async (job) => {
    await job.updateProgress(100);
  },
  {
    connection: redisConnection,
    concurrency: 5,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
);

dummyWorker.on("error", (err) => {
  console.error(err);
  // Sentry.captureException(err)
});

dummyWorker.on("failed", (_job, error) => {
  console.error(error);
  // Sentry.captureException(error)
});

export default dummyWorker;
