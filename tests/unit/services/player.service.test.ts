import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPlayerProfile,
  deletePlayerProfile,
  getAllProfile,
  getPlayerProfileById,
  getPlayerProfileByName,
  getPlayersByPosition,
  updatePlayerProfile,
} from "../../../src/repositories/player.repository.ts";
import type { PlayerProfileReturnType } from "../../../src/repositories/player.repository.ts";
import {
  createPlayerProfileService,
  deletePlayerProfileService,
  getAllPlayersService,
  getPlayerByIdService,
  getPlayerByNameService,
  getPlayersByPositionService,
  updatePlayerProfileService,
} from "../../../src/services/player.service.ts";
import { invalidateCache } from "../../../src/utils/invalidatecache.utils.ts";

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  setEx: vi.fn(),
  withAbortSignal: vi.fn(),
}));

// Redis, the cache invalidation helper and the repository are the boundaries.
vi.mock("../../../src/config/redis.ts", () => ({
  Redis: { withAbortSignal: redisMock.withAbortSignal },
}));
vi.mock(import("../../../src/utils/invalidatecache.utils.ts"), () => ({
  invalidateCache: vi.fn(),
}));
vi.mock(import("../../../src/repositories/player.repository.ts"), () => ({
  getAllProfile: vi.fn(),
  createPlayerProfile: vi.fn(),
  getPlayerProfileById: vi.fn(),
  getPlayerProfileByName: vi.fn(),
  getPlayersByPosition: vi.fn(),
  updatePlayerProfile: vi.fn(),
  deletePlayerProfile: vi.fn(),
}));

const CACHE_KEY = "talentmarket:players:all";
const PLAYER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const OTHER_PLAYER_ID = "0b8f4d2a-3c1e-4f6a-9d7b-5e2a1c8f3b4d";

const makePlayer = (
  overrides: Partial<PlayerProfileReturnType> = {},
): PlayerProfileReturnType => ({
  player_id: PLAYER_ID,
  position: "fwd",
  ratings: 80,
  contact_details: "08012345678",
  name: "Test Player",
  email: "player@example.com",
  ...overrides,
});

const createInput = {
  position: "fwd",
  ratings: 80,
  contactDetails: "08012345678",
} as const;

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  redisMock.withAbortSignal.mockReturnValue({
    get: redisMock.get,
    setEx: redisMock.setEx,
  });
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getAllPlayersService", () => {
  const players = [
    makePlayer({ ratings: 90 }),
    makePlayer({ player_id: OTHER_PLAYER_ID, ratings: 70, name: "Other Player" }),
  ];

  it("returns cached players without querying the database", async () => {
    redisMock.get.mockResolvedValue(JSON.stringify(players));

    const result = await getAllPlayersService();

    expect(result).toEqual(players);
    expect(redisMock.get).toHaveBeenCalledWith(CACHE_KEY);
    expect(redisMock.withAbortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(getAllProfile).not.toHaveBeenCalled();
    expect(redisMock.setEx).not.toHaveBeenCalled();
  });

  it("loads from the database on a cache miss and caches the list for an hour", async () => {
    redisMock.get.mockResolvedValue(null);
    vi.mocked(getAllProfile).mockResolvedValue(players);

    const result = await getAllPlayersService();

    expect(result).toEqual(players);
    expect(getAllProfile).toHaveBeenCalledOnce();
    expect(redisMock.setEx).toHaveBeenCalledWith(
      CACHE_KEY,
      3600,
      JSON.stringify(players),
    );
  });

  it("falls back to the database when the cache read fails", async () => {
    redisMock.get.mockRejectedValue(new Error("redis down"));
    vi.mocked(getAllProfile).mockResolvedValue(players);

    const result = await getAllPlayersService();

    expect(result).toEqual(players);
    expect(getAllProfile).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalled();
  });

  it("still returns the players when the cache write fails", async () => {
    redisMock.get.mockResolvedValue(null);
    redisMock.setEx.mockRejectedValue(new Error("redis down"));
    vi.mocked(getAllProfile).mockResolvedValue(players);

    const result = await getAllPlayersService();

    expect(result).toEqual(players);
    expect(consoleError).toHaveBeenCalledOnce();
  });

  it("caches nothing when the database query fails", async () => {
    const failure = new Error("connection lost");
    redisMock.get.mockResolvedValue(null);
    vi.mocked(getAllProfile).mockRejectedValue(failure);

    await expect(getAllPlayersService()).rejects.toBe(failure);
    expect(redisMock.setEx).not.toHaveBeenCalled();
  });
});

describe("createPlayerProfileService", () => {
  it("creates the profile and invalidates the cached list", async () => {
    const created = makePlayer();
    vi.mocked(createPlayerProfile).mockResolvedValue(created);

    const result = await createPlayerProfileService(PLAYER_ID, createInput);

    expect(result).toEqual(created);
    expect(createPlayerProfile).toHaveBeenCalledWith(PLAYER_ID, createInput);
    expect(invalidateCache).toHaveBeenCalledExactlyOnceWith(CACHE_KEY);
  });

  it("passes a duplicate profile error through and keeps the cache", async () => {
    const duplicate = Object.assign(
      new Error('duplicate key value violates unique constraint "players_pkey"'),
      { code: "23505" },
    );
    vi.mocked(createPlayerProfile).mockRejectedValue(duplicate);

    await expect(createPlayerProfileService(PLAYER_ID, createInput)).rejects.toBe(
      duplicate,
    );
    expect(invalidateCache).not.toHaveBeenCalled();
  });
});

describe("player lookups", () => {
  it("gets a profile by id", async () => {
    const player = makePlayer();
    vi.mocked(getPlayerProfileById).mockResolvedValue(player);

    await expect(getPlayerByIdService(PLAYER_ID)).resolves.toEqual(player);
    expect(getPlayerProfileById).toHaveBeenCalledWith(PLAYER_ID);
  });

  it("returns null when no profile has that id", async () => {
    vi.mocked(getPlayerProfileById).mockResolvedValue(null);

    await expect(getPlayerByIdService(PLAYER_ID)).resolves.toBeNull();
  });

  it("searches profiles by name", async () => {
    const player = makePlayer();
    vi.mocked(getPlayerProfileByName).mockResolvedValue(player);

    await expect(getPlayerByNameService("Test")).resolves.toEqual(player);
    expect(getPlayerProfileByName).toHaveBeenCalledWith("Test");
  });

  it("lists profiles by position", async () => {
    const forwards = [makePlayer(), makePlayer({ player_id: OTHER_PLAYER_ID })];
    vi.mocked(getPlayersByPosition).mockResolvedValue(forwards);

    await expect(getPlayersByPositionService("fwd")).resolves.toEqual(forwards);
    expect(getPlayersByPosition).toHaveBeenCalledWith("fwd");
  });
});

describe("updatePlayerProfileService", () => {
  it("updates the profile and invalidates the cached list", async () => {
    const updated = makePlayer({ ratings: 90 });
    vi.mocked(updatePlayerProfile).mockResolvedValue(updated);

    const result = await updatePlayerProfileService({ ratings: 90 }, PLAYER_ID);

    expect(result).toEqual(updated);
    expect(updatePlayerProfile).toHaveBeenCalledWith({ ratings: 90 }, PLAYER_ID);
    expect(invalidateCache).toHaveBeenCalledExactlyOnceWith(CACHE_KEY);
  });

  it("returns null and keeps the cache when the player does not exist", async () => {
    vi.mocked(updatePlayerProfile).mockResolvedValue(null);

    const result = await updatePlayerProfileService({ ratings: 90 }, PLAYER_ID);

    expect(result).toBeNull();
    expect(invalidateCache).not.toHaveBeenCalled();
  });

  it("propagates a database failure and keeps the cache", async () => {
    const failure = new Error("connection lost");
    vi.mocked(updatePlayerProfile).mockRejectedValue(failure);

    await expect(
      updatePlayerProfileService({ ratings: 90 }, PLAYER_ID),
    ).rejects.toBe(failure);
    expect(invalidateCache).not.toHaveBeenCalled();
  });
});

describe("deletePlayerProfileService", () => {
  it("deletes the profile and invalidates the cached list", async () => {
    const deleted = makePlayer();
    vi.mocked(deletePlayerProfile).mockResolvedValue(deleted);

    const result = await deletePlayerProfileService("player", PLAYER_ID, PLAYER_ID);

    expect(result).toEqual(deleted);
    expect(deletePlayerProfile).toHaveBeenCalledWith("player", PLAYER_ID, PLAYER_ID);
    expect(invalidateCache).toHaveBeenCalledExactlyOnceWith(CACHE_KEY);
  });

  it("returns null and keeps the cache when nothing was deleted", async () => {
    vi.mocked(deletePlayerProfile).mockResolvedValue(null);

    const result = await deletePlayerProfileService("player", OTHER_PLAYER_ID, PLAYER_ID);

    expect(result).toBeNull();
    expect(invalidateCache).not.toHaveBeenCalled();
  });

  it("propagates a database failure and keeps the cache", async () => {
    const failure = new Error("connection lost");
    vi.mocked(deletePlayerProfile).mockRejectedValue(failure);

    await expect(
      deletePlayerProfileService("admin", PLAYER_ID),
    ).rejects.toBe(failure);
    expect(invalidateCache).not.toHaveBeenCalled();
  });
});