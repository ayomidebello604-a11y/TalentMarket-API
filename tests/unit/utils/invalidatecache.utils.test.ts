import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redisMock = vi.hoisted(() => ({
  del: vi.fn(),
  withAbortSignal: vi.fn(),
}));

vi.mock("../../../src/config/redis.ts", () => ({
  Redis: { withAbortSignal: redisMock.withAbortSignal },
}));

const KEY = "talentmarket:players:all";


const loadInvalidateCache = async () => {
  vi.resetModules();
  const module = await import("../../../src/utils/invalidatecache.utils.ts");
  return module.invalidateCache;
};

describe("invalidateCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    redisMock.del.mockResolvedValue(1);
    // Like the real node-redis client, a command sent with an already aborted
    // signal is rejected and never reaches Redis.
    redisMock.withAbortSignal.mockImplementation((signal: AbortSignal) => ({
      del: async (key: string) => {
        if (signal.aborted) throw new Error("The command was aborted");
        return redisMock.del(key);
      },
    }));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deletes the key", async () => {
    const invalidateCache = await loadInvalidateCache();

    await invalidateCache(KEY);

    expect(redisMock.del).toHaveBeenCalledExactlyOnceWith(KEY);
  });

  it("still deletes the key long after the server started", async () => {
    const invalidateCache = await loadInvalidateCache();
    await vi.advanceTimersByTimeAsync(60_000);

    await invalidateCache(KEY);

    expect(redisMock.del).toHaveBeenCalledExactlyOnceWith(KEY);
  });

  it("logs a Redis failure instead of throwing", async () => {
    const invalidateCache = await loadInvalidateCache();
    const failure = new Error("connection lost");
    redisMock.withAbortSignal.mockReturnValue({
      del: vi.fn().mockRejectedValue(failure),
    });

    await expect(invalidateCache(KEY)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      `Redis DEL error for key "${KEY}":`,
      failure,
    );
  });
});