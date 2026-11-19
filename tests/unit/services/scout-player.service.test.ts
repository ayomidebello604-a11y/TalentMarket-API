import { beforeEach, describe, expect, it, vi } from "vitest";
import { findUserById } from "../../../src/repositories/auth.repository.ts";
import { getPlayerProfileById } from "../../../src/repositories/player.repository.ts";
import {
  addPlayerToScout,
  getAllScoutPlayers,
  getAllScoutsForPlayer,
  removePlayerFromScout,
} from "../../../src/repositories/scout-player.repository.ts";
import {
  deletePlayerFromScoutService,
  getScoutedPlayersService,
  getScoutsForPlayerService,
  scoutPlayerService,
} from "../../../src/services/scout-player.service.ts";

vi.mock(import("../../../src/repositories/auth.repository.ts"), () => ({
  findUserById: vi.fn(),
}));
vi.mock(import("../../../src/repositories/player.repository.ts"), () => ({
  getPlayerProfileById: vi.fn(),
}));
vi.mock(import("../../../src/repositories/scout-player.repository.ts"), () => ({
  addPlayerToScout: vi.fn(),
  getAllScoutPlayers: vi.fn(),
  getAllScoutsForPlayer: vi.fn(),
  removePlayerFromScout: vi.fn(),
}));

const SCOUT_ID = "3f2b8c1e-5a4d-4e7f-8b9c-1d2e3f4a5b6c";
const PLAYER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const OTHER_PLAYER_ID = "0b8f4d2a-3c1e-4f6a-9d7b-5e2a1c8f3b4d";

type RepoUser = Awaited<ReturnType<typeof findUserById>>;

const scoutUser: RepoUser = {
  user_id: SCOUT_ID,
  name: "Test Scout",
  email: "scout@example.com",
  user_type: "scout",
};
const playerUser: RepoUser = {
  user_id: PLAYER_ID,
  name: "Test Player",
  email: "player@example.com",
  user_type: "player",
};

// findUserById returns rows[0], which is undefined for an unknown id even
// though the repository declares the user as always present.
const noUser = undefined as unknown as RepoUser;

const playerProfile = {
  player_id: PLAYER_ID,
  position: "fwd",
  ratings: 80,
  contact_details: "08012345678",
};

// Answers findUserById by id so the tests do not depend on call order.
const givenUsers = (...users: [string, RepoUser][]): void => {
  const byId = new Map(users);
  vi.mocked(findUserById).mockImplementation(
    async (id) => byId.get(id) ?? noUser,
  );
};

beforeEach(() => {
  givenUsers([SCOUT_ID, scoutUser], [PLAYER_ID, playerUser]);
});

describe("getScoutedPlayersService", () => {
  it("returns the players a scout is tracking", async () => {
    const tracked = [{ player_id: PLAYER_ID }, { player_id: OTHER_PLAYER_ID }];
    vi.mocked(getAllScoutPlayers).mockResolvedValue(tracked);

    await expect(getScoutedPlayersService(SCOUT_ID)).resolves.toEqual(tracked);
    expect(getAllScoutPlayers).toHaveBeenCalledWith(SCOUT_ID);
  });

  it("fails with 404 when the scout tracks no players", async () => {
    vi.mocked(getAllScoutPlayers).mockResolvedValue([]);

    await expect(getScoutedPlayersService(SCOUT_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "No players found for this scout",
    });
  });
});

describe("scoutPlayerService", () => {
  it("adds the player to the scout's list", async () => {
    const link = { scout_id: SCOUT_ID, player_id: PLAYER_ID };
    vi.mocked(getPlayerProfileById).mockResolvedValue(playerProfile);
    vi.mocked(addPlayerToScout).mockResolvedValue(link);

    const result = await scoutPlayerService(SCOUT_ID, PLAYER_ID);

    expect(result).toEqual(link);
    expect(getPlayerProfileById).toHaveBeenCalledWith(PLAYER_ID);
    expect(addPlayerToScout).toHaveBeenCalledWith(SCOUT_ID, PLAYER_ID);
  });

  it("rejects a scout id that does not exist", async () => {
    givenUsers([PLAYER_ID, playerUser]);

    await expect(scoutPlayerService(SCOUT_ID, PLAYER_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "Scout not found or user is not a scout",
    });
    expect(addPlayerToScout).not.toHaveBeenCalled();
  });

  it("rejects a scout id that belongs to a player", async () => {
    givenUsers([SCOUT_ID, playerUser], [PLAYER_ID, playerUser]);

    await expect(scoutPlayerService(SCOUT_ID, PLAYER_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "Scout not found or user is not a scout",
    });
    expect(addPlayerToScout).not.toHaveBeenCalled();
  });

  it("rejects a player id that does not exist", async () => {
    givenUsers([SCOUT_ID, scoutUser]);

    await expect(scoutPlayerService(SCOUT_ID, PLAYER_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "Player not found or user is not a player",
    });
    expect(addPlayerToScout).not.toHaveBeenCalled();
  });

  it("rejects a player id that belongs to a scout", async () => {
    givenUsers([SCOUT_ID, scoutUser], [PLAYER_ID, scoutUser]);

    await expect(scoutPlayerService(SCOUT_ID, PLAYER_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "Player not found or user is not a player",
    });
    expect(addPlayerToScout).not.toHaveBeenCalled();
  });

  it("fails with 404 when the player has no profile yet", async () => {
    vi.mocked(getPlayerProfileById).mockResolvedValue(null);

    await expect(scoutPlayerService(SCOUT_ID, PLAYER_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "Player profile not found",
    });
    expect(addPlayerToScout).not.toHaveBeenCalled();
  });

  it("fails with 409 when the scout already tracks the player", async () => {
    vi.mocked(getPlayerProfileById).mockResolvedValue(playerProfile);
    // ON CONFLICT DO NOTHING returns no row for an existing pair.
    vi.mocked(addPlayerToScout).mockResolvedValue(undefined);

    await expect(scoutPlayerService(SCOUT_ID, PLAYER_ID)).rejects.toMatchObject({
      statusCode: 409,
      message: "You are already scouting this player",
    });
  });

  it("fails with 404 when the scout has no scout profile yet", async () => {
    vi.mocked(getPlayerProfileById).mockResolvedValue(playerProfile);
    const foreignKey = Object.assign(new Error("violates foreign key constraint"), {
      code: "23503",
    });
    vi.mocked(addPlayerToScout).mockRejectedValue(foreignKey);

    await expect(scoutPlayerService(SCOUT_ID, PLAYER_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "Scout profile not found. Create your scout profile first",
    });
  });

  it("propagates a database failure while adding", async () => {
    const failure = new Error("connection lost");
    vi.mocked(getPlayerProfileById).mockResolvedValue(playerProfile);
    vi.mocked(addPlayerToScout).mockRejectedValue(failure);

    await expect(scoutPlayerService(SCOUT_ID, PLAYER_ID)).rejects.toBe(failure);
  });
});

describe("getScoutsForPlayerService", () => {
  it("returns the scouts tracking a player", async () => {
    const scouts = [{ scout_id: SCOUT_ID }];
    vi.mocked(getAllScoutsForPlayer).mockResolvedValue(scouts);

    await expect(getScoutsForPlayerService(PLAYER_ID)).resolves.toEqual(scouts);
    expect(getAllScoutsForPlayer).toHaveBeenCalledWith(PLAYER_ID);
  });

  it("fails with 404 when no scout tracks the player", async () => {
    vi.mocked(getAllScoutsForPlayer).mockResolvedValue([]);

    await expect(getScoutsForPlayerService(PLAYER_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "No scouts found for this player",
    });
  });
});

describe("deletePlayerFromScoutService", () => {
  it("removes the player from the scout's list", async () => {
    vi.mocked(removePlayerFromScout).mockResolvedValue({ player_id: PLAYER_ID });

    const result = await deletePlayerFromScoutService(SCOUT_ID, PLAYER_ID);

    expect(result).toEqual({ player_id: PLAYER_ID });
    expect(removePlayerFromScout).toHaveBeenCalledWith(SCOUT_ID, PLAYER_ID);
  });

  it("rejects a caller who is not a scout with 403", async () => {
    givenUsers([SCOUT_ID, playerUser], [PLAYER_ID, playerUser]);

    await expect(deletePlayerFromScoutService(SCOUT_ID, PLAYER_ID)).rejects.toMatchObject({
      statusCode: 403,
      message: "Scout not found or user is not a scout",
    });
    expect(removePlayerFromScout).not.toHaveBeenCalled();
  });

  it("rejects a caller id that does not exist with 403", async () => {
    givenUsers([PLAYER_ID, playerUser]);

    await expect(deletePlayerFromScoutService(SCOUT_ID, PLAYER_ID)).rejects.toMatchObject({
      statusCode: 403,
      message: "Scout not found or user is not a scout",
    });
    expect(removePlayerFromScout).not.toHaveBeenCalled();
  });

  it("rejects a player id that is not a player with 404", async () => {
    givenUsers([SCOUT_ID, scoutUser], [PLAYER_ID, scoutUser]);

    await expect(deletePlayerFromScoutService(SCOUT_ID, PLAYER_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "Player not found or user is not a player",
    });
    expect(removePlayerFromScout).not.toHaveBeenCalled();
  });

  it("fails with 404 when the player is not in the scout's list", async () => {
    vi.mocked(removePlayerFromScout).mockResolvedValue(null);

    await expect(deletePlayerFromScoutService(SCOUT_ID, PLAYER_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "Player not found in scout's list",
    });
  });

  it("propagates a database failure while removing", async () => {
    const failure = new Error("connection lost");
    vi.mocked(removePlayerFromScout).mockRejectedValue(failure);

    await expect(deletePlayerFromScoutService(SCOUT_ID, PLAYER_ID)).rejects.toBe(failure);
  });
});