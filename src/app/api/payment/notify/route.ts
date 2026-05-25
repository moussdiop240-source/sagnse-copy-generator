import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getPending, storePaidConfirmed, deletePending } from "@/lib/store";

// PayTech IPN webhook — verifies HMAC, persists paidok on sale_complete.
// This ensures payment is never lost even if the user closes the tab before /verify runs.
export async function POST(req: NextRequest) {
  let body: {
    type_event?:        string;
    ref_command?:       string;
    item_price?:        number;
    api_key_sha256?:    string;
    api_secret_sha256?: string;
    hmac_compute?:      string;
  };

  try {
    body = await req.json();
  } catch {
    // Malformed body — return 200 to prevent PayTech retries
    return NextResponse.json({ status: "ok" });
  }

  const apiKey    = process.env.PAYTECH_API_KEY    ?? "";
  const apiSecret = process.env.PAYTECH_API_SECRET ?? "";

  // Verify HMAC signature when keys are configured
  if (apiKey && body.hmac_compute && body.ref_command && body.item_price != null) {
    const message  = `${body.item_price}|${body.ref_command}|${apiKey}`;
    const expected = createHmac("sha256", apiSecret).update(message).digest("hex");
    if (expected !== body.hmac_compute) {
      console.warn("[/api/payment/notify] HMAC mismatch — ignoring");
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }
  }

  // On confirmed sale: persist paidok so /verify can generate copy even if user closed the tab
  if (
    body.type_event === "sale_complete" &&
    body.ref_command
  ) {
    try {
      const pending = await getPending(body.ref_command);
      if (pending) {
        await storePaidConfirmed(body.ref_command, pending);
        await deletePending(body.ref_command);
        console.info("[/api/payment/notify] paidok stored for", body.ref_command);
      }
    } catch (err) {
      // Log but never fail — PayTech must always receive 200 or it will retry
      console.error("[/api/payment/notify] failed to store paidok:", err);
    }
  }

  return NextResponse.json({ status: "ok" });
}
