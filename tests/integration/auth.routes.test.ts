import { createHash, randomBytes, randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { jwtVerify } from "jose";
import { pool } from "../../src/config/database.ts";
import {
  DEFAULT_PASSWORD,
  api,
  bearer,
  createAdmin,
  createPlayerProfile,
  createUser,
  randomId,
  uniqueEmail,
  useIntegrationLifecycle,
} from "../helpers/integration.ts";

// Google is the only external service: the real OAuth2Client never runs.
const googleMock = vi.hoisted(() => ({
  generateAuthUrl: vi.fn(),
  getToken: vi.fn(),
  verifyIdToken: vi.fn(),
}));
vi.mock("../../src/config/google-oauth.ts", () => ({ googleClient: googleMock }));

useIntegrationLifecycle();

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

/** Returns the Set-Cookie header whose cookie has the given name. */
const findCookie = (res: { headers: Record<string, unknown> }, name: string): string | undefined => {
  const header = res.headers["set-cookie"] as string[] | undefined;
  return header?.find((cookie) => cookie.startsWith(`${name}=`));
};

const cookieValue = (cookie: string): string =>
  cookie.split(";")[0]!.split("=")[1]!;

/** Logs a seeded user in and returns the refresh token the server issued. */
const loginAndGetRefreshToken = async (email: string): Promise<string> => {
  const res = await api()
    .post("/api/users/login")
    .send({ email, password: DEFAULT_PASSWORD });
  expect(res.status).toBe(200);
  return res.body.refresh_token as string;
};

describe("POST /api/users/register", () => {
  const validBody = () => ({
    name: "New Player",
    email: uniqueEmail(),
    password: "Password123!",
    userType: "player",
  });

  it("creates a player and never returns the password hash", async () => {
    const body = validBody();

    const res = await api().post("/api/users/register").send(body);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("User registered successfully");
    expect(res.body.newUser).toMatchObject({
      name: body.name,
      email: body.email,
      user_type: "player",
      role: "player",
    });
    expect(res.body.newUser).not.toHaveProperty("password_hash");

    const { rows } = await pool.query(
      "SELECT password_hash, user_type FROM users WHERE email = $1",
      [body.email],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].user_type).toBe("player");
    expect(rows[0].password_hash).toMatch(/^\$argon2/);
    expect(rows[0].password_hash).not.toContain(body.password);
  });

  it("creates a scout", async () => {
    const res = await api()
      .post("/api/users/register")
      .send({ ...validBody(), userType: "scout" });

    expect(res.status).toBe(201);
    expect(res.body.newUser).toMatchObject({ user_type: "scout", role: "scout" });
  });

  it.each([
    ["name is missing", { name: undefined }, "Name"],
    ["name is blank", { name: "   " }, "Name"],
    ["email is missing", { email: undefined }, "Email"],
    ["email is malformed", { email: "not-an-email" }, "Email"],
    ["email is longer than 30 characters", { email: `${"a".repeat(25)}@it.test` }, "Email"],
    ["password is missing", { password: undefined }, "Password"],
    ["password is shorter than 8 characters", { password: "short" }, "Password"],
    ["password is longer than 50 characters", { password: "p".repeat(51) }, "Password"],
    ["userType is missing", { userType: undefined }, "User Type"],
    ["userType is not player or scout", { userType: "admin" }, "User Type"],
  ])("rejects the request when %s", async (_label, change, field) => {
    const res = await api()
      .post("/api/users/register")
      .send({ ...validBody(), ...change });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Please check your registration details:");
    expect(res.body.message).toContain(`- ${field}:`);
  });

  it("rejects a body that is not JSON", async () => {
    const res = await api()
      .post("/api/users/register")
      .set("Content-Type", "application/json")
      .send("{ not json");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Invalid JSON in request body" });
  });

  it("answers 409 for an email that is already registered", async () => {
    const existing = await createUser({ userType: "player" });

    const res = await api()
      .post("/api/users/register")
      .send({ ...validBody(), email: existing.email });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: "An account with this email already exists" });
    const { rowCount } = await pool.query("SELECT 1 FROM users WHERE email = $1", [existing.email]);
    expect(rowCount).toBe(1);
  });

  it("rejects a name longer than 50 characters", async () => {
    const res = await api()
      .post("/api/users/register")
      .send({ ...validBody(), name: "n".repeat(51) });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("- Name:");
  });

  it("answers 429 once 50 requests were made in the window", async () => {
    // An empty body fails validation, so these requests are cheap.
    for (let i = 0; i < 50; i++) {
      const res = await api().post("/api/users/register").send({});
      expect(res.status).toBe(400);
    }

    const limited = await api().post("/api/users/register").send({});

    expect(limited.status).toBe(429);
    expect(limited.body.message).toContain("Too many registration attempts");
  });
});

describe("POST /api/users/login", () => {
  it("logs in, returns a verifiable access token and stores the session", async () => {
    const user = await createUser({ userType: "player" });

    const res = await api()
      .post("/api/users/login")
      .send({ email: user.email, password: user.password });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("User logged in successfully");
    expect(res.body.user).toMatchObject({
      user_id: user.id,
      email: user.email,
      role: "player",
    });
    expect(res.body.user).not.toHaveProperty("password_hash");

    const { payload } = await jwtVerify(res.body.access_token, secret);
    expect(payload.sub).toBe(user.id);
    expect(payload.role).toBe("player");

    // The refresh token is stored hashed, never in clear text.
    const { rows } = await pool.query(
      "SELECT token_hash, revoked_at, expires_at FROM refresh_tokens WHERE user_id = $1",
      [user.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).toBe(sha256(res.body.refresh_token));
    expect(rows[0].revoked_at).toBeNull();
    expect(rows[0].expires_at.getTime()).toBeGreaterThan(Date.now());
  });

  it("sets the refresh token as an httpOnly strict cookie scoped to /api/users", async () => {
    const user = await createUser({ userType: "scout" });

    const res = await api()
      .post("/api/users/login")
      .send({ email: user.email, password: user.password });

    const cookie = findCookie(res, "refreshToken");
    expect(cookie).toBeDefined();
    expect(cookieValue(cookie!)).toBe(res.body.refresh_token);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/api/users");
    expect(cookie).not.toContain("Secure");
  });

  it("answers 404 for an unknown email", async () => {
    const res = await api()
      .post("/api/users/login")
      .send({ email: uniqueEmail(), password: DEFAULT_PASSWORD });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "User not found" });
  });

  it("answers 401 for a wrong password and stores no session", async () => {
    const user = await createUser({ userType: "player" });

    const res = await api()
      .post("/api/users/login")
      .send({ email: user.email, password: "WrongPassword1" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Invalid email or password" });
    const { rowCount } = await pool.query(
      "SELECT 1 FROM refresh_tokens WHERE user_id = $1",
      [user.id],
    );
    expect(rowCount).toBe(0);
  });

  it("tells a Google-only account to log in with Google", async () => {
    const user = await createUser({ userType: "player", password: null, googleId: "g-123" });

    const res = await api()
      .post("/api/users/login")
      .send({ email: user.email, password: DEFAULT_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Please login using Google" });
  });

  it.each([
    ["email is missing", { password: DEFAULT_PASSWORD }, "Email"],
    ["email is malformed", { email: "nope", password: DEFAULT_PASSWORD }, "Email"],
    ["password is missing", { email: "a@it.test" }, "Password"],
    ["password is shorter than 8 characters", { email: "a@it.test", password: "short" }, "Password"],
  ])("rejects the request when %s", async (_label, body, field) => {
    const res = await api().post("/api/users/login").send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Please check your login details:");
    expect(res.body.message).toContain(`${field}:`);
  });

  it("answers 429 once 100 requests were made in the window", async () => {
    for (let i = 0; i < 100; i++) {
      const res = await api().post("/api/users/login").send({});
      expect(res.status).toBe(400);
    }

    const limited = await api().post("/api/users/login").send({});

    expect(limited.status).toBe(429);
    expect(limited.body.message).toContain("Too many login attempts");
  });
});

describe("POST /api/users/logout", () => {
  it("revokes the session and clears the cookie", async () => {
    const user = await createUser({ userType: "player" });
    const refreshToken = await loginAndGetRefreshToken(user.email);

    const res = await api()
      .post("/api/users/logout")
      .set("Authorization", bearer(user.token))
      .set("Cookie", `refreshToken=${refreshToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("User logged out successfully");

    const { rows } = await pool.query(
      "SELECT session_id, revoked_at FROM refresh_tokens WHERE token_hash = $1",
      [sha256(refreshToken)],
    );
    expect(rows[0].revoked_at).not.toBeNull();
    expect(res.body.expiredSessionId).toBe(rows[0].session_id);

    const cleared = findCookie(res, "refreshToken");
    expect(cookieValue(cleared!)).toBe("");
    expect(cleared).toContain("Path=/api/users");
  });

  it("makes the revoked refresh token unusable", async () => {
    const user = await createUser({ userType: "player" });
    const refreshToken = await loginAndGetRefreshToken(user.email);
    await api()
      .post("/api/users/logout")
      .set("Authorization", bearer(user.token))
      .set("Cookie", `refreshToken=${refreshToken}`);

    const res = await api()
      .post("/api/users/refresh")
      .set("Cookie", `refreshToken=${refreshToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Invalid or expired refresh token" });
  });

  it("requires an access token", async () => {
    const res = await api().post("/api/users/logout");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Authorization header missing or malformed" });
  });

  it("requires the refresh token cookie", async () => {
    const user = await createUser({ userType: "player" });

    const res = await api()
      .post("/api/users/logout")
      .set("Authorization", bearer(user.token));

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Refresh token required" });
  });

  it("answers 500 'Logout failed' for a refresh token that does not exist", async () => {
    const user = await createUser({ userType: "player" });

    const res = await api()
      .post("/api/users/logout")
      .set("Authorization", bearer(user.token))
      .set("Cookie", `refreshToken=${randomBytes(32).toString("hex")}`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Logout failed" });
  });
});

describe("POST /api/users/refresh", () => {
  it("rotates the refresh token and issues a new access token for the same session", async () => {
    const user = await createUser({ userType: "scout" });
    const oldToken = await loginAndGetRefreshToken(user.email);
    const { rows: before } = await pool.query(
      "SELECT session_id FROM refresh_tokens WHERE token_hash = $1",
      [sha256(oldToken)],
    );

    const res = await api()
      .post("/api/users/refresh")
      .set("Cookie", `refreshToken=${oldToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      session_id: before[0].session_id,
      user_id: user.id,
    });
    expect(res.body).not.toHaveProperty("refreshToken");
    expect(new Date(res.body.expires_at).getTime()).toBeGreaterThan(Date.now());

    const { payload } = await jwtVerify(res.body.access_token, secret);
    expect(payload.sub).toBe(user.id);
    expect(payload.role).toBe("scout");

    const newToken = cookieValue(findCookie(res, "refreshToken")!);
    expect(newToken).not.toBe(oldToken);
    const { rows } = await pool.query(
      "SELECT token_hash, revoked_at, session_id FROM refresh_tokens WHERE user_id = $1",
      [user.id],
    );
    const old = rows.find((row) => row.token_hash === sha256(oldToken));
    const fresh = rows.find((row) => row.token_hash === sha256(newToken));
    expect(old.revoked_at).not.toBeNull();
    expect(fresh.revoked_at).toBeNull();
    expect(fresh.session_id).toBe(before[0].session_id);
  });

  it("does not accept the old refresh token a second time", async () => {
    const user = await createUser({ userType: "player" });
    const oldToken = await loginAndGetRefreshToken(user.email);
    await api().post("/api/users/refresh").set("Cookie", `refreshToken=${oldToken}`);

    const res = await api()
      .post("/api/users/refresh")
      .set("Cookie", `refreshToken=${oldToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Invalid or expired refresh token" });
  });

  it("requires the refresh token cookie", async () => {
    const res = await api().post("/api/users/refresh");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Refresh token required" });
  });

  it("rejects a refresh token the server never issued", async () => {
    const res = await api()
      .post("/api/users/refresh")
      .set("Cookie", `refreshToken=${randomBytes(32).toString("hex")}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Invalid or expired refresh token" });
  });

  it("rejects an expired refresh token", async () => {
    const user = await createUser({ userType: "player" });
    const token = randomBytes(32).toString("hex");
    await pool.query(
      `INSERT INTO refresh_tokens (session_id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, NOW() - INTERVAL '1 hour')`,
      [randomUUID(), user.id, sha256(token)],
    );

    const res = await api().post("/api/users/refresh").set("Cookie", `refreshToken=${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Invalid or expired refresh token" });
  });
});

describe("PUT /api/users/update", () => {
  it("updates the name and email of the logged in user", async () => {
    const user = await createUser({ userType: "player" });
    const newEmail = uniqueEmail();

    const res = await api()
      .put("/api/users/update")
      .set("Authorization", bearer(user.token))
      .send({ name: "Renamed", email: newEmail });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("User updated successfully");
    expect(res.body.updatedUser).toMatchObject({
      user_id: user.id,
      name: "Renamed",
      email: newEmail,
    });
    expect(res.body.updatedUser).not.toHaveProperty("password_hash");

    const { rows } = await pool.query("SELECT name, email FROM users WHERE user_id = $1", [user.id]);
    expect(rows[0]).toEqual({ name: "Renamed", email: newEmail });
  });

  it("trims the name before saving it", async () => {
    const user = await createUser({ userType: "player" });

    const res = await api()
      .put("/api/users/update")
      .set("Authorization", bearer(user.token))
      .send({ name: "  Padded Name  ", email: user.email });

    expect(res.status).toBe(200);
    expect(res.body.updatedUser.name).toBe("Padded Name");
  });

  it("requires an access token", async () => {
    const res = await api().put("/api/users/update").send({ name: "x", email: uniqueEmail() });

    expect(res.status).toBe(401);
  });

  it("answers 404 when the token belongs to a user that no longer exists", async () => {
    const user = await createUser({ userType: "player" });
    await pool.query("DELETE FROM users WHERE user_id = $1", [user.id]);

    const res = await api()
      .put("/api/users/update")
      .set("Authorization", bearer(user.token))
      .send({ name: "Ghost", email: uniqueEmail() });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "User not found" });
  });

  it.each([
    ["name is missing", { email: "a@it.test" }, "Name"],
    ["name is blank", { name: "  ", email: "a@it.test" }, "Name"],
    ["name is longer than 50 characters", { name: "n".repeat(51), email: "a@it.test" }, "Name"],
    ["email is missing", { name: "No Email" }, "Email"],
    ["email is malformed", { name: "Bad", email: "nope" }, "Email"],
    ["email is longer than 30 characters", { name: "Long", email: `${"a".repeat(25)}@it.test` }, "Email"],
  ])("rejects the request when %s", async (_label, body, field) => {
    const user = await createUser({ userType: "player", name: "Original" });

    const res = await api()
      .put("/api/users/update")
      .set("Authorization", bearer(user.token))
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Please check your update details:");
    expect(res.body.message).toContain(`${field}:`);
    const { rows } = await pool.query("SELECT name FROM users WHERE user_id = $1", [user.id]);
    expect(rows[0].name).toBe("Original");
  });

  it("answers 409 when the email belongs to another user", async () => {
    const user = await createUser({ userType: "player" });
    const other = await createUser({ userType: "player" });

    const res = await api()
      .put("/api/users/update")
      .set("Authorization", bearer(user.token))
      .send({ name: "Taken", email: other.email });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: "An account with this email already exists" });
    const { rows } = await pool.query("SELECT email FROM users WHERE user_id = $1", [user.id]);
    expect(rows[0].email).toBe(user.email);
  });
});

describe("DELETE /api/users/:id", () => {
  it("lets an admin delete a user together with their profile and sessions", async () => {
    const admin = await createAdmin();
    const victim = await createUser({ userType: "player" });
    await createPlayerProfile(victim);
    await loginAndGetRefreshToken(victim.email);

    const res = await api()
      .delete(`/api/users/${victim.id}`)
      .set("Authorization", bearer(admin.token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "User deleted successfully" });
    const checks = [
      ["users", "user_id"],
      ["players", "player_id"],
      ["refresh_tokens", "user_id"],
    ] as const;
    for (const [table, column] of checks) {
      const { rowCount } = await pool.query(`SELECT 1 FROM ${table} WHERE ${column} = $1`, [victim.id]);
      expect(rowCount, table).toBe(0);
    }
  });

  it.each(["player", "scout"] as const)("forbids a %s", async (userType) => {
    const caller = await createUser({ userType });
    const victim = await createUser({ userType: "player" });

    const res = await api()
      .delete(`/api/users/${victim.id}`)
      .set("Authorization", bearer(caller.token));

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "You are not authorized to access this resource" });
    const { rowCount } = await pool.query("SELECT 1 FROM users WHERE user_id = $1", [victim.id]);
    expect(rowCount).toBe(1);
  });

  it("requires an access token", async () => {
    const res = await api().delete(`/api/users/${randomId()}`);

    expect(res.status).toBe(401);
  });

  it("answers 200 even when the user does not exist", async () => {
    const admin = await createAdmin();

    const res = await api()
      .delete(`/api/users/${randomId()}`)
      .set("Authorization", bearer(admin.token));

    expect(res.status).toBe(200);
  });

  it("answers 400 for an id that is not a UUID", async () => {
    const admin = await createAdmin();

    const res = await api()
      .delete("/api/users/not-a-uuid")
      .set("Authorization", bearer(admin.token));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Invalid id: must be a valid UUID" });
  });
});

describe("GET /api/users/google", () => {
  it.each(["player", "scout"] as const)(
    "redirects a %s to Google with a matching state cookie",
    async (userType) => {
      googleMock.generateAuthUrl.mockReturnValue("https://accounts.google.test/auth?x=1");

      const res = await api().get("/api/users/google").query({ user_type: userType });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("https://accounts.google.test/auth?x=1");

      const state = cookieValue(findCookie(res, "oauth_state")!);
      expect(state).toMatch(/^[0-9a-f]{32}$/);
      expect(googleMock.generateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({ state, scope: ["openid", "email", "profile"] }),
      );

      const typeCookie = findCookie(res, "oauth_user_type")!;
      expect(cookieValue(typeCookie)).toBe(userType);
      expect(typeCookie).toContain("HttpOnly");
      expect(typeCookie).toContain("Path=/api/users/google");
    },
  );

  it.each([
    ["is missing", {}],
    ["is admin", { user_type: "admin" }],
    ["is empty", { user_type: "" }],
  ])("answers 400 when user_type %s", async (_label, query) => {
    const res = await api().get("/api/users/google").query(query);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Invalid user type" });
    expect(googleMock.generateAuthUrl).not.toHaveBeenCalled();
  });
});

describe("GET /api/users/google/callback", () => {
  const STATE = "state-123";
  const cookies = (userType = "player") =>
    `oauth_state=${STATE}; oauth_user_type=${userType}`;

  const googleAccount = (overrides: Record<string, unknown> = {}) => ({
    sub: "google-sub-1",
    email: uniqueEmail(),
    email_verified: true,
    name: "Google Person",
    ...overrides,
  });

  const givenGoogleReturns = (payload: Record<string, unknown> | undefined) => {
    googleMock.getToken.mockResolvedValue({ tokens: { id_token: "google-id-token" } });
    googleMock.verifyIdToken.mockResolvedValue({ getPayload: () => payload });
  };

  const callback = (query: Record<string, string> = { state: STATE, code: "auth-code" }, cookie = cookies()) =>
    api().get("/api/users/google/callback").query(query).set("Cookie", cookie);

  it("creates the user on first sign in and starts a session", async () => {
    const account = googleAccount();
    givenGoogleReturns(account);

    const res = await callback();

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Google authentication successful");
    expect(res.body.user).toMatchObject({
      email: account.email,
      name: "Google Person",
      google_id: "google-sub-1",
      user_type: "player",
    });
    expect(res.body).not.toHaveProperty("refresh_token");
    expect(res.body.user).not.toHaveProperty("password_hash");

    expect(googleMock.getToken).toHaveBeenCalledWith("auth-code");
    expect(googleMock.verifyIdToken).toHaveBeenCalledWith({
      idToken: "google-id-token",
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { rows } = await pool.query(
      "SELECT user_id, password_hash, user_type FROM users WHERE google_id = $1",
      ["google-sub-1"],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].password_hash).toBeNull();
    expect(res.body.user_id).toBe(rows[0].user_id);

    const refreshCookie = cookieValue(findCookie(res, "refreshToken")!);
    const session = await pool.query("SELECT 1 FROM refresh_tokens WHERE token_hash = $1", [sha256(refreshCookie)]);
    expect(session.rowCount).toBe(1);

    // The temporary OAuth cookies are removed.
    expect(cookieValue(findCookie(res, "oauth_state")!)).toBe("");
    expect(cookieValue(findCookie(res, "oauth_user_type")!)).toBe("");
  });

  it("signs an existing Google user in without creating a second account", async () => {
    const existing = await createUser({ userType: "scout", password: null, googleId: "google-sub-1" });
    givenGoogleReturns(googleAccount({ email: existing.email }));

    const res = await callback();

    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(existing.id);
    const { rowCount } = await pool.query("SELECT 1 FROM users WHERE google_id = $1", ["google-sub-1"]);
    expect(rowCount).toBe(1);
  });

  it.each(["player", "scout"] as const)(
    "gives a new Google %s an access token with that role",
    async (userType) => {
      givenGoogleReturns(googleAccount());

      const res = await callback({ state: STATE, code: "auth-code" }, cookies(userType));

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe(userType);
      const { payload } = await jwtVerify(res.body.access_token, secret);
      expect(payload.role).toBe(userType);
    },
  );

  it("lets a Google player create a player profile with the access token", async () => {
    givenGoogleReturns(googleAccount());
    const signIn = await callback();

    const res = await api()
      .post("/api/players")
      .set("Authorization", bearer(signIn.body.access_token))
      .send({ position: "mid", ratings: 75, contactDetails: "08012345678" });

    expect(res.status).toBe(201);
    expect(res.body.player_id).toBe(signIn.body.user_id);
  });

  it("refuses to link a Google account to an existing email", async () => {
    const existing = await createUser({ userType: "player" });
    givenGoogleReturns(googleAccount({ email: existing.email }));

    const res = await callback();

    expect(res.status).toBe(409);
    expect(res.body.message).toContain("An account with this email already exists");
  });

  it.each([
    ["the state does not match the cookie", { state: "other", code: "c" }, cookies(), 401, "Invalid OAuth state"],
    ["the state query is missing", { code: "c" }, cookies(), 401, "Invalid OAuth state"],
    ["the state cookie is missing", { state: STATE, code: "c" }, "oauth_user_type=player", 401, "Invalid OAuth state"],
    ["the user type cookie is invalid", { state: STATE, code: "c" }, cookies("admin"), 400, "Invalid user type"],
    ["the code is missing", { state: STATE }, cookies(), 400, "Authorization code missing"],
  ])("rejects the callback when %s", async (_label, query, cookie, status, message) => {
    const res = await callback(query, cookie);

    expect(res.status).toBe(status);
    expect(res.body).toEqual({ message });
    expect(googleMock.getToken).not.toHaveBeenCalled();
  });

  it("rejects a response without an ID token", async () => {
    googleMock.getToken.mockResolvedValue({ tokens: {} });

    const res = await callback();

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Google ID token not received" });
    expect(googleMock.verifyIdToken).not.toHaveBeenCalled();
  });

  it.each([
    ["has no payload", undefined],
    ["has an unverified email", googleAccount({ email_verified: false })],
    ["has no email", googleAccount({ email: undefined })],
    ["has no subject", googleAccount({ sub: undefined })],
  ])("rejects a Google account that %s", async (_label, payload) => {
    givenGoogleReturns(payload);

    const res = await callback();

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Unable to verify Google account" });
    const { rowCount } = await pool.query("SELECT 1 FROM users WHERE google_id IS NOT NULL");
    expect(rowCount).toBe(0);
  });

  it("answers 500 when Google rejects the authorization code", async () => {
    googleMock.getToken.mockRejectedValue(new Error("invalid_grant"));

    const res = await callback();

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Internal server error" });
  });
});