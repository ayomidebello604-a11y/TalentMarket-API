import { Redis } from "../config/redis.ts";

  const controller = new AbortController();
      const timeout = setTimeout(() => {
    controller.abort();
}, 1000);
export const invalidateCache = async (key: string): Promise<void> => {
  try {
    await Redis
    .withAbortSignal(controller.signal)
    .del(key);
  } catch (error) {
    console.error(`Redis DEL error for key "${key}":`, error);
  } finally {
    clearTimeout(timeout)
  }
};