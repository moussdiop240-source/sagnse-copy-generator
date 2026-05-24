import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getPending, deletePending, storeResult } from "@/lib/store";
import { generateCopy } from "@/lib/generateCopy";

export async function POST(req: NextRequest) {
  const masterKey = process.env.PAYDUNYA_MASTER_KEY ?? "";

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = body.data as Record<string, unknown> | undefined;
  if (!data) {
    return NextResponse.json({ received: true });
  }

  // Verify PayDunya signature: hash === SHA-512(masterKey)
  if (masterKey) {
    const expectedHash = createHash("sha512").update(masterKey).digest("hex");
    const receivedHash = data.hash as string | undefined;
    if (receivedHash !== expectedHash) {
      console.warn("[/api/webhook] Invalid hash — possible spoofed request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const status     = data.status as string | undefined;
  const customData = data.custom_data as Record<string, unknown> | undefined;
  const requestId  = customData?.request_id as string | undefined;

  if (status !== "completed" || !requestId) {
    return NextResponse.json({ received: true });
  }

  const pending = getPending(requestId);
  if (!pending) {
    console.warn("[/api/webhook] No pending request for token:", requestId);
    return NextResponse.json({ received: true });
  }

  deletePending(requestId);

  const apiKey = process.env.OPENAI_API_KEY ?? "";
  try {
    const copy = await generateCopy(pending, apiKey);
    storeResult(requestId, copy);
  } catch (err) {
    console.error("[/api/webhook] generateCopy error:", err);
    storeResult(requestId, "[Erreur lors de la génération. Contactez le support.]");
  }

  return NextResponse.json({ received: true });
}
