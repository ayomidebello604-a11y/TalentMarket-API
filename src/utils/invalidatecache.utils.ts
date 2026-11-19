import { Redis } from "../config/redis.ts";

export const invalidateCache = async (key: string): Promise<void> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 1000);
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