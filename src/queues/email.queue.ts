import { Queue } from "bullmq";
import connection from "../config/bullmq.ts";

 export const emailQueue = new Queue("email-queue",{
    connection
});