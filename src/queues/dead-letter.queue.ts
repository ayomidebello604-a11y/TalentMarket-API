import { Queue } from "bullmq";
import connection from "../config/bullmq.ts";

export const deadLetterQueue = new Queue("dead-letter-queue", {
    connection
})