import { afterAll, describe, expect, it } from "vitest";
import { pool } from "../../src/config/database.ts";
import { prisma } from "../../src/config/prisma.ts";
import { Redis } from "../../src/config/redis.ts";

describe("test infrastructure", () => {
  afterAll(async () => {
    await Promise.all([pool.end(), prisma.$disconnect(), Redis.close()]);
  });

  it("connects the pg pool to the test database", async () => {
    const { rows } = await pool.query<{ db: string }>(
      "SELECT current_database() AS db",
    );

    expect(rows[0]?.db).toMatch(/_test$/);
  });

  it("connects Prisma to the same test database", async () => {
    const rows = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
    const { rows: poolRows } = await pool.query<{ db: string }>(
      "SELECT current_database() AS db",
    );

    expect(rows[0]?.db).toMatch(/_test$/);
    expect(rows[0]?.db).toBe(poolRows[0]?.db);
  });

  it("has every application table", async () => {
    const { rows } = await pool.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );

    expect(rows.map((row) => row.table_name)).toEqual([
      "players",
      "refresh_tokens",
      "scout_players",
      "scouts",
      "users",
    ]);
  });

  it("lets Prisma read a row written through the pg pool", async () => {
    const email = "infra-check@example.test";
    const { rows } = await pool.query<{ user_id: string }>(
      "INSERT INTO users (name, email, user_type) VALUES ($1, $2, $3) RETURNING user_id",
      ["Infra Check", email, "scout"],
    );
    const userId = rows[0]?.user_id;

    try {
      const user = await prisma.users.findUnique({ where: { user_id: userId } });

      expect(user).toMatchObject({
        email,
        name: "Infra Check",
        user_type: "scout",
        role: "user",
      });
    } finally {
      await pool.query("DELETE FROM users WHERE email = $1", [email]);
    }
  });

  it("reaches the test Redis", async () => {
    expect(await Redis.ping()).toBe("PONG");
  });
});