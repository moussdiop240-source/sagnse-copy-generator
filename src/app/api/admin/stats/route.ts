import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/lib/store";

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured." }, { status: 403 });

  const key = req.nextUrl.searchParams.get("key");
  if (key !== secret) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const stats = await getStats();
  return NextResponse.json(stats);
}
