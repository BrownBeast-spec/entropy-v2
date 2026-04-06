import { describe, it, expect, beforeEach } from "vitest";
import { NvidiaRateLimiter } from "../lib/rate-limiter";

describe("Nvidia Rate Limiter", () => {
  let limiter: NvidiaRateLimiter;

  beforeEach(() => {
    limiter = new NvidiaRateLimiter({
      requestsPerMinute: 10,
      tokensPerMinute: 10000,
      maxConcurrent: 2,
    });
  });

  it("should allow request within limits", async () => {
    await expect(limiter.acquire(100)).resolves.toBeUndefined();
    limiter.release(100);
  });

  it("should track concurrent requests", async () => {
    await limiter.acquire(100);
    await limiter.acquire(100);

    const stats = limiter.getStats();
    expect(stats.activeRequests).toBe(2);

    limiter.release(100);
    limiter.release(100);
  });

  it("should queue requests when concurrent limit reached", async () => {
    await limiter.acquire(100);
    await limiter.acquire(100);

    const promise = limiter.acquire(100);
    const stats = limiter.getStats();

    expect(stats.queuedRequests).toBe(1);

    limiter.release(100);
    await promise;
  });

  it("should return accurate stats", () => {
    const stats = limiter.getStats();

    expect(stats).toHaveProperty("activeRequests");
    expect(stats).toHaveProperty("queuedRequests");
    expect(stats).toHaveProperty("requestsInLastMinute");
    expect(stats).toHaveProperty("tokensInLastMinute");
    expect(stats).toHaveProperty("limits");
  });
});
