import { setTimeout as sleep } from "timers/promises";

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  maxConcurrent: number;
  burstAllowance?: number;
}

interface QueuedRequest {
  estimatedTokens: number;
  resolve: () => void;
  reject: (error: Error) => void;
}

export class NvidiaRateLimiter {
  private config: RateLimitConfig;
  private requestTimestamps: number[] = [];
  private tokenUsage: Array<{ timestamp: number; tokens: number }> = [];
  private activeRequests = 0;
  private queue: QueuedRequest[] = [];

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      requestsPerMinute: parseInt(process.env.NVIDIA_NIM_MAX_RPM || "60"),
      tokensPerMinute: parseInt(process.env.NVIDIA_NIM_MAX_TPM || "90000"),
      maxConcurrent: parseInt(process.env.NVIDIA_NIM_MAX_CONCURRENT || "3"),
      burstAllowance: 10,
      ...config,
    };
  }

  async acquire(estimatedTokens = 1000): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ estimatedTokens, resolve, reject });
      this.processQueue();
    });
  }

  release(actualTokens?: number): void {
    this.activeRequests--;

    if (actualTokens) {
      this.tokenUsage.push({
        timestamp: Date.now(),
        tokens: actualTokens,
      });
    }
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => ts > oneMinuteAgo,
    );
    this.tokenUsage = this.tokenUsage.filter(
      (tu) => tu.timestamp > oneMinuteAgo,
    );

    // Check limits
    const requestsInLastMinute = this.requestTimestamps.length;
    const tokensInLastMinute = this.tokenUsage.reduce(
      (sum, tu) => sum + tu.tokens,
      0,
    );

    const canProceed =
      this.activeRequests < this.config.maxConcurrent &&
      requestsInLastMinute < this.config.requestsPerMinute &&
      tokensInLastMinute + this.queue[0].estimatedTokens <
        this.config.tokensPerMinute;

    if (!canProceed) {
      // Wait and retry
      setTimeout(() => this.processQueue(), 1000);
      return;
    }

    // Process next request
    const request = this.queue.shift()!;
    this.activeRequests++;
    this.requestTimestamps.push(now);
    request.resolve();
  }

  getStats() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const recentRequests = this.requestTimestamps.filter(
      (ts) => ts > oneMinuteAgo,
    ).length;
    const recentTokens = this.tokenUsage
      .filter((tu) => tu.timestamp > oneMinuteAgo)
      .reduce((sum, tu) => sum + tu.tokens, 0);

    return {
      activeRequests: this.activeRequests,
      queuedRequests: this.queue.length,
      requestsInLastMinute: recentRequests,
      tokensInLastMinute: recentTokens,
      limits: this.config,
    };
  }
}

// Singleton instance
let rateLimiter: NvidiaRateLimiter | null = null;

export function getNvidiaRateLimiter(): NvidiaRateLimiter {
  if (!rateLimiter) {
    rateLimiter = new NvidiaRateLimiter();
  }
  return rateLimiter;
}
