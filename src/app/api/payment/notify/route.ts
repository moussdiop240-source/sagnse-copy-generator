import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

// PayTech IPN webhook — verifies HMAC then acknowledges receipt.
// Payment status is confirmed on-demand in /api/payment/verify.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      type_event?:      string;
      ref_command?:     string;
      item_price?:      number;
      api_key_sha256?:  string;
      api_secret_sha256?: string;
      hmac_compute?:    string;
    };

    const apiKey    = process.env.PAYTECH_API_KEY    ?? "";
    const apiSecret = process.env.PAYTECH_API_SECRET ?? "";

    if (apiKey && body.hmac_compute && body.ref_command && body.item_price != null) {
      const message  = `${body.item_price}|${body.ref_command}|${apiKey}`;
      const expected = createHmac("sha256", apiSecret).update(message).digest("hex");
      if (expected !== body.hmac_compute) {
        console.warn("[/api/payment/notify] HMAC mismatch — ignoring");
        return NextResponse.json({ status: "ignored" }, { status: 200 });
      }
    }
  } catch {
    // Malformed body — still return 200 to prevent PayTech retries
  }

  return NextResponse.json({ status: "ok" });
}
