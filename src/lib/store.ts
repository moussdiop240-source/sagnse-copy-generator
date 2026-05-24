import { Redis } from "@upstash/redis";

export interface PendingRequest {
  titre: string;
  brief: string;
  plateformes: string[];
  ton: string;
  langue: string;
  paymentMethod: string;
  paydunyaToken: string;
  createdAt: number;
}

export interface CompletedResult {
  copy: string;
  createdAt: number;
}

// Lazy Redis singleton — initialised once, null when env vars are absent (local dev)
let _initialized = false;
let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_initialized) return _redis;
  _initialized = true;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _redis = new Redis({ url, token });
    if (process.env.NODE_ENV === "production") {
      console.info("[store] Using Upstash Redis for persistent storage.");
    }
  } else if (process.env.NODE_ENV === "production") {
    console.warn(
      "[store] UPSTASH_REDIS_REST_URL / TOKEN not set — falling back to in-memory store. " +
      "Data will be lost on server restart. Add Upstash env vars for production use."
    );
  }
  return _redis;
}

const PENDING_TTL = 1800;   // 30 min  — payment window
const RESULT_TTL  = 86_400; // 24 h    — result cache

// In-memory fallback for local dev without Redis
const memPending = new Map<string, PendingRequest>();
const memResults = new Map<string, CompletedResult>();

export async function storePending(id: string, data: PendingRequest): Promise<void> {
  const r = getRedis();
  if (r) {
    await r.set(`pd:${id}`, data, { ex: PENDING_TTL });
  } else {
    memPending.set(id, data);
  }
}

export async function getPending(id: string): Promise<PendingRequest | null> {
  const r = getRedis();
  if (r) return r.get<PendingRequest>(`pd:${id}`);
  return memPending.get(id) ?? null;
}

export async function deletePending(id: string): Promise<void> {
  const r = getRedis();
  if (r) {
    await r.del(`pd:${id}`);
  } else {
    memPending.delete(id);
  }
}

export async function storeResult(id: string, copy: string): Promise<void> {
  const r = getRedis();
  const data: CompletedResult = { copy, createdAt: Date.now() };
  if (r) {
    await r.set(`res:${id}`, data, { ex: RESULT_TTL });
  } else {
    memResults.set(id, data);
  }
}

export async function getResult(id: string): Promise<CompletedResult | null> {
  const r = getRedis();
  if (r) return r.get<CompletedResult>(`res:${id}`);
  return memResults.get(id) ?? null;
}

/**
 * Sliding-window rate limiter.
 * Returns true if the request is allowed, false if the limit is exceeded.
 * Skipped (always allows) when Redis is not configured.
 */
export async function checkRateLimit(
  key: string,
  limitPerWindow: number,
  windowSec: number
): Promise<boolean> {
  const r = getRedis();
  if (!r) return true;
  const rKey = `rl:${key}`;
  const count = await r.incr(rKey);
  if (count === 1) await r.expire(rKey, windowSec);
  return count <= limitPerWindow;
}
