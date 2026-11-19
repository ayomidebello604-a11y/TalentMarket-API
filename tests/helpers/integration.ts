import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.ts";
import { pool } from "../../src/config/database.ts";
import { prisma } from "../../src/config/prisma.ts";
import { Redis } from "../../src/config/redis.ts";
import { generateToken } from "../../src/utils/jwt.ts";
import { hashPassword } from "../../src/utils/password.ts";

/** Every user created by the tests has an email on this domain. */
export const TEST_EMAIL_DOMAIN = "@it.test";
export const PLAYERS_CACHE_KEY = "talentmarket:players:all";
export const DEFAULT_PASSWORD = "Password123!";

export type UserType = "player" | "scout";

export type SeededUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  /** Valid access token signed with the real generateToken(). */
  token: string;
};

type CreateUserOptions = {
  userType: UserType;
  name?: string;
  email?: string;
  /** null creates an account without a password (Google style). */
  password?: string | null;
  googleId?: string;
};

export const api = () => request(app);

export const bearer = (token: string): string => `Bearer ${token}`;

export const uniqueEmail = (): string =>
  `${randomBytes(4).toString("hex")}${TEST_EMAIL_DOMAIN}`;

let defaultPasswordHash: string | undefined;
const hashOf = async (password: string): Promise<string> => {
  if (password !== DEFAULT_PASSWORD) return hashPassword(password);
  defaultPasswordHash ??= await hashPassword(DEFAULT_PASSWORD);
  return defaultPasswordHash;
};

export async function createUser(options: CreateUserOptions): Promise<SeededUser> {
  const email = options.email ?? uniqueEmail();
  const name = options.name ?? `${options.userType} ${email.slice(0, 8)}`;
  const password = options.password === undefined ? DEFAULT_PASSWORD : options.password;
  const passwordHash = password === null ? null : await hashOf(password);

  const { rows } = await pool.query<{ user_id: string }>(
    `INSERT INTO users (name, email, password_hash, user_type, google_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING user_id`,
    [name, email, passwordHash, options.userType, options.googleId ?? null],
  );
  const id = rows[0]!.user_id;

  return {
    id,
    name,
    email,
    password: password ?? "",
    token: await generateToken(id, options.userType),
  };
}

/** An admin account (users.role = 'admin') with a token carrying role "admin". */
export async function createAdmin(): Promise<SeededUser> {
  const email = uniqueEmail();
  const passwordHash = await hashOf(DEFAULT_PASSWORD);
  const { rows } = await pool.query<{ user_id: string }>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Admin User', $1, $2, 'admin') RETURNING user_id`,
    [email, passwordHash],
  );
  const id = rows[0]!.user_id;
  return {
    id,
    name: "Admin User",
    email,
    password: DEFAULT_PASSWORD,
    token: await generateToken(id, "admin"),
  };
}

type PlayerProfileOptions = {
  position?: "gk" | "def" | "mid" | "fwd";
  ratings?: number;
  contactDetails?: string;
};

export async function createPlayerProfile(
  user: SeededUser,
  options: PlayerProfileOptions = {},
): Promise<void> {
  await pool.query(
    "INSERT INTO players (player_id, position, ratings, contact_details) VALUES ($1, $2, $3, $4)",
    [
      user.id,
      options.position ?? "fwd",
      options.ratings ?? 80,
      options.contactDetails ?? "08012345678",
    ],
  );
}

/** Scout profiles are written with Prisma, like the application does. */
export async function createScoutProfile(
  user: SeededUser,
  contactDetails = "08012345678",
): Promise<void> {
  await prisma.scouts.create({
    data: { scout_id: user.id, contact_details: contactDetails },
  });
}

export async function linkScoutToPlayer(
  scout: SeededUser,
  player: SeededUser,
): Promise<void> {
  await pool.query(
    "INSERT INTO scout_players (scout_id, player_id) VALUES ($1, $2)",
    [scout.id, player.id],
  );
}

export const randomId = (): string => randomUUID();

/** Removes everything the tests created and the Redis keys the app writes. */
export async function resetState(): Promise<void> {
  await pool.query("DELETE FROM users WHERE email LIKE $1", [
    `%${TEST_EMAIL_DOMAIN}`,
  ]);
  const limiterKeys = await Redis.keys("rl:*");
  await Redis.del([PLAYERS_CACHE_KEY, ...limiterKeys]);
}

/**
 * Call once at the top of every integration test file. Gives each test a clean
 * state, keeps the request log and 500 error logs out of the output, and
 * closes the connections when the file is done.
 */
export function useIntegrationLifecycle(): void {
  beforeEach(async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    await resetState();
  });

  afterAll(async () => {
    await resetState();
    await Promise.all([pool.end(), prisma.$disconnect(), Redis.close()]);
  });
}