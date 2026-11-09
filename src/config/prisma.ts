import {Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client.js";
import  {PrismaPg} from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const connectionString = process.env.DATABASE_URL 


const pool = new Pool({
  connectionString: connectionString,
});

const adapter =  new PrismaPg(pool);

 export const prisma = new PrismaClient({
  adapter,
});

