import { NextResponse } from "next/server";

// PayDunya IPN webhook — acknowledges receipt; payment verification
// happens on-demand in /api/payment/verify when the user lands on /success.
export async function POST() {
  return NextResponse.json({ status: "ok" });
}
