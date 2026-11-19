import { describe, expect, it, vi } from "vitest";
import { findUserById } from "../../../src/repositories/auth.repository.ts";
import {
  createScoutProfile,
  fetchAllScouts,
  fetchScoutById,
  removeScout,
  updateScout,
} from "../../../src/repositories/scout.prisma.repository.ts";
import type { createScoutReturnType } from "../../../src/repositories/scout.prisma.repository.ts";
import {
  createScoutService,
  deleteScoutService,
  getAllscoutsService,
  getScoutByIdService,
  updateScoutContactdetailsService,
} from "../../../src/services/scout.service.ts";

// The Prisma repository (and with it the generated client) is never loaded.
vi.mock(import("../../../src/repositories/scout.prisma.repository.ts"), () => ({
  fetchAllScouts: vi.fn(),
  createScoutProfile: vi.fn(),
  fetchScoutById: vi.fn(),
  updateScout: vi.fn(),
  removeScout: vi.fn(),
}));
vi.mock(import("../../../src/repositories/auth.repository.ts"), () => ({
  findUserById: vi.fn(),
}));

const SCOUT_ID = "3f2b8c1e-5a4d-4e7f-8b9c-1d2e3f4a5b6c";
const OTHER_SCOUT_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const CONTACT_DETAILS = "08012345678";

const makeScout = (
  overrides: Partial<createScoutReturnType> = {},
): createScoutReturnType => ({
  scout_id: SCOUT_ID,
  contact_details: CONTACT_DETAILS,
  name: "Test Scout",
  email: "scout@example.com",
  ...overrides,
});

describe("getAllscoutsService", () => {
  it("returns every scout with their name and email", async () => {
    const scouts = [makeScout(), makeScout({ scout_id: OTHER_SCOUT_ID, name: "Other" })];
    vi.mocked(fetchAllScouts).mockResolvedValue(scouts);

    await expect(getAllscoutsService()).resolves.toEqual(scouts);
  });

  it("returns an empty list when there are no scouts", async () => {
    vi.mocked(fetchAllScouts).mockResolvedValue([]);

    await expect(getAllscoutsService()).resolves.toEqual([]);
  });
});

describe("createScoutService", () => {
  it("creates the profile for the scout id with the contact details", async () => {
    const created = { scout_id: SCOUT_ID, contact_details: CONTACT_DETAILS };
    vi.mocked(createScoutProfile).mockResolvedValue(created);

    const result = await createScoutService(SCOUT_ID, CONTACT_DETAILS);

    expect(result).toEqual(created);
    expect(createScoutProfile).toHaveBeenCalledWith(SCOUT_ID, CONTACT_DETAILS);
  });

  it("propagates a duplicate profile error from Prisma", async () => {
    const duplicate = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
    });
    vi.mocked(createScoutProfile).mockRejectedValue(duplicate);

    await expect(createScoutService(SCOUT_ID, CONTACT_DETAILS)).rejects.toBe(duplicate);
  });
});

describe("getScoutByIdService", () => {
  it("returns the scout's user record with their contact details", async () => {
    const scoutUser = {
      user_id: SCOUT_ID,
      name: "Test Scout",
      email: "scout@example.com",
      user_type: "scout",
    } as const;
    vi.mocked(fetchScoutById).mockResolvedValue(makeScout());
    vi.mocked(findUserById).mockResolvedValue(scoutUser);

    const result = await getScoutByIdService(SCOUT_ID);

    expect(fetchScoutById).toHaveBeenCalledWith(SCOUT_ID);
    expect(findUserById).toHaveBeenCalledWith(SCOUT_ID);
    expect(result).toEqual({
      user_scout: scoutUser,
      scoutDetails: CONTACT_DETAILS,
    });
  });

  it("fails with 404 when the scout does not exist", async () => {
    vi.mocked(fetchScoutById).mockResolvedValue(null);

    await expect(getScoutByIdService(SCOUT_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "Scout not found",
    });
    expect(findUserById).not.toHaveBeenCalled();
  });
});

describe("updateScoutContactdetailsService", () => {
  it("updates the contact details of the scout", async () => {
    const updated = { scout_id: SCOUT_ID, contact_details: "09098765432" };
    vi.mocked(updateScout).mockResolvedValue(updated);

    const result = await updateScoutContactdetailsService(SCOUT_ID, "09098765432");

    expect(result).toEqual(updated);
    expect(updateScout).toHaveBeenCalledWith("09098765432", SCOUT_ID);
  });

  it("returns null when the scout does not exist", async () => {
    vi.mocked(updateScout).mockResolvedValue(null);

    await expect(
      updateScoutContactdetailsService(SCOUT_ID, "09098765432"),
    ).resolves.toBeNull();
  });
});

describe("deleteScoutService", () => {
  it("removes an existing scout", async () => {
    vi.mocked(fetchScoutById).mockResolvedValue(makeScout());
    vi.mocked(removeScout).mockResolvedValue(undefined);

    await expect(deleteScoutService(SCOUT_ID)).resolves.toBeUndefined();
    expect(removeScout).toHaveBeenCalledWith(SCOUT_ID);
  });

  it("fails with 404 and removes nothing when the scout does not exist", async () => {
    vi.mocked(fetchScoutById).mockResolvedValue(null);

    await expect(deleteScoutService(SCOUT_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "Scout not found",
    });
    expect(removeScout).not.toHaveBeenCalled();
  });

  it("propagates a database failure while removing", async () => {
    const failure = new Error("connection lost");
    vi.mocked(fetchScoutById).mockResolvedValue(makeScout());
    vi.mocked(removeScout).mockRejectedValue(failure);

    await expect(deleteScoutService(SCOUT_ID)).rejects.toBe(failure);
  });
});