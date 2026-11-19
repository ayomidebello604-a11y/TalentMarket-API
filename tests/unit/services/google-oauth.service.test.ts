import { createHash } from "node:crypto";
import { jwtVerify } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGoogleUser,
  findUserByEmail,
  findUserByGoogleId,
  putSessionInfo,
} from "../../../src/repositories/auth.repository.ts";
import { googleAuthService } from "../../../src/services/google-oauth.service.ts";

// Only the database boundary is mocked. The Google API calls live in the
// controller, so nothing here touches Google. JWT signing and crypto are real.
vi.mock(import("../../../src/repositories/auth.repository.ts"), () => ({
  findUserByGoogleId: vi.fn(),
  findUserByEmail: vi.fn(),
  createGoogleUser: vi.fn(),
  putSessionInfo: vi.fn(),
}));

const NOW = new Date("2026-01-01T00:00:00.000Z");
const IN_ONE_DAY = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
const USER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const SESSION_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const HEX_64 = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const googleUser = {
  googleId: "google-sub-123",
  email: "jane.doe@gmail.com",
  name: "Jane Doe",
};

const storedUser = {
  user_id: USER_ID,
  name: "Jane Doe",
  email: "jane.doe@gmail.com",
  google_id: "google-sub-123",
  user_type: "player",
  role: "user",
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.mocked(putSessionInfo).mockResolvedValue({
    session_id: SESSION_ID,
    user_id: USER_ID,
    expires_at: IN_ONE_DAY,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("googleAuthService", () => {
  it("logs in an existing Google user without the password hash", async () => {
    vi.mocked(findUserByGoogleId).mockResolvedValue({
      ...storedUser,
      password_hash: null,
    });

    const result = await googleAuthService(googleUser);

    expect(findUserByGoogleId).toHaveBeenCalledWith("google-sub-123");
    expect(findUserByEmail).not.toHaveBeenCalled();
    expect(createGoogleUser).not.toHaveBeenCalled();
    // The role is the account type, not the users.role column ("user").
    expect(result).toEqual({
      user: { ...storedUser, role: "player" },
      access_token: expect.any(String),
      refresh_token: expect.stringMatching(HEX_64),
      session_id: expect.stringMatching(UUID),
      user_id: USER_ID,
      expires_at: IN_ONE_DAY,
    });
    expect(result.user).not.toHaveProperty("password_hash");
  });

  it("issues an access token whose role is the account type", async () => {
    vi.mocked(findUserByGoogleId).mockResolvedValue({ ...storedUser, user_type: "scout" });

    const result = await googleAuthService(googleUser);

    const { payload } = await jwtVerify(result.access_token, secret);
    expect(payload).toMatchObject({ sub: USER_ID, role: "scout" });
    expect(payload.exp).toBe(NOW.getTime() / 1000 + 20 * 60);
  });

  it("stores only the hash of the refresh token, valid for 24 hours", async () => {
    vi.mocked(findUserByGoogleId).mockResolvedValue(storedUser);

    const result = await googleAuthService(googleUser);

    expect(putSessionInfo).toHaveBeenCalledOnce();
    expect(putSessionInfo).toHaveBeenCalledWith({
      session_id: result.session_id,
      user_id: USER_ID,
      token_hash: sha256(result.refresh_token),
      expires_at: IN_ONE_DAY,
    });
  });

  it("registers a new Google user with the chosen user type", async () => {
    vi.mocked(findUserByGoogleId).mockResolvedValue(null);
    vi.mocked(findUserByEmail).mockResolvedValue(null);
    vi.mocked(createGoogleUser).mockResolvedValue(storedUser);

    const result = await googleAuthService(googleUser, "scout");

    expect(findUserByEmail).toHaveBeenCalledWith("jane.doe@gmail.com");
    expect(createGoogleUser).toHaveBeenCalledWith({
      name: "Jane Doe",
      email: "jane.doe@gmail.com",
      google_id: "google-sub-123",
      user_type: "scout",
    });
    expect(result.user).toEqual({ ...storedUser, role: "player" });
    expect(result.user_id).toBe(USER_ID);
  });

  it("falls back to the email prefix when Google gives no name", async () => {
    vi.mocked(findUserByGoogleId).mockResolvedValue(null);
    vi.mocked(findUserByEmail).mockResolvedValue(null);
    vi.mocked(createGoogleUser).mockResolvedValue(storedUser);

    await googleAuthService({ ...googleUser, name: "" }, "player");

    expect(createGoogleUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: "jane.doe" }),
    );
  });

  it("refuses to link a Google account to an existing email with 409", async () => {
    vi.mocked(findUserByGoogleId).mockResolvedValue(null);
    vi.mocked(findUserByEmail).mockResolvedValue({
      user_id: USER_ID,
      name: "Jane Doe",
      email: "jane.doe@gmail.com",
      password_hash: "existing-password-hash",
      google_id: null,
      user_type: "player",
      role: "player",
    });

    await expect(googleAuthService(googleUser, "player")).rejects.toMatchObject({
      statusCode: 409,
      message:
        "An account with this email already exists. Please log in using your existing method.",
    });
    expect(createGoogleUser).not.toHaveBeenCalled();
    expect(putSessionInfo).not.toHaveBeenCalled();
  });

  it("requires a user type for a brand new Google user", async () => {
    vi.mocked(findUserByGoogleId).mockResolvedValue(null);
    vi.mocked(findUserByEmail).mockResolvedValue(null);

    await expect(googleAuthService(googleUser)).rejects.toMatchObject({
      statusCode: 400,
      message: "Please select whether you are a player or scout",
    });
    expect(createGoogleUser).not.toHaveBeenCalled();
  });

  it("fails with 500 when the new user cannot be created", async () => {
    vi.mocked(findUserByGoogleId).mockResolvedValue(null);
    vi.mocked(findUserByEmail).mockResolvedValue(null);
    vi.mocked(createGoogleUser).mockResolvedValue(null);

    await expect(googleAuthService(googleUser, "player")).rejects.toMatchObject({
      statusCode: 500,
      message: "Google authentication failed",
    });
    expect(putSessionInfo).not.toHaveBeenCalled();
  });

  it("fails when the session cannot be stored", async () => {
    const failure = new Error("insert failed");
    vi.mocked(findUserByGoogleId).mockResolvedValue(storedUser);
    vi.mocked(putSessionInfo).mockRejectedValue(failure);

    await expect(googleAuthService(googleUser)).rejects.toBe(failure);
  });
});