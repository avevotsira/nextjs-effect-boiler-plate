import { createHash, randomBytes } from "node:crypto";

// Random per process, so a digest cannot be matched to an address after a
// restart, and no two instances produce the same digest for the same client.
const salt = randomBytes(16);

/**
 * Turns a client IP into the bucket key. The address itself is never kept:
 * only this digest lives in memory, and only until the process restarts.
 */
export const clientKey = (ip: string): string =>
  createHash("sha256").update(salt).update(ip).digest("base64url");

/**
 * A token bucket rate limiter implementation.
 *
 * This class implements a token bucket algorithm for rate limiting requests.
 * Each key gets its own bucket that refills tokens at a specified interval.
 *
 * @template _Key - The type of key used to identify different rate limit buckets
 */
export class TokenBucketRateLimit<_Key> {
  /** Maximum number of tokens allowed in a bucket */
  public max: number;
  /** Time interval in seconds between token refills */
  public refillIntervalSeconds: number;

  /**
   * Creates a new token bucket rate limiter.
   *
   * @param max - Maximum number of tokens allowed in a bucket
   * @param refillIntervalSeconds - Time interval in seconds between token refills
   */
  constructor(max: number, refillIntervalSeconds: number) {
    this.max = max;
    this.refillIntervalSeconds = refillIntervalSeconds;
  }

  /** Internal storage for buckets, keyed by the provided key type */
  private storage = new Map<_Key, Bucket>();

  /**
   * Attempts to consume tokens from the bucket associated with the given key.
   *
   * If the bucket doesn't exist, it creates a new one with max tokens minus the cost.
   * If the bucket exists, it refills tokens based on elapsed time and then attempts to consume.
   *
   * @param key - The key identifying which bucket to consume from
   * @param cost - Number of tokens to consume
   * @returns true if tokens were successfully consumed, false if insufficient tokens
   */
  public consume(key: _Key, cost: number): boolean {
    let bucket = this.storage.get(key) ?? null;
    const now = Date.now();
    if (bucket === null) {
      bucket = {
        count: this.max - cost,
        refilledAtMilliseconds: now,
      };
      this.storage.set(key, bucket);
      return true;
    }
    const refill = Math.floor(
      (now - bucket.refilledAtMilliseconds) /
        (this.refillIntervalSeconds * 1000),
    );
    bucket.count = Math.min(bucket.count + refill, this.max);
    bucket.refilledAtMilliseconds =
      bucket.refilledAtMilliseconds +
      refill * this.refillIntervalSeconds * 1000;
    if (bucket.count < cost) {
      this.storage.set(key, bucket);
      return false;
    }
    bucket.count -= cost;
    this.storage.set(key, bucket);
    return true;
  }
}

/**
 * Represents a token bucket with current token count and last refill time.
 */
interface Bucket {
  /** Current number of tokens in the bucket */
  count: number;
  /** Timestamp in milliseconds when the bucket was last refilled */
  refilledAtMilliseconds: number;
}
