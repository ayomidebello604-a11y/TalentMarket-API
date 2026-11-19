import { createHash } from "node:crypto";
import { jwtVerify } from "jose";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { AppError } from "../../../src/errors/AppError.ts";
import {
  findUserByEmail,
  findUserById,
  putSessionInfo,
  registerUser,
  removeUser,
  revokeToken,
  rotateRefreshToken,
  searchToken,
  updateUser,
} from "../../../src/repositories/auth.repository.ts";
import {
  LoginUserService,
  deleteUserService,
  logoutUserService,
  registerUserService,
  updateUserService,
  verifyTokenService,
} from "../../../src/services/auth.service.ts";
import type { RegisterReturnType } from "../../../src/types/auth.type.ts";
import { hashPassword, verifyPassword } from "../../../src/utils/password.ts";

// Only the database boundary is mocked. Hashing, JWT signing and crypto are real.
vi.mock(import("../../../src/repositories/auth.repository.ts"), () => ({
  registerUser: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  updateUser: vi.fn(),
  removeUser: vi.fn(),
  putSessionInfo: vi.fn(),
  searchToken: vi.fn(),
  revokeToken: vi.fn(),
  rotateRefreshToken: vi.fn(),
}));

const NOW = new Date("2026-01-01T00:00:00.000Z");
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const IN_ONE_DAY = new Date(NOW.getTime() + ONE_DAY_MS);
const USER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const SESSION_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const PASSWORD = "correct-horse-battery";
const HEX_64 = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

type DbUser = NonNullable<Awaited<ReturnType<typeof findUserByEmail>>>;

let passwordHash: string;

const makeUser = (overrides: Partial<DbUser> = {}): DbUser => ({
  user_id: USER_ID,
  name: "Test User",
  email: "test@example.com",
  password_hash: passwordHash,
  google_id: null,
  user_type: "player",
  role: "player",
  ...overrides,
});

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

beforeEach(() => {
  // Freeze only Date so expiry times and JWT claims are exact.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("registerUserService", () => {
  const input = {
    name: "Test User",
    email: "test@example.com",
    password: PASSWORD,
    userType: "player",
  } as const;

  it("stores a hash of the password, never the plaintext", async () => {
    const created = {
      user_id: USER_ID,
      name: input.name,
      email: input.email,
      userType: input.userType,
    };
    vi.mocked(registerUser).mockResolvedValue(created);

    const result = await registerUserService(input);

    expect(result).toEqual(created);
    expect(registerUser).toHaveBeenCalledOnce();
    const stored = vi.mocked(registerUser).mock.calls[0]?.[0];
    expect(stored).toEqual({
      name: input.name,
      email: input.email,
      userType: input.userType,
      password_hash: expect.any(String),
    });
    expect(stored?.password_hash).toMatch(/^\$argon2/);
    expect(stored?.password_hash).not.toContain(PASSWORD);
    expect(await verifyPassword(stored?.password_hash ?? "", PASSWORD)).toBe(true);
  });

  it("fails with 500 when the repository returns no user", async () => {
    // The repository's types promise a row; simulate the defensive branch.
    vi.mocked(registerUser).mockResolvedValue(
      undefined as unknown as RegisterReturnType,
    );

    await expect(registerUserService(input)).rejects.toMatchObject({
      statusCode: 500,
      message: "User registration failed",
    });
  });

  it("fails with 409 when the email is already registered", async () => {
    const duplicate = Object.assign(
      new Error('duplicate key value violates unique constraint "users_email_key"'),
      { code: "23505" },
    );
    vi.mocked(registerUser).mockRejectedValue(duplicate);

    await expect(registerUserService(input)).rejects.toMatchObject({
      statusCode: 409,
      message: "An account with this email already exists",
    });
  });

  it("passes any other database error through unchanged", async () => {
    const failure = new Error("connection lost");
    vi.mocked(registerUser).mockRejectedValue(failure);

    await expect(registerUserService(input)).rejects.toBe(failure);
  });
});

describe("updateUserService", () => {
  it("updates the user and strips the password hash from the result", async () => {
    vi.mocked(updateUser).mockResolvedValue(
      makeUser({ name: "New Name", email: "new@example.com" }),
    );

    const result = await updateUserService("New Name", "new@example.com", USER_ID);

    expect(updateUser).toHaveBeenCalledWith("New Name", "new@example.com", USER_ID);
    expect(result).toEqual({
      user_id: USER_ID,
      name: "New Name",
      email: "new@example.com",
      google_id: null,
      user_type: "player",
      role: "player",
    });
    expect(result).not.toHaveProperty("password_hash");
  });

  it("fails with 404 when the user does not exist", async () => {
    vi.mocked(updateUser).mockResolvedValue(null);

    await expect(
      updateUserService("New Name", "new@example.com", USER_ID),
    ).rejects.toMatchObject({ statusCode: 404, message: "User not found" });
  });

  it("fails with 409 when the new email belongs to another user", async () => {
    const duplicate = Object.assign(new Error("duplicate key"), { code: "23505" });
    vi.mocked(updateUser).mockRejectedValue(duplicate);

    await expect(
      updateUserService("New Name", "taken@example.com", USER_ID),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "An account with this email already exists",
    });
  });

  it("passes any other database error through unchanged", async () => {
    const failure = new Error("connection lost");
    vi.mocked(updateUser).mockRejectedValue(failure);

    await expect(
      updateUserService("New Name", "new@example.com", USER_ID),
    ).rejects.toBe(failure);
  });
});

describe("deleteUserService", () => {
  it("removes the user by id", async () => {
    vi.mocked(removeUser).mockResolvedValue(undefined);

    await expect(deleteUserService(USER_ID)).resolves.toBeUndefined();
    expect(removeUser).toHaveBeenCalledWith(USER_ID);
  });

  it("propagates a database failure", async () => {
    const failure = new Error("connection lost");
    vi.mocked(removeUser).mockRejectedValue(failure);

    await expect(deleteUserService(USER_ID)).rejects.toBe(failure);
  });
});

describe("LoginUserService", () => {
  beforeEach(() => {
    vi.mocked(putSessionInfo).mockResolvedValue({
      session_id: SESSION_ID,
      user_id: USER_ID,
      expires_at: IN_ONE_DAY,
    });
  });

  it("returns the user without the hash, a signed access token and a refresh token", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(makeUser());

    const result = await LoginUserService("test@example.com", PASSWORD);

    expect(findUserByEmail).toHaveBeenCalledWith("test@example.com");
    expect(result.user).toEqual({
      user_id: USER_ID,
      name: "Test User",
      email: "test@example.com",
      google_id: null,
      user_type: "player",
      role: "player",
    });
    expect(result.user).not.toHaveProperty("password_hash");
    const { payload } = await jwtVerify(result.access_token, secret);
    expect(payload).toMatchObject({ sub: USER_ID, role: "player" });
    expect(payload.exp).toBe(NOW.getTime() / 1000 + 20 * 60);
    expect(result.refresh_token).toMatch(HEX_64);
  });

  it("stores only the hash of the refresh token, valid for 24 hours", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(makeUser());

    const result = await LoginUserService("test@example.com", PASSWORD);

    expect(putSessionInfo).toHaveBeenCalledOnce();
    expect(putSessionInfo).toHaveBeenCalledWith({
      session_id: expect.stringMatching(UUID),
      user_id: USER_ID,
      token_hash: sha256(result.refresh_token),
      expires_at: IN_ONE_DAY,
    });
  });

  it("issues a different refresh token and session on every login", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(makeUser());

    const first = await LoginUserService("test@example.com", PASSWORD);
    const second = await LoginUserService("test@example.com", PASSWORD);

    expect(first.refresh_token).not.toBe(second.refresh_token);
    const [firstSession, secondSession] = vi
      .mocked(putSessionInfo)
      .mock.calls.map(([session]) => session.session_id);
    expect(firstSession).not.toBe(secondSession);
  });

  it("uses the role column when user_type is empty", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(
      makeUser({ user_type: "", role: "admin" }),
    );

    const result = await LoginUserService("test@example.com", PASSWORD);

    const { payload } = await jwtVerify(result.access_token, secret);
    expect(payload.role).toBe("admin");
    expect(result.user.role).toBe("admin");
  });

  it("fails with 404 when no user has that email", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(null);

    await expect(LoginUserService("nobody@example.com", PASSWORD)).rejects.toMatchObject({
      statusCode: 404,
      message: "User not found",
    });
    expect(putSessionInfo).not.toHaveBeenCalled();
  });

  it("tells Google-only accounts to log in with Google", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(
      makeUser({ password_hash: null, google_id: "google-123" }),
    );

    await expect(LoginUserService("test@example.com", PASSWORD)).rejects.toMatchObject({
      statusCode: 400,
      message: "Please login using Google",
    });
    expect(putSessionInfo).not.toHaveBeenCalled();
  });

  it("rejects a wrong password with 401 and creates no session", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(makeUser());

    await expect(LoginUserService("test@example.com", "wrong-password")).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid email or password",
    });
    expect(putSessionInfo).not.toHaveBeenCalled();
  });

  it("propagates a failure while looking up the user", async () => {
    const failure = new Error("connection lost");
    vi.mocked(findUserByEmail).mockRejectedValue(failure);

    await expect(LoginUserService("test@example.com", PASSWORD)).rejects.toBe(failure);
  });

  it("fails when the session cannot be stored", async () => {
    const failure = new Error("insert failed");
    vi.mocked(findUserByEmail).mockResolvedValue(makeUser());
    vi.mocked(putSessionInfo).mockRejectedValue(failure);

    await expect(LoginUserService("test@example.com", PASSWORD)).rejects.toBe(failure);
  });
});

describe("logoutUserService", () => {
  const REFRESH_TOKEN = "a".repeat(64);

  it("revokes the session by the hash of the refresh token", async () => {
    vi.mocked(revokeToken).mockResolvedValue(SESSION_ID);

    const result = await logoutUserService(REFRESH_TOKEN);

    expect(revokeToken).toHaveBeenCalledWith(sha256(REFRESH_TOKEN));
    expect(result).toEqual({
      message: "Logout successful",
      expiredSessionId: SESSION_ID,
    });
  });

  it("fails with 500 when no session was revoked", async () => {
    vi.mocked(revokeToken).mockResolvedValue(null);

    await expect(logoutUserService(REFRESH_TOKEN)).rejects.toMatchObject({
      statusCode: 500,
      message: "Logout failed",
    });
  });

  it("propagates a database failure", async () => {
    const failure = new Error("connection lost");
    vi.mocked(revokeToken).mockRejectedValue(failure);

    await expect(logoutUserService(REFRESH_TOKEN)).rejects.toBe(failure);
  });
});

describe("verifyTokenService", () => {
  const OLD_REFRESH_TOKEN = "b".repeat(64);

  it("rotates the refresh token and issues a new access token", async () => {
    vi.mocked(searchToken).mockResolvedValue({
      user_id: USER_ID,
      session_id: SESSION_ID,
      token_hash: sha256(OLD_REFRESH_TOKEN),
    });
    vi.mocked(findUserById).mockResolvedValue({
      user_id: USER_ID,
      name: "Test User",
      email: "test@example.com",
      user_type: "scout",
    });
    vi.mocked(rotateRefreshToken).mockResolvedValue(undefined);

    const result = await verifyTokenService(OLD_REFRESH_TOKEN);

    expect(searchToken).toHaveBeenCalledWith(sha256(OLD_REFRESH_TOKEN));
    expect(result).toMatchObject({
      session_id: SESSION_ID,
      user_id: USER_ID,
      expires_at: IN_ONE_DAY,
    });
    expect(result.refreshToken).toMatch(HEX_64);
    expect(result.refreshToken).not.toBe(OLD_REFRESH_TOKEN);
    expect(rotateRefreshToken).toHaveBeenCalledWith(
      sha256(OLD_REFRESH_TOKEN),
      sha256(result.refreshToken),
      IN_ONE_DAY,
    );
    const { payload } = await jwtVerify(result.access_token, secret);
    expect(payload).toMatchObject({ sub: USER_ID, role: "scout" });
  });

  it("rejects an unknown, expired or revoked token with 401", async () => {
    vi.mocked(searchToken).mockResolvedValue(null);

    await expect(verifyTokenService(OLD_REFRESH_TOKEN)).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid or expired refresh token",
    });
    expect(findUserById).not.toHaveBeenCalled();
    expect(rotateRefreshToken).not.toHaveBeenCalled();
  });

  it("fails when the token is revoked during rotation", async () => {
    // rotateRefreshToken re-checks the token inside its transaction (reuse race).
    vi.mocked(searchToken).mockResolvedValue({
      user_id: USER_ID,
      session_id: SESSION_ID,
      token_hash: sha256(OLD_REFRESH_TOKEN),
    });
    vi.mocked(findUserById).mockResolvedValue({
      user_id: USER_ID,
      name: "Test User",
      email: "test@example.com",
      user_type: "player",
    });
    vi.mocked(rotateRefreshToken).mockRejectedValue(
      new AppError("Refresh token has already been revoked", 401),
    );

    await expect(verifyTokenService(OLD_REFRESH_TOKEN)).rejects.toMatchObject({
      statusCode: 401,
      message: "Refresh token has already been revoked",
    });
  });

  it("propagates a database failure while rotating", async () => {
    const failure = new Error("transaction aborted");
    vi.mocked(searchToken).mockResolvedValue({
      user_id: USER_ID,
      session_id: SESSION_ID,
      token_hash: sha256(OLD_REFRESH_TOKEN),
    });
    vi.mocked(findUserById).mockResolvedValue({
      user_id: USER_ID,
      name: "Test User",
      email: "test@example.com",
      user_type: "player",
    });
    vi.mocked(rotateRefreshToken).mockRejectedValue(failure);

    await expect(verifyTokenService(OLD_REFRESH_TOKEN)).rejects.toBe(failure);
  });
});