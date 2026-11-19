import { describe, expect, it } from "vitest";
import { pool } from "../../src/config/database.ts";
import { Redis } from "../../src/config/redis.ts";
import {
  PLAYERS_CACHE_KEY,
  api,
  bearer,
  createAdmin,
  createPlayerProfile,
  createUser,
  randomId,
  useIntegrationLifecycle,
} from "../helpers/integration.ts";

useIntegrationLifecycle();

const validProfile = {
  position: "fwd",
  ratings: 80,
  contactDetails: "08012345678",
};

const profileRow = async (playerId: string) => {
  const { rows } = await pool.query("SELECT * FROM players WHERE player_id = $1", [playerId]);
  return rows[0];
};

describe("GET /api/players", () => {
  it("requires an access token", async () => {
    const res = await api().get("/api/players");

    expect(res.status).toBe(401);
  });

  it("answers 404 when there are no players", async () => {
    const viewer = await createUser({ userType: "scout" });

    const res = await api().get("/api/players").set("Authorization", bearer(viewer.token));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "No players found" });
  });

  it("lists players with their name and email, best rated first, and caches the list", async () => {
    const viewer = await createUser({ userType: "scout" });
    const low = await createUser({ userType: "player", name: "Low Rated" });
    const high = await createUser({ userType: "player", name: "High Rated" });
    await createPlayerProfile(low, { ratings: 60, position: "def" });
    await createPlayerProfile(high, { ratings: 95, position: "fwd" });

    const res = await api().get("/api/players").set("Authorization", bearer(viewer.token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      player_id: high.id,
      name: "High Rated",
      email: high.email,
      position: "fwd",
      contact_details: "08012345678",
    });
    expect(Number(res.body[0].ratings)).toBe(95);
    expect(res.body[1]).toMatchObject({ player_id: low.id, name: "Low Rated" });

    const cached = await Redis.get(PLAYERS_CACHE_KEY);
    expect(JSON.parse(cached!)).toEqual(res.body);
    expect(await Redis.ttl(PLAYERS_CACHE_KEY)).toBeGreaterThan(0);
  });

  it("serves the list from the cache when it is there", async () => {
    const viewer = await createUser({ userType: "scout" });
    const cachedList = [{ player_id: randomId(), name: "From Cache" }];
    await Redis.set(PLAYERS_CACHE_KEY, JSON.stringify(cachedList));

    const res = await api().get("/api/players").set("Authorization", bearer(viewer.token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(cachedList);
  });
});

describe("POST /api/players", () => {
  it("creates the profile of the logged in player", async () => {
    const player = await createUser({ userType: "player", name: "Fresh Player" });

    const res = await api()
      .post("/api/players")
      .set("Authorization", bearer(player.token))
      .send(validProfile);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      player_id: player.id,
      position: "fwd",
      contact_details: "08012345678",
    });
    expect(Number(res.body.ratings)).toBe(80);
    const row = await profileRow(player.id);
    expect(row.position).toBe("fwd");
    expect(Number(row.ratings)).toBe(80);
  });

  it("invalidates the cached player list", async () => {
    const player = await createUser({ userType: "player" });
    await Redis.set(PLAYERS_CACHE_KEY, "[]");

    await api().post("/api/players").set("Authorization", bearer(player.token)).send(validProfile);

    expect(await Redis.exists(PLAYERS_CACHE_KEY)).toBe(0);
  });

  it("lets an admin account create a profile", async () => {
    const admin = await createAdmin();

    const res = await api()
      .post("/api/players")
      .set("Authorization", bearer(admin.token))
      .send(validProfile);

    expect(res.status).toBe(201);
    expect(res.body.player_id).toBe(admin.id);
  });

  it("forbids a scout", async () => {
    const scout = await createUser({ userType: "scout" });

    const res = await api().post("/api/players").set("Authorization", bearer(scout.token)).send(validProfile);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Only users registered as players can create a player profile" });
    expect(await profileRow(scout.id)).toBeUndefined();
  });

  it("answers 409 when the profile already exists and keeps the old one", async () => {
    const player = await createUser({ userType: "player" });
    await createPlayerProfile(player, { ratings: 70 });

    const res = await api().post("/api/players").set("Authorization", bearer(player.token)).send(validProfile);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: "Player profile already exists" });
    expect(Number((await profileRow(player.id)).ratings)).toBe(70);
  });

  it("requires an access token", async () => {
    const res = await api().post("/api/players").send(validProfile);

    expect(res.status).toBe(401);
  });

  it.each([
    ["position is missing", { position: undefined }, "Position"],
    ["position is unknown", { position: "striker" }, "Position"],
    ["ratings are missing", { ratings: undefined }, "Ratings"],
    ["ratings are below 49", { ratings: 48 }, "Ratings"],
    ["ratings are above 100", { ratings: 101 }, "Ratings"],
    ["ratings are not a whole number", { ratings: 80.5 }, "Ratings"],
    ["ratings are a string", { ratings: "80" }, "Ratings"],
    ["contact details are missing", { contactDetails: undefined }, "Contact Details"],
    ["contact details are shorter than 11 characters", { contactDetails: "0801234" }, "Contact Details"],
    ["contact details are longer than 30 characters", { contactDetails: "0".repeat(31) }, "Contact Details"],
    ["an unknown field is sent", { role: "admin" }, "Request body"],
  ])("rejects the request when %s", async (_label, change, field) => {
    const player = await createUser({ userType: "player" });

    const res = await api()
      .post("/api/players")
      .set("Authorization", bearer(player.token))
      .send({ ...validProfile, ...change });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Please check your player details:");
    expect(res.body.message).toContain(field);
    expect(await profileRow(player.id)).toBeUndefined();
  });
});

describe("GET /api/players/name", () => {
  it("finds a player by part of the name, ignoring case", async () => {
    const viewer = await createUser({ userType: "scout" });
    const player = await createUser({ userType: "player", name: "Zinedine Zidane" });
    await createPlayerProfile(player, { position: "mid" });

    const res = await api()
      .get("/api/players/name")
      .query({ name: "dine zid" })
      .set("Authorization", bearer(viewer.token));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      player_id: player.id,
      name: "Zinedine Zidane",
      email: player.email,
      position: "mid",
    });
  });

  it("requires the name query", async () => {
    const viewer = await createUser({ userType: "scout" });

    const res = await api().get("/api/players/name").set("Authorization", bearer(viewer.token));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Name query parameter is required" });
  });

  it("answers 404 when nobody matches", async () => {
    const viewer = await createUser({ userType: "scout" });

    const res = await api()
      .get("/api/players/name")
      .query({ name: "Nobody Atall" })
      .set("Authorization", bearer(viewer.token));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Player not found" });
  });

  it("answers 404 for a matching user that has no player profile", async () => {
    const viewer = await createUser({ userType: "scout" });
    await createUser({ userType: "player", name: "Profileless Pat" });

    const res = await api()
      .get("/api/players/name")
      .query({ name: "Profileless" })
      .set("Authorization", bearer(viewer.token));

    expect(res.status).toBe(404);
  });

  it("requires an access token", async () => {
    const res = await api().get("/api/players/name").query({ name: "x" });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/players/position", () => {
  it("lists the players of a position, best rated first", async () => {
    const viewer = await createUser({ userType: "scout" });
    const keeperA = await createUser({ userType: "player", name: "Keeper A" });
    const keeperB = await createUser({ userType: "player", name: "Keeper B" });
    const striker = await createUser({ userType: "player", name: "Striker" });
    await createPlayerProfile(keeperA, { position: "gk", ratings: 70 });
    await createPlayerProfile(keeperB, { position: "gk", ratings: 90 });
    await createPlayerProfile(striker, { position: "fwd", ratings: 99 });

    const res = await api()
      .get("/api/players/position")
      .query({ position: "gk" })
      .set("Authorization", bearer(viewer.token));

    expect(res.status).toBe(200);
    expect(res.body.map((p: { player_id: string }) => p.player_id)).toEqual([keeperB.id, keeperA.id]);
    expect(res.body[0]).toMatchObject({ name: "Keeper B", email: keeperB.email, position: "gk" });
  });

  it("requires the position query", async () => {
    const viewer = await createUser({ userType: "scout" });

    const res = await api().get("/api/players/position").set("Authorization", bearer(viewer.token));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Position query parameter is required" });
  });

  it.each(["def", "unknown"])("answers 404 when no player plays '%s'", async (position) => {
    const viewer = await createUser({ userType: "scout" });

    const res = await api()
      .get("/api/players/position")
      .query({ position })
      .set("Authorization", bearer(viewer.token));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "No players found for the specified position" });
  });

  it("requires an access token", async () => {
    const res = await api().get("/api/players/position").query({ position: "gk" });

    expect(res.status).toBe(401);
  });
});

describe("PUT /api/players", () => {
  it("updates only the fields that were sent", async () => {
    const player = await createUser({ userType: "player" });
    await createPlayerProfile(player, { position: "fwd", ratings: 70, contactDetails: "08011111111" });

    const res = await api()
      .put("/api/players")
      .set("Authorization", bearer(player.token))
      .send({ ratings: 90 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ player_id: player.id, position: "fwd", contact_details: "08011111111" });
    expect(Number(res.body.ratings)).toBe(90);
    const row = await profileRow(player.id);
    expect(Number(row.ratings)).toBe(90);
    expect(row.position).toBe("fwd");
  });

  it("updates every field at once", async () => {
    const player = await createUser({ userType: "player" });
    await createPlayerProfile(player);

    const res = await api()
      .put("/api/players")
      .set("Authorization", bearer(player.token))
      .send({ position: "gk", ratings: 55, contactDetails: "09022222222" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ position: "gk", contact_details: "09022222222" });
    expect(Number(res.body.ratings)).toBe(55);
  });

  it("only ever changes the profile of the caller", async () => {
    const player = await createUser({ userType: "player" });
    const other = await createUser({ userType: "player" });
    await createPlayerProfile(player, { ratings: 70 });
    await createPlayerProfile(other, { ratings: 60 });

    await api().put("/api/players").set("Authorization", bearer(player.token)).send({ ratings: 99 });

    expect(Number((await profileRow(other.id)).ratings)).toBe(60);
  });

  it("returns the unchanged profile for an empty body", async () => {
    const player = await createUser({ userType: "player" });
    await createPlayerProfile(player, { ratings: 70 });

    const res = await api().put("/api/players").set("Authorization", bearer(player.token)).send({});

    expect(res.status).toBe(200);
    expect(Number(res.body.ratings)).toBe(70);
  });

  it("invalidates the cached player list", async () => {
    const player = await createUser({ userType: "player" });
    await createPlayerProfile(player);
    await Redis.set(PLAYERS_CACHE_KEY, "[]");

    await api().put("/api/players").set("Authorization", bearer(player.token)).send({ ratings: 90 });

    expect(await Redis.exists(PLAYERS_CACHE_KEY)).toBe(0);
  });

  it("answers 404 when the caller has no player profile", async () => {
    const player = await createUser({ userType: "player" });

    const res = await api().put("/api/players").set("Authorization", bearer(player.token)).send({ ratings: 90 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Player not found" });
  });

  it("requires an access token", async () => {
    const res = await api().put("/api/players").send({ ratings: 90 });

    expect(res.status).toBe(401);
  });

  it.each([
    ["position is unknown", { position: "striker" }],
    ["ratings are below 49", { ratings: 10 }],
    ["ratings are above 100", { ratings: 150 }],
    ["contact details are too short", { contactDetails: "123" }],
    ["an unknown field is sent", { name: "Hacker" }],
  ])("rejects the request when %s", async (_label, body) => {
    const player = await createUser({ userType: "player" });
    await createPlayerProfile(player, { ratings: 70 });

    const res = await api().put("/api/players").set("Authorization", bearer(player.token)).send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Please check your player update details:");
    expect(Number((await profileRow(player.id)).ratings)).toBe(70);
  });
});

describe("DELETE /api/players", () => {
  it("lets a player delete their own profile", async () => {
    const player = await createUser({ userType: "player" });
    await createPlayerProfile(player);

    const res = await api().delete("/api/players").set("Authorization", bearer(player.token));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Player profile deleted successfully");
    expect(res.body.data.player_id).toBe(player.id);
    expect(await profileRow(player.id)).toBeUndefined();
    const { rowCount } = await pool.query("SELECT 1 FROM users WHERE user_id = $1", [player.id]);
    expect(rowCount).toBe(1);
  });

  it("invalidates the cached player list", async () => {
    const player = await createUser({ userType: "player" });
    await createPlayerProfile(player);
    await Redis.set(PLAYERS_CACHE_KEY, "[]");

    await api().delete("/api/players").set("Authorization", bearer(player.token));

    expect(await Redis.exists(PLAYERS_CACHE_KEY)).toBe(0);
  });

  it("ignores a playerId sent by a player and deletes only their own profile", async () => {
    const player = await createUser({ userType: "player" });
    const other = await createUser({ userType: "player" });
    await createPlayerProfile(player);
    await createPlayerProfile(other);

    const res = await api()
      .delete("/api/players")
      .query({ playerId: other.id })
      .set("Authorization", bearer(player.token));

    expect(res.status).toBe(200);
    expect(res.body.data.player_id).toBe(player.id);
    expect(await profileRow(other.id)).toBeDefined();
  });

  it("answers 404 when the player has no profile", async () => {
    const player = await createUser({ userType: "player" });

    const res = await api().delete("/api/players").set("Authorization", bearer(player.token));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Player profile not found" });
  });

  it("lets an admin delete any profile through the playerId query", async () => {
    const admin = await createAdmin();
    const player = await createUser({ userType: "player" });
    await createPlayerProfile(player);

    const res = await api()
      .delete("/api/players")
      .query({ playerId: player.id })
      .set("Authorization", bearer(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.data.player_id).toBe(player.id);
    expect(await profileRow(player.id)).toBeUndefined();
  });

  it("lets an admin delete any profile through the playerId body field", async () => {
    const admin = await createAdmin();
    const player = await createUser({ userType: "player" });
    await createPlayerProfile(player);

    const res = await api()
      .delete("/api/players")
      .set("Authorization", bearer(admin.token))
      .send({ playerId: player.id });

    expect(res.status).toBe(200);
    expect(await profileRow(player.id)).toBeUndefined();
  });

  it("answers 404 for an admin who names a player without a profile", async () => {
    const admin = await createAdmin();

    const res = await api()
      .delete("/api/players")
      .query({ playerId: randomId() })
      .set("Authorization", bearer(admin.token));

    expect(res.status).toBe(404);
  });

  it("forbids a scout", async () => {
    const scout = await createUser({ userType: "scout" });

    const res = await api().delete("/api/players").set("Authorization", bearer(scout.token));

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "You are not authorized to access this resource" });
  });

  it("requires an access token", async () => {
    const res = await api().delete("/api/players");

    expect(res.status).toBe(401);
  });

  it("answers 400 when an admin sends a playerId that is not a UUID", async () => {
    const admin = await createAdmin();

    const res = await api()
      .delete("/api/players")
      .query({ playerId: "not-a-uuid" })
      .set("Authorization", bearer(admin.token));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Invalid playerId: must be a valid UUID" });
  });
});