import { Worker } from "bullmq";
import { sendAdminNotification, sendWelcomeEmail } from "../services/email.service.ts";
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

