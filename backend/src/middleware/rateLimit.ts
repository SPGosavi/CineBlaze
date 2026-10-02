import type { NextFunction, Request, Response } from "express";
import { redisClient } from "../cache/index.js";
import { RATE_LIMIT_DISABLED, RATE_LIMIT_IP_PER_SECOND } from "../config.js";
import { childLogger } from "../utils/logger.js";

const log = childLogger("ratelimit");

/**
 * Token bucket, evaluated atomically in Redis.
 *
 * Lua because the read-modify-write must not interleave. Doing it with
 * GET/SET from Node means two concurrent requests both read the same token
 * count and both spend it — the classic lost update, and precisely the race an
 * attacker sending parallel requests would exercise.
 *
 * A bucket is `{ tokens, updatedAt }`. Tokens accrue continuously at
 * `capacity / windowSeconds`, which is what makes this a bucket rather than a
 * fixed window: a fixed window lets someone spend the whole allowance at
 * 11:59:59 and the whole next one at 12:00:00.
 */
const TOKEN_BUCKET_LUA = `
local key        = KEYS[1]
local capacity   = tonumber(ARGV[1])
local windowSec  = tonumber(ARGV[2])
local nowMs      = tonumber(ARGV[3])
local cost       = tonumber(ARGV[4])

local refillPerMs = capacity / (windowSec * 1000)

local bucket = redis.call('HMGET', key, 'tokens', 'updatedAt')
local tokens = tonumber(bucket[1])
local updatedAt = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  updatedAt = nowMs
end

local elapsed = math.max(0, nowMs - updatedAt)
tokens = math.min(capacity, tokens + elapsed * refillPerMs)

local allowed = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
end

redis.call('HSET', key, 'tokens', tokens, 'updatedAt', nowMs)
-- Expire an idle bucket after a full refill; keeping it would leak a key per
-- visitor forever.
redis.call('PEXPIRE', key, math.ceil(windowSec * 1000) + 1000)

local retryAfterMs = 0
if allowed == 0 then
  retryAfterMs = math.ceil((cost - tokens) / refillPerMs)
end

return { allowed, math.floor(tokens), retryAfterMs }
`;

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * In-process fallback used when Redis is absent.
 *
 * Honest about what it is: correct for one instance, meaningless across
 * several, and wiped on restart. Good enough for local development, which is
 * the only situation where REDIS_URL should be unset.
 */
const localBuckets = new Map<string, { tokens: number; updatedAt: number }>();

function consumeLocally(
  key: string,
  capacity: number,
  windowSeconds: number,
  cost: number
): RateLimitDecision {
  const now = Date.now();
  const refillPerMs = capacity / (windowSeconds * 1000);
  const bucket = localBuckets.get(key) ?? { tokens: capacity, updatedAt: now };

  const tokens = Math.min(
    capacity,
    bucket.tokens + Math.max(0, now - bucket.updatedAt) * refillPerMs
  );

  if (tokens >= cost) {
    localBuckets.set(key, { tokens: tokens - cost, updatedAt: now });
    return {
      allowed: true,
      remaining: Math.floor(tokens - cost),
      retryAfterSeconds: 0,
    };
  }

  localBuckets.set(key, { tokens, updatedAt: now });
  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: Math.ceil((cost - tokens) / refillPerMs / 1000),
  };
}

export async function consume(
  key: string,
  capacity: number,
  windowSeconds: number,
  cost = 1
): Promise<RateLimitDecision> {
  const redis = redisClient();
  if (!redis) return consumeLocally(key, capacity, windowSeconds, cost);

  try {
    const [allowed, remaining, retryAfterMs] = (await redis.eval(
      TOKEN_BUCKET_LUA,
      1,
      key,
      capacity,
      windowSeconds,
      Date.now(),
      cost
    )) as [number, number, number];

    return {
      allowed: allowed === 1,
      remaining,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  } catch (error) {
    // Fail *open*. A rate limiter that 500s when its datastore blinks has
    // turned a safety mechanism into an outage. The exposure is bounded:
    // Redis being down is itself alarming and short-lived.
    log.warn(
      { err: (error as Error).message },
      "Rate limit check failed — allowing"
    );
    return { allowed: true, remaining: capacity, retryAfterSeconds: 0 };
  }
}

/**
 * Identity for limiting: the signed-in user if known, otherwise the IP.
 *
 * Per-user is the meaningful unit — the plan's budgets are "per user per
 * hour" — but anonymous browsing is allowed, so IP is the fallback. It is a
 * blunt instrument behind carrier NAT, which is why the per-IP limit is a
 * DDoS guard rather than a quota.
 */
function identify(req: Request): string {
  if (req.user) return `user:${req.user.uid}`;
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : null) ||
    req.ip ||
    "unknown";
  return `ip:${ip}`;
}

export interface LimitOptions {
  name: string;
  capacity: number;
  windowSeconds: number;
  /** Message shown to the caller on rejection. */
  message: string;
}

export function rateLimit({
  name,
  capacity,
  windowSeconds,
  message,
}: LimitOptions) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (RATE_LIMIT_DISABLED) {
      next();
      return;
    }

    const key = `ratelimit:${name}:${identify(req)}`;
    const decision = await consume(key, capacity, windowSeconds);

    res.setHeader("X-RateLimit-Limit", capacity);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, decision.remaining));

    if (!decision.allowed) {
      res.setHeader("Retry-After", decision.retryAfterSeconds);
      log.info(
        { limit: name, key, retryAfter: decision.retryAfterSeconds },
        "Rate limit exceeded"
      );
      res.status(429).json({
        error: message,
        status: 429,
        retryAfterSeconds: decision.retryAfterSeconds,
      });
      return;
    }

    next();
  };
}

/**
 * Coarse per-IP burst guard applied to everything.
 *
 * Capacity is set to the per-second rate so a client may burst that many
 * requests and then refills continuously.
 */
export const ipBurstLimiter = rateLimit({
  name: "ip",
  capacity: RATE_LIMIT_IP_PER_SECOND,
  windowSeconds: 1,
  message: "Too many requests. Please slow down.",
});
