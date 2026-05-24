import { NextRequest, NextResponse } from "next/server";
import { getPending, deletePending, storeResult, getResult } from "@/lib/store";
import { generateCopy } from "@/lib/generateCopy";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const requestId = body.requestId as string | undefined;
  if (!requestId?.trim()) {
    return NextResponse.json({ error: "requestId manquant." }, { status: 400 });
  }

  // Return cached result on duplicate calls (user refreshes success page)
  const cached = getResult(requestId);
  if (cached) {
    return NextResponse.json({ copy: cached.copy });
  }

  const pending = getPending(requestId);
  if (!pending) {
    return NextResponse.json(
      { error: "Session introuvable. Le lien de paiement est peut-être expiré." },
      { status: 404 }
    );
  }

  const masterKey = process.env.PAYDUNYA_MASTER_KEY ?? "";

  // Live mode: verify payment status with PayDunya before generating
  if (masterKey && pending.paydunyaToken) {
    const mode    = process.env.PAYDUNYA_MODE ?? "sandbox";
    const baseUrl = mode === "live"
      ? "https://app.paydunya.com/api/v1"
      : "https://app.paydunya.com/sandbox-api/v1";

    try {
      const verifyRes = await fetch(
        `${baseUrl}/checkout-invoice/confirm/${pending.paydunyaToken}`,
        {
          headers: {
            "PAYDUNYA-MASTER-KEY": masterKey,
            "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY ?? "",
            "PAYDUNYA-TOKEN":       process.env.PAYDUNYA_TOKEN ?? "",
          },
        }
      );
      const verifyData = await verifyRes.json() as { status?: string };

      if (verifyData.status !== "completed") {
        return NextResponse.json(
          { error: "Paiement non confirmé. Veuillez réessayer ou contacter le support." },
          { status: 402 }
        );
      }
    } catch (err) {
      console.error("[/api/payment/verify] PayDunya verify error:", err);
      return NextResponse.json(
        { error: "Impossible de vérifier le paiement. Réessayez dans quelques instants." },
        { status: 502 }
      );
    }
  }
  // Dev mode (masterKey empty): skip verification — simulate successful payment

  // Generate copy via OpenAI (or mock in dev)
  const apiKey = process.env.OPENAI_API_KEY ?? "";
  try {
    const copy = await generateCopy(pending, apiKey);
    storeResult(requestId, copy);
    deletePending(requestId);
    return NextResponse.json({ copy });
  } catch (err) {
    console.error("[/api/payment/verify] generateCopy error:", err);
    return NextResponse.json(
      { error: "Erreur lors de la génération. Veuillez réessayer." },
      { status: 502 }
    );
  }
}
