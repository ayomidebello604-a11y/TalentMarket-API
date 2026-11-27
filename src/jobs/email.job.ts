import { emailQueue } from "../queues/email.queue.ts";
type AccountType = "player" | "scout";

export const addWelcomeEmailJob = async (email:string,name:string) => {
return await emailQueue.add("welcome-email",{
    email,
    name
},
{
priority: 5,
attempts : 3,
backoff: {
    type:"exponential",
    delay:2000
},
removeOnComplete: {age: 3600,count: 1000},
removeOnFail: {age:86400,count:5000}
})
}


export const addPasswordResetJob = async (email:string,resetLink:string) => {
    return await emailQueue.add("password-reset",
        {
       email,
       resetLink
        },
        {
            priority: 1,
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 5000
            },
            removeOnComplete: {age:3600,count:1000},
            removeOnFail: {age:86400,count:5000}
        }
    )
}

export const addAdminNotificationJob = async (email:string,name:string,accountType:AccountType) => {
    return await emailQueue.add("adminNotification",
        {
            email,
            name,
            accountType
        },
        {
            priority: 5,
            attempts : 3,
backoff: {
    type:"exponential",
    delay:2000
},
removeOnComplete: {age: 3600,count: 1000},
removeOnFail: {age:86400,count:5000}
        }
    )
}