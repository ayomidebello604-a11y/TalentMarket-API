import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { createClient } from "redis";
import { assertSafeTestEnvironment, testEnv } from "./test-env.ts";

const schemaUrl = new URL("../db/schema.sql", import.meta.url);

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

async function applySchemaIfMissing(): Promise<void> {
  const client = new Client({
    host: testEnv.DB_HOST,
    port: Number(testEnv.DB_PORT),
    user: testEnv.DB_USER,
    password: testEnv.DB_PASSWORD,
    database: testEnv.DB_NAME,
  });

  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `Cannot connect to test database "${testEnv.DB_NAME}" at ${testEnv.DB_HOST}:${testEnv.DB_PORT}. ` +
        `Start it with "npm run test:db:up". (${errorMessage(error)})`,
    );
  }

  try {
    const { rows } = await client.query<{ users_table: string | null }>(
      "SELECT to_regclass('public.users') AS users_table",
    );
    // Non-destructive: only creates the schema on an empty test database.
    if (rows[0]?.users_table === null) {
      await client.query(await readFile(schemaUrl, "utf8"));
    }
  } finally {
    await client.end();
  }
}

async function assertRedisReachable(): Promise<void> {
  const client = createClient({
    url: testEnv.REDIS_URL,
    socket: { connectTimeout: 3000, reconnectStrategy: false },
  });
  client.on("error", () => {});

  try {
    await client.connect();
    await client.ping();
  } catch (error) {
    throw new Error(
      `Cannot reach test Redis at ${testEnv.REDIS_URL}. ` +
        `Start it with "npm run test:db:up". (${errorMessage(error)})`,
    );
  } finally {
    if (client.isOpen) await client.close();
  }
}

export default async function setup(): Promise<void> {
  assertSafeTestEnvironment(testEnv);
  await applySchemaIfMissing();
  await assertRedisReachable();
}