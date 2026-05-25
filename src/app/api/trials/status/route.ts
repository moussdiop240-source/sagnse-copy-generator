import { NextRequest, NextResponse } from "next/server";
import { getTrialCount, FREE_LIMIT_SERVER } from "@/lib/store";

export async function GET(req: NextRequest) {
  const ip    = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const count = await getTrialCount(ip);
  return NextResponse.json({ count, limit: FREE_LIMIT_SERVER });
}
