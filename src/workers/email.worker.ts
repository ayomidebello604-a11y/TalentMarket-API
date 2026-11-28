import { Worker } from "bullmq";
import { sendAdminNotification, sendWelcomeEmail } from "../services/email.service.ts";
import { deadLetterQueue } from "../queues/dead-letter.queue.ts";
import connection from "../config/bullmq.ts";

export const welcomeEmailWorker = new Worker(
  "email-queue",
  async (job) => {
    switch (job.name) {
      case "welcome-email": {
        const { name, email } = job.data;
        await sendWelcomeEmail(email, name);
        console.log(`Welcome email sent to ${email}`);
        break;
      }
      case "password-reset": {
        const { email,resetLink } = job.data;
        console.log(`Password reset email would be sent to ${email}`);
        console.log(`This is the Link to be sent ${resetLink}`)
        break;
      }
      case "adminNotification" : {
        const {name,email,accountType} = job.data;
        await sendAdminNotification(email,name,accountType);
        console.log(`Admin Notification sent`)
        break;
      }
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  },
  { connection }
);


welcomeEmailWorker.on("failed", async (job, err) => {
  if (!job) {
    console.error("A job failed, but no job object was provided:", err.message);
    return;
  } 
 const maxAttempts = job.opts.attempts ?? 1

 if (job.attemptsMade < maxAttempts) {
    console.warn(
      `Job ${job.id} (${job.name}) failed on attempt ${job.attemptsMade}/${maxAttempts}; will retry.`
    );
    return;
  }
await deadLetterQueue.add(
  "failed-job",
  {
    originalJobId: job.id,
    originalJobName: job.name,
    originalJobData: job.data,
    errorMessage: err.message,
    attempts: job.attemptsMade,
    failedAt: new Date().toISOString(),
  },
  {
    jobId: `dlq-${job.id}`,
  }
);

  console.error(
    `Job ${job.id} (${job.name}) exhausted all ${maxAttempts} attempts and was moved to dead-letter-queue.`
  );


})

welcomeEmailWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully!`);
});

process.on("SIGINT", async () => {
  await welcomeEmailWorker.close();
  console.log("Worker closed gracefully");
  process.exit(0);
});

