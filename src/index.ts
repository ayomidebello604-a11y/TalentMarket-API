import app from "./app.ts";
import { Redis } from "./config/redis.js";


app.listen(3000, async() => {
  console.log("Server is running on port 3000");
 
  console.log(await Redis.ping())
});