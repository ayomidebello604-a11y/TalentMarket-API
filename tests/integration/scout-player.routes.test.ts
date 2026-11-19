import { describe, expect, it } from "vitest";
import { pool } from "../../src/config/database.ts";
import {
  api,
  bearer,
  createAdmin,
  createPlayerProfile,
  createScoutProfile,
  createUser,
  linkScoutToPlayer,
  randomId,
  useIntegrationLifecycle,
} from "../helpers/integration.ts";

useIntegrationLifecycle();

const linkCount = async (scoutId: string, playerId: string): Promise<number> => {
  const { rowCount } = await pool.query(
    "SELECT 1 FROM scout_players WHERE scout_id = $1 AND player_id = $2",
    [scoutId, playerId],
  );
  return rowCount ?? 0;
};

/** A scout with a scout profile and a player with a player profile. */
const scoutAndPlayer = async () => {
  const scout = await createUser({ userType: "scout" });
  const player = await createUser({ userType: "player" });
  await createScoutProfile(scout);
  await createPlayerProfile(player);
  return { scout, player };
};

describe("GET /api/scout-players", () => {
  it("lists the players the scout tracks", async () => {
    const { scout, player } = await scoutAndPlayer();
    await linkScoutToPlayer(scout, player);

    const res = await api().get("/api/scout-players").set("Authorization", bearer(scout.token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ players: [{ player_id: player.id }] });
  });

  it("only lists the caller's own players", async () => {
    const { scout, player } = await scoutAndPlayer();
    const otherScout = await createUser({ userType: "scout" });
    await createScoutProfile(otherScout);
    await linkScoutToPlayer(otherScout, player);

    const res = await api().get("/api/scout-players").set("Authorization", bearer(scout.token));

    expect(res.status).toBe(404);
  });

  it("answers 404 when the scout tracks nobody", async () => {
    const scout = await createUser({ userType: "scout" });

    const res = await api().get("/api/scout-players").set("Authorization", bearer(scout.token));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "No players found for this scout" });
  });

  it("requires an access token", async () => {
    const res = await api().get("/api/scout-players");

    expect(res.status).toBe(401);
  });
});

describe("POST /api/scout-players/:playerId", () => {
  it("adds the player to the scout's list", async () => {
    const { scout, player } = await scoutAndPlayer();

    const res = await api().post(`/api/scout-players/${player.id}`).set("Authorization", bearer(scout.token));

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      message: "Player scouted successfully",
      scoutingDetails: { scout_id: scout.id, player_id: player.id },
    });
    expect(await linkCount(scout.id, player.id)).toBe(1);
  });

  it("answers 409 when the player is already tracked and adds no second link", async () => {
    const { scout, player } = await scoutAndPlayer();
    await linkScoutToPlayer(scout, player);

    const res = await api().post(`/api/scout-players/${player.id}`).set("Authorization", bearer(scout.token));

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: "You are already scouting this player" });
    expect(await linkCount(scout.id, player.id)).toBe(1);
  });

  it("answers 404 when the caller is not a scout", async () => {
    const { player } = await scoutAndPlayer();
    const otherPlayer = await createUser({ userType: "player" });

    const res = await api().post(`/api/scout-players/${player.id}`).set("Authorization", bearer(otherPlayer.token));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Scout not found or user is not a scout" });
  });

  it("answers 404 when the target does not exist", async () => {
    const scout = await createUser({ userType: "scout" });

    const res = await api().post(`/api/scout-players/${randomId()}`).set("Authorization", bearer(scout.token));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Player not found or user is not a player" });
  });

  it("answers 404 when the target is a scout, not a player", async () => {
    const scout = await createUser({ userType: "scout" });
    const otherScout = await createUser({ userType: "scout" });

    const res = await api().post(`/api/scout-players/${otherScout.id}`).set("Authorization", bearer(scout.token));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Player not found or user is not a player" });
  });

  it("answers 404 when the player has not created a profile yet", async () => {
    const scout = await createUser({ userType: "scout" });
    const player = await createUser({ userType: "player" });

    const res = await api().post(`/api/scout-players/${player.id}`).set("Authorization", bearer(scout.token));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Player profile not found" });
  });

  it("requires an access token", async () => {
    const res = await api().post(`/api/scout-players/${randomId()}`);

    expect(res.status).toBe(401);
  });

  it("answers 404 when the scout has not created a scout profile", async () => {
    const scout = await createUser({ userType: "scout" });
    const player = await createUser({ userType: "player" });
    await createPlayerProfile(player);

    const res = await api().post(`/api/scout-players/${player.id}`).set("Authorization", bearer(scout.token));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Scout profile not found. Create your scout profile first" });
    expect(await linkCount(scout.id, player.id)).toBe(0);
  });

  it.each([
    ["POST", "/api/scout-players/not-a-uuid"],
    ["GET", "/api/scout-players/not-a-uuid/scouts"],
    ["DELETE", "/api/scout-players/not-a-uuid"],
  ] as const)("answers 400 for a playerId that is not a UUID on %s %s", async (method, url) => {
    const scout = await createUser({ userType: "scout" });

    const res = await api()[method.toLowerCase() as "post" | "get" | "delete"](url).set(
      "Authorization",
      bearer(scout.token),
    );

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Invalid playerId: must be a valid UUID" });
  });
});

describe("GET /api/scout-players/:playerId/scouts", () => {
  it("lists the scouts tracking a player", async () => {
    const { scout, player } = await scoutAndPlayer();
    await linkScoutToPlayer(scout, player);

    const res = await api().get(`/api/scout-players/${player.id}/scouts`).set("Authorization", bearer(player.token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ scouts: [{ scout_id: scout.id }] });
  });

  it("answers 404 when no scout tracks the player", async () => {
    const { scout, player } = await scoutAndPlayer();

    const res = await api().get(`/api/scout-players/${player.id}/scouts`).set("Authorization", bearer(scout.token));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "No scouts found for this player" });
  });

  it("requires an access token", async () => {
    const res = await api().get(`/api/scout-players/${randomId()}/scouts`);

    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/scout-players/:playerId", () => {
  it("removes the player from the scout's list", async () => {
    const { scout, player } = await scoutAndPlayer();
    await linkScoutToPlayer(scout, player);

    const res = await api().delete(`/api/scout-players/${player.id}`).set("Authorization", bearer(scout.token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: "Player removed from scout's list",
      result: { scout_id: scout.id, player_id: player.id },
    });
    expect(await linkCount(scout.id, player.id)).toBe(0);
  });

  it("does not touch the links of other scouts", async () => {
    const { scout, player } = await scoutAndPlayer();
    const otherScout = await createUser({ userType: "scout" });
    await createScoutProfile(otherScout);
    await linkScoutToPlayer(scout, player);
    await linkScoutToPlayer(otherScout, player);

    await api().delete(`/api/scout-players/${player.id}`).set("Authorization", bearer(scout.token));

    expect(await linkCount(otherScout.id, player.id)).toBe(1);
  });

  it("keeps the scout's links to other players", async () => {
    const { scout, player } = await scoutAndPlayer();
    const otherPlayer = await createUser({ userType: "player" });
    await createPlayerProfile(otherPlayer);
    await linkScoutToPlayer(scout, player);
    await linkScoutToPlayer(scout, otherPlayer);

    await api().delete(`/api/scout-players/${player.id}`).set("Authorization", bearer(scout.token));

    expect(await linkCount(scout.id, otherPlayer.id)).toBe(1);
  });

  it("answers 404 when the player is not in the scout's list", async () => {
    const { scout, player } = await scoutAndPlayer();

    const res = await api().delete(`/api/scout-players/${player.id}`).set("Authorization", bearer(scout.token));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Player not found in scout's list" });
  });

  it("answers 404 when the target is not a player", async () => {
    const scout = await createUser({ userType: "scout" });
    const otherScout = await createUser({ userType: "scout" });

    const res = await api().delete(`/api/scout-players/${otherScout.id}`).set("Authorization", bearer(scout.token));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Player not found or user is not a player" });
  });

  it("forbids a player at the route level", async () => {
    const { player } = await scoutAndPlayer();

    const res = await api().delete(`/api/scout-players/${player.id}`).set("Authorization", bearer(player.token));

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "You are not authorized to access this resource" });
  });

  it("lets an admin pass the route check but the service rejects a non-scout with 403", async () => {
    const { player } = await scoutAndPlayer();
    const admin = await createAdmin();

    const res = await api().delete(`/api/scout-players/${player.id}`).set("Authorization", bearer(admin.token));

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Scout not found or user is not a scout" });
  });

  it("requires an access token", async () => {
    const res = await api().delete(`/api/scout-players/${randomId()}`);

    expect(res.status).toBe(401);
  });
});