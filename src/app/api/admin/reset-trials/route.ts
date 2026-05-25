import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured." }, { status: 403 });

  const { key } = await req.json() as { key?: string };
  if (key !== secret) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return NextResponse.json({ error: "Redis not configured." }, { status: 500 });

  const redis = new Redis({ url, token });

  // Scan and delete all trials:* keys
  let cursor = 0;
  let deleted = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: "trials:*", count: 100 });
    cursor = Number(nextCursor);
    if (keys.length > 0) {
      await redis.del(...keys);
      deleted += keys.length;
    }
  } while (cursor !== 0);

  return NextResponse.json({ ok: true, deleted });
}
