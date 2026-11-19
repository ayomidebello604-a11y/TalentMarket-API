import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { api, bearer, createPlayerProfile, createUser, randomId, useIntegrationLifecycle } from "../helpers/integration.ts";

useIntegrationLifecycle();

// verifyUserToken guards every route of /api/players, /api/scouts and
// /api/scout-players. GET /api/players is used here as a representative route.
const PROTECTED = "/api/players";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

const sign = (claims: Record<string, unknown>, options: { subject?: string; expiresIn?: string | number; key?: Uint8Array } = {}) => {
  const jwt = new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).setIssuedAt();
  if (options.subject) jwt.setSubject(options.subject);
  jwt.setExpirationTime(options.expiresIn ?? "10m");
  return jwt.sign(options.key ?? secret);
};

describe("verifyUserToken", () => {
  it("lets a valid token through", async () => {
    const player = await createUser({ userType: "player" });
    await createPlayerProfile(player);

    const res = await api().get(PROTECTED).set("Authorization", bearer(player.token));

    expect(res.status).toBe(200);
  });

  it.each([
    ["is missing", undefined],
    ["does not use the Bearer scheme", "Basic abc123"],
    ["is a bare token without the scheme", "abc123"],
  ])("answers 401 when the Authorization header %s", async (_label, header) => {
    const req = api().get(PROTECTED);
    if (header) req.set("Authorization", header);

    const res = await req;

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Authorization header missing or malformed" });
  });

  it("answers 401 when the token part is empty", async () => {
    // Two spaces: HTTP strips a trailing space, so "Bearer " alone never arrives.
    const res = await api().get(PROTECTED).set("Authorization", "Bearer  x");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Token not provided" });
  });

  it("answers 401 when the token has no subject", async () => {
    const token = await sign({ role: "player" });

    const res = await api().get(PROTECTED).set("Authorization", bearer(token));

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Invalid token payload" });
  });

  it("answers 401 when the token has no role", async () => {
    const token = await sign({}, { subject: randomId() });

    const res = await api().get(PROTECTED).set("Authorization", bearer(token));

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Invalid token payload" });
  });

  it("answers 401 when the token is not a JWT", async () => {
    const res = await api().get(PROTECTED).set("Authorization", "Bearer not.a.jwt");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Invalid token" });
  });

  it("answers 401 when the token was signed with another secret", async () => {
    const token = await sign(
      { role: "player" },
      { subject: randomId(), key: new TextEncoder().encode("some-other-secret-value-1234567890") },
    );

    const res = await api().get(PROTECTED).set("Authorization", bearer(token));

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Invalid token" });
  });

  it("answers 401 when the token has expired", async () => {
    const token = await sign({ role: "player" }, { subject: randomId(), expiresIn: Math.floor(Date.now() / 1000) - 60 });

    const res = await api().get(PROTECTED).set("Authorization", bearer(token));

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Token expired" });
  });
});

describe("authorizeRoles", () => {
  it("forbids a role that is not in the allowed list", async () => {
    const scout = await createUser({ userType: "scout" });

    const res = await api().delete(PROTECTED).set("Authorization", bearer(scout.token));

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "You are not authorized to access this resource" });
  });
});

describe("unknown routes", () => {
  it("answers 404 with the requested URL", async () => {
    const res = await api().get("/api/nothing-here?x=1");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Route Not Found", requestedURL: "/api/nothing-here?x=1" });
  });

  it("answers 404 for a known path with the wrong method", async () => {
    const res = await api().patch("/api/users/login");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Route Not Found");
  });
});