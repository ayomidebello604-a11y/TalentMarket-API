import { describe, expect, it } from "vitest";
import { prisma } from "../../src/config/prisma.ts";
import {
  api,
  bearer,
  createAdmin,
  createScoutProfile,
  createUser,
  randomId,
  useIntegrationLifecycle,
} from "../helpers/integration.ts";

useIntegrationLifecycle();

const scoutRow = (scoutId: string) =>
  prisma.scouts.findUnique({ where: { scout_id: scoutId } });

describe("GET /api/scouts", () => {
  it("lists scouts with their name and email", async () => {
    const viewer = await createUser({ userType: "player" });
    const scout = await createUser({ userType: "scout", name: "Scout One" });
    await createScoutProfile(scout, "08099999999");

    const res = await api().get("/api/scouts").set("Authorization", bearer(viewer.token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      scouts: [
        { scout_id: scout.id, contact_details: "08099999999", name: "Scout One", email: scout.email },
      ],
    });
  });

  it("answers 200 with an empty list when there are no scouts", async () => {
    const viewer = await createUser({ userType: "player" });

    const res = await api().get("/api/scouts").set("Authorization", bearer(viewer.token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "success", scouts: [] });
  });

  it("requires an access token", async () => {
    const res = await api().get("/api/scouts");

    expect(res.status).toBe(401);
  });
});

describe("POST /api/scouts", () => {
  it("creates the profile of the logged in scout", async () => {
    const scout = await createUser({ userType: "scout" });

    const res = await api()
      .post("/api/scouts")
      .set("Authorization", bearer(scout.token))
      .send({ contactDetails: "08012345678" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      status: "success",
      scout: { scout_id: scout.id, contact_details: "08012345678" },
    });
    expect((await scoutRow(scout.id))?.contact_details).toBe("08012345678");
  });

  it("trims the contact details", async () => {
    const scout = await createUser({ userType: "scout" });

    const res = await api()
      .post("/api/scouts")
      .set("Authorization", bearer(scout.token))
      .send({ contactDetails: "  08012345678  " });

    expect(res.status).toBe(201);
    expect(res.body.scout.contact_details).toBe("08012345678");
  });

  it("lets an admin account create a profile", async () => {
    const admin = await createAdmin();

    const res = await api()
      .post("/api/scouts")
      .set("Authorization", bearer(admin.token))
      .send({ contactDetails: "08012345678" });

    expect(res.status).toBe(201);
  });

  it("forbids a player", async () => {
    const player = await createUser({ userType: "player" });

    const res = await api()
      .post("/api/scouts")
      .set("Authorization", bearer(player.token))
      .send({ contactDetails: "08012345678" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Only users registered as scouts can create a scout profile" });
    expect(await scoutRow(player.id)).toBeNull();
  });

  it("answers 409 when the profile already exists and keeps the old one", async () => {
    const scout = await createUser({ userType: "scout" });
    await createScoutProfile(scout, "08000000000");

    const res = await api()
      .post("/api/scouts")
      .set("Authorization", bearer(scout.token))
      .send({ contactDetails: "08012345678" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: "Scout profile already exists" });
    expect((await scoutRow(scout.id))?.contact_details).toBe("08000000000");
  });

  it("requires an access token", async () => {
    const res = await api().post("/api/scouts").send({ contactDetails: "08012345678" });

    expect(res.status).toBe(401);
  });

  it.each([
    ["contact details are missing", {}],
    ["contact details are shorter than 11 characters", { contactDetails: "0801234" }],
    ["contact details are longer than 30 characters", { contactDetails: "0".repeat(31) }],
    ["contact details are not a string", { contactDetails: 8012345678 }],
    ["an unknown field is sent", { contactDetails: "08012345678", extra: "x" }],
  ])("rejects the request when %s", async (_label, body) => {
    const scout = await createUser({ userType: "scout" });

    const res = await api().post("/api/scouts").set("Authorization", bearer(scout.token)).send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Please check your scout details:");
    expect(await scoutRow(scout.id)).toBeNull();
  });
});

describe("GET /api/scouts/:scoutId", () => {
  it("returns the scout's user record and contact details", async () => {
    const viewer = await createUser({ userType: "player" });
    const scout = await createUser({ userType: "scout", name: "Scout Two" });
    await createScoutProfile(scout, "08077777777");

    const res = await api().get(`/api/scouts/${scout.id}`).set("Authorization", bearer(viewer.token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      scout: {
        user_scout: { user_id: scout.id, name: "Scout Two", email: scout.email, user_type: "scout" },
        scoutDetails: "08077777777",
      },
    });
  });

  it("answers 404 for a scout that does not exist", async () => {
    const viewer = await createUser({ userType: "player" });

    const res = await api().get(`/api/scouts/${randomId()}`).set("Authorization", bearer(viewer.token));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Scout not found" });
  });

  it("answers 404 for a scout user who never created a profile", async () => {
    const viewer = await createUser({ userType: "player" });
    const scout = await createUser({ userType: "scout" });

    const res = await api().get(`/api/scouts/${scout.id}`).set("Authorization", bearer(viewer.token));

    expect(res.status).toBe(404);
  });

  it("requires an access token", async () => {
    const res = await api().get(`/api/scouts/${randomId()}`);

    expect(res.status).toBe(401);
  });

  it("answers 400 for an id that is not a UUID", async () => {
    const viewer = await createUser({ userType: "player" });

    const res = await api().get("/api/scouts/not-a-uuid").set("Authorization", bearer(viewer.token));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Invalid scoutId: must be a valid UUID" });
  });
});

describe("PUT /api/scouts/:scoutId", () => {
  it("lets a scout update their own contact details", async () => {
    const scout = await createUser({ userType: "scout" });
    await createScoutProfile(scout, "08000000000");

    const res = await api()
      .put(`/api/scouts/${scout.id}`)
      .set("Authorization", bearer(scout.token))
      .send({ contactDetails: "09011112222" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "success",
      scout: { scout_id: scout.id, contact_details: "09011112222" },
    });
    expect((await scoutRow(scout.id))?.contact_details).toBe("09011112222");
  });

  it("lets an admin update any scout", async () => {
    const admin = await createAdmin();
    const scout = await createUser({ userType: "scout" });
    await createScoutProfile(scout);

    const res = await api()
      .put(`/api/scouts/${scout.id}`)
      .set("Authorization", bearer(admin.token))
      .send({ contactDetails: "09011112222" });

    expect(res.status).toBe(200);
    expect((await scoutRow(scout.id))?.contact_details).toBe("09011112222");
  });

  it("forbids updating another scout's profile", async () => {
    const scout = await createUser({ userType: "scout" });
    const other = await createUser({ userType: "scout" });
    await createScoutProfile(other, "08000000000");

    const res = await api()
      .put(`/api/scouts/${other.id}`)
      .set("Authorization", bearer(scout.token))
      .send({ contactDetails: "09011112222" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "You can only update your own scout profile" });
    expect((await scoutRow(other.id))?.contact_details).toBe("08000000000");
  });

  it("answers 404 when the profile does not exist", async () => {
    const admin = await createAdmin();

    const res = await api()
      .put(`/api/scouts/${randomId()}`)
      .set("Authorization", bearer(admin.token))
      .send({ contactDetails: "09011112222" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Scout profile not found" });
  });

  it("answers 400 for an id that is not a UUID", async () => {
    const scout = await createUser({ userType: "scout" });

    const res = await api()
      .put("/api/scouts/not-a-uuid")
      .set("Authorization", bearer(scout.token))
      .send({ contactDetails: "09011112222" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Invalid scoutId: must be a valid UUID" });
  });

  it("requires an access token", async () => {
    const res = await api().put(`/api/scouts/${randomId()}`).send({ contactDetails: "09011112222" });

    expect(res.status).toBe(401);
  });

  it.each([
    ["contact details are missing", {}],
    ["contact details are too short", { contactDetails: "123" }],
    ["an unknown field is sent", { contactDetails: "09011112222", extra: 1 }],
  ])("rejects the request when %s", async (_label, body) => {
    const scout = await createUser({ userType: "scout" });
    await createScoutProfile(scout, "08000000000");

    const res = await api()
      .put(`/api/scouts/${scout.id}`)
      .set("Authorization", bearer(scout.token))
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Please check your scout details:");
    expect((await scoutRow(scout.id))?.contact_details).toBe("08000000000");
  });
});

describe("DELETE /api/scouts/:scoutId", () => {
  it("lets a scout delete their own profile and keeps the user", async () => {
    const scout = await createUser({ userType: "scout" });
    await createScoutProfile(scout);

    const res = await api().delete(`/api/scouts/${scout.id}`).set("Authorization", bearer(scout.token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "success", message: "Scout profile deleted successfully" });
    expect(await scoutRow(scout.id)).toBeNull();
    const user = await prisma.users.findUnique({ where: { user_id: scout.id } });
    expect(user).not.toBeNull();
  });

  it("lets an admin delete a scout profile", async () => {
    const admin = await createAdmin();
    const scout = await createUser({ userType: "scout" });
    await createScoutProfile(scout);

    const res = await api().delete(`/api/scouts/${scout.id}`).set("Authorization", bearer(admin.token));

    expect(res.status).toBe(200);
    expect(await scoutRow(scout.id)).toBeNull();
  });

  it("forbids a player", async () => {
    const player = await createUser({ userType: "player" });
    const scout = await createUser({ userType: "scout" });
    await createScoutProfile(scout);

    const res = await api().delete(`/api/scouts/${scout.id}`).set("Authorization", bearer(player.token));

    expect(res.status).toBe(403);
    expect(await scoutRow(scout.id)).not.toBeNull();
  });

  it("answers 404 when an admin deletes a profile that does not exist", async () => {
    const admin = await createAdmin();

    const res = await api().delete(`/api/scouts/${randomId()}`).set("Authorization", bearer(admin.token));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Scout not found" });
  });

  it("requires an access token", async () => {
    const res = await api().delete(`/api/scouts/${randomId()}`);

    expect(res.status).toBe(401);
  });

  it("forbids a scout from deleting another scout's profile", async () => {
    const scout = await createUser({ userType: "scout" });
    const victim = await createUser({ userType: "scout" });
    await createScoutProfile(victim);

    const res = await api().delete(`/api/scouts/${victim.id}`).set("Authorization", bearer(scout.token));

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "You can only delete your own scout profile" });
    expect(await scoutRow(victim.id)).not.toBeNull();
  });

  it("answers 400 for an id that is not a UUID", async () => {
    const scout = await createUser({ userType: "scout" });

    const res = await api().delete("/api/scouts/not-a-uuid").set("Authorization", bearer(scout.token));

    expect(res.status).toBe(400);
  });
});