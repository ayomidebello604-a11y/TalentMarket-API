import { jwtVerify } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateToken } from "../../../src/utils/jwt.ts";

const USER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const NOW = new Date("2026-01-01T00:00:00.000Z");
const MINUTE_MS = 60 * 1000;
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

describe("generateToken", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("signs an HS256 token with the subject, role and a 20 minute lifetime", async () => {
    const token = await generateToken(USER_ID, "scout");

    const { payload, protectedHeader } = await jwtVerify(token, secret);

    expect(protectedHeader.alg).toBe("HS256");
    expect(payload).toMatchObject({ sub: USER_ID, role: "scout" });
    expect(payload.iat).toBe(NOW.getTime() / 1000);
    expect(payload.exp).toBe(NOW.getTime() / 1000 + 20 * 60);
  });

  it("is rejected when verified with a different secret", async () => {
    const token = await generateToken(USER_ID, "player");
    const otherSecret = new TextEncoder().encode("some-other-secret");

    await expect(jwtVerify(token, otherSecret)).rejects.toMatchObject({
      code: "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
    });
  });

  it("is valid just before 20 minutes and expired just after", async () => {
    const token = await generateToken(USER_ID, "player");

    vi.setSystemTime(NOW.getTime() + 20 * MINUTE_MS - 1000);
    await expect(jwtVerify(token, secret)).resolves.toMatchObject({
      payload: { sub: USER_ID },
    });

    vi.setSystemTime(NOW.getTime() + 20 * MINUTE_MS + 1000);
    await expect(jwtVerify(token, secret)).rejects.toMatchObject({
      code: "ERR_JWT_EXPIRED",
    });
  });
});