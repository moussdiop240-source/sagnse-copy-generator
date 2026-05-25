import { NextRequest, NextResponse } from "next/server";
import {
  getPending, deletePending,
  storeResult, getResult,
  checkRateLimit,
} from "@/lib/store";
import { generateCopy, GenerateError } from "@/lib/generateCopy";

function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

export async function POST(req: NextRequest) {
  // Rate limit: 10 calls per IP per minute
  const ip      = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkRateLimit(`verify:${ip}`, 10, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Attendez une minute avant de réessayer.", retryable: false },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide.", retryable: false }, { status: 400 });
  }

  const requestId = (body.requestId as string | undefined)?.trim();
  if (!requestId) {
    return NextResponse.json({ error: "requestId manquant.", retryable: false }, { status: 400 });
  }

  // Return cached result on duplicate calls (user refreshes success page)
  const cached = await getResult(requestId);
  if (cached) {
    try {
      const copies = JSON.parse(cached.copy) as Record<string, string>;
      return NextResponse.json({ copies });
    } catch {
      return NextResponse.json({ copies: { text: cached.copy } });
    }
  }

  const pending = await getPending(requestId);
  if (!pending) {
    return NextResponse.json(
      { error: "Session introuvable. Ce lien a expiré ou est invalide.", retryable: false },
      { status: 404 }
    );
  }

  const masterKey = process.env.PAYDUNYA_MASTER_KEY ?? "";

  // Live mode: verify payment status with PayDunya (8 s timeout)
  if (masterKey && pending.paydunyaToken) {
    const mode    = process.env.PAYDUNYA_MODE ?? "sandbox";
    const baseUrl = mode === "live"
      ? "https://app.paydunya.com/api/v1"
      : "https://app.paydunya.com/sandbox-api/v1";

    try {
      const verifyRes = await fetchWithTimeout(
        `${baseUrl}/checkout-invoice/confirm/${pending.paydunyaToken}`,
        {
          headers: {
            "PAYDUNYA-MASTER-KEY":  masterKey,
            "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY ?? "",
            "PAYDUNYA-TOKEN":       process.env.PAYDUNYA_TOKEN ?? "",
          },
        },
        8_000
      );
      const verifyData = await verifyRes.json() as { status?: string };

      if (verifyData.status !== "completed") {
        return NextResponse.json(
          { error: "Paiement non confirmé. Veuillez contacter le support si vous avez été débité.", retryable: false },
          { status: 402 }
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return NextResponse.json(
          { error: "Impossible de joindre PayDunya pour vérifier le paiement. Réessayez dans quelques instants.", retryable: true },
          { status: 504 }
        );
      }
      console.error("[/api/payment/verify] PayDunya verify error:", err);
      return NextResponse.json(
        { error: "Erreur lors de la vérification du paiement. Réessayez.", retryable: true },
        { status: 502 }
      );
    }
  }
  // Dev mode (masterKey empty): skip verification — simulate successful payment

  // Generate copy via OpenAI
  const apiKey = process.env.OPENAI_API_KEY ?? "";
  try {
    const copies = await generateCopy(pending, apiKey);
    await storeResult(requestId, JSON.stringify(copies));
    await deletePending(requestId);
    return NextResponse.json({ copies });
  } catch (err) {
    if (err instanceof GenerateError) {
      const map: Record<string, { msg: string; status: number; retryable: boolean }> = {
        QUOTA_EXCEEDED:  { msg: "Service temporairement indisponible (quota). Réessayez dans quelques minutes.", status: 503, retryable: true },
        INVALID_API_KEY: { msg: "Erreur de configuration du service. Contactez le support.",                    status: 503, retryable: false },
        TIMEOUT:         { msg: "La génération a pris trop de temps. Réessayez.",                               status: 504, retryable: true },
        API_ERROR:       { msg: "Erreur lors de la génération. Réessayez.",                                     status: 502, retryable: true },
      };
      const { msg, status, retryable } = map[err.code] ?? map.API_ERROR;
      console.error(`[/api/payment/verify] GenerateError(${err.code}):`, err.message);
      return NextResponse.json({ error: msg, retryable }, { status });
    }
    console.error("[/api/payment/verify] Unexpected error:", err);
    return NextResponse.json(
      { error: "Erreur inattendue. Réessayez.", retryable: true },
      { status: 502 }
    );
  }
}
