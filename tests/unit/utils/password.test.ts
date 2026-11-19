import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../../src/utils/password.ts";

const PASSWORD = "correct-horse-battery";

describe("hashPassword", () => {
  it("produces an argon2 hash that does not contain the password", async () => {
    const hash = await hashPassword(PASSWORD);

    expect(hash).toMatch(/^\$argon2/);
    expect(hash).not.toContain(PASSWORD);
  });

  it("salts every hash differently", async () => {
    const [first, second] = await Promise.all([
      hashPassword(PASSWORD),
      hashPassword(PASSWORD),
    ]);

    expect(first).not.toBe(second);
  });
});

describe("verifyPassword", () => {
  it("accepts the original password", async () => {
    const hash = await hashPassword(PASSWORD);

    expect(await verifyPassword(hash, PASSWORD)).toBe(true);
  });

  it("rejects a different password", async () => {
    const hash = await hashPassword(PASSWORD);

    expect(await verifyPassword(hash, "wrong-password")).toBe(false);
  });

  it("throws on a malformed hash instead of accepting it", async () => {
    await expect(verifyPassword("not-a-real-hash", PASSWORD)).rejects.toThrow();
  });
});