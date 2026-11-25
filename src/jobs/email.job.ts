import { emailQueue } from "../queues/email.queue.ts";


export const addWelcomeEmailJob = async (email:string,name:string) => {
return await emailQueue.add("welcome-email",{
    email,
    name
},
{
attempts : 3,
backoff: {
    type:"exponential",
    delay:2000
}
})
}
