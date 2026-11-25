import { Worker } from "bullmq";
import connection from "../config/bullmq.ts";

export const welcomeEmailWorker = new Worker(
  "email-queue",
  async (job) => {

    console.log("Worker received job:", job.id, job.name);
    if (job.name === "welcome-email") {

      if (job.attemptsMade < 2) {
        throw new Error("Temporary email service failure");
      }

      const { name, email } = job.data;

      console.log("Sending welcome email...");
      console.log("Recipient:", email);
      console.log("Name:", name);
      console.log("Welcome email processed successfully!");
      return;
    }

    throw new Error(`Unknown job name: ${job.name}`);
  },
  { connection }
);

welcomeEmailWorker.on("failed", (job, error) => {
  console.log(`Attempt failed for job ${job?.id}:`, error.message);
});

welcomeEmailWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully!`);
});

process.on("SIGINT", async () => {
  await welcomeEmailWorker.close();
  console.log("Worker closed gracefully");
  process.exit(0);
});

