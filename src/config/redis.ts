import { createClient } from "redis";

const client = createClient({
    url: process.env.REDIS_URL,
    disableOfflineQueue: true,
    socket: {
        connectTimeout: 5000,
        socketTimeout: 3000
    }
});

client.on("error", err => console.log("Redis Client Error", err));

await client.connect();

export const Redis = client;

