import { NextRequest, NextResponse } from "next/server";
import { getResult } from "@/lib/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = getResult(token);
  if (!result) {
    return NextResponse.json({ status: "pending" });
  }
  return NextResponse.json({ status: "ready", copy: result.copy });
}
