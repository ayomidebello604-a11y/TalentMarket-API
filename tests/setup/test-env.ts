const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const fromEnv = (name: string, fallback: string): string =>
  process.env[name] ?? fallback;

const dbHost = fromEnv("TEST_DB_HOST", "localhost");
const dbPort = fromEnv("TEST_DB_PORT", "5433");
const dbUser = fromEnv("TEST_DB_USER", "postgres");
const dbPassword = fromEnv("TEST_DB_PASSWORD", "postgres");
const dbName = fromEnv("TEST_DB_NAME", "talentmarket_test");

/**
 * Environment injected into every test worker (see vitest.config.ts).
 *
 * The app reads DB_*, REDIS_URL and JWT_SECRET. Tests only ever read the
 * TEST_* variables above, so a developer's real DB_* values can never leak in.
 */
export const testEnv = {
  NODE_ENV: "test",
  JWT_SECRET: "test-only-jwt-secret-do-not-use-anywhere-else",
  DB_HOST: dbHost,
  DB_PORT: dbPort,
  DB_USER: dbUser,
  DB_PASSWORD: dbPassword,
  DB_NAME: dbName,
  DATABASE_URL: `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}?schema=public`,
  REDIS_URL: fromEnv("TEST_REDIS_URL", "redis://localhost:6380"),
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GOOGLE_CLIENT_SECRET: "test-google-client-secret",
  GOOGLE_CALLBACK_URL: "http://localhost:3000/api/users/google/callback",
} satisfies Record<string, string>;

const hostnameOf = (url: string): string =>
  new URL(url).hostname.replace(/^\[|\]$/g, "");

/**
 * Throws unless the environment points only at a local, clearly named test
 * database and a local Redis. Called before any test code can open a connection.
 */
export function assertSafeTestEnvironment(
  env: Record<string, string | undefined>,
): void {
  const problems: string[] = [];

  if (env.NODE_ENV !== "test") {
    problems.push(`NODE_ENV must be "test" (got "${env.NODE_ENV}")`);
  }
  if (!env.DB_NAME?.endsWith("_test")) {
    problems.push(`DB_NAME must end with "_test" (got "${env.DB_NAME}")`);
  }
  if (!LOCAL_HOSTS.has(env.DB_HOST ?? "")) {
    problems.push(`DB_HOST must be local (got "${env.DB_HOST}")`);
  }

  try {
    const redisHost = hostnameOf(env.REDIS_URL ?? "");
    if (!LOCAL_HOSTS.has(redisHost)) {
      problems.push(`REDIS_URL must point at a local Redis (got host "${redisHost}")`);
    }
  } catch {
    problems.push(`REDIS_URL is missing or invalid (got "${env.REDIS_URL}")`);
  }

  if (problems.length > 0) {
    throw new Error(
      `Refusing to run tests against an unsafe environment:\n- ${problems.join("\n- ")}`,
    );
  }
}