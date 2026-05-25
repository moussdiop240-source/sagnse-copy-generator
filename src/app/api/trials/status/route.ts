import { NextRequest, NextResponse } from "next/server";
import { getEffectiveTrialCount, FREE_LIMIT_SERVER } from "@/lib/store";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const ip  = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const uid = req.cookies.get("sagnse_uid")?.value || randomUUID();

  const count = await getEffectiveTrialCount(ip, uid);

  const res = NextResponse.json({ count, limit: FREE_LIMIT_SERVER });
  res.cookies.set("sagnse_uid", uid, { maxAge: 31_536_000, httpOnly: true, sameSite: "strict", path: "/", secure: true });
  return res;
}
