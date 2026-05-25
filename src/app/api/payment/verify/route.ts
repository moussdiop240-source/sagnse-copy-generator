import { NextRequest, NextResponse } from "next/server";
import {
  getPending, deletePending,
  storeResult, getResult,
  storePaidConfirmed, getPaidConfirmed, deletePaidConfirmed,
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

  // Also check if payment was previously confirmed but generation failed
  const pending      = await getPending(requestId);
  const paidConfirmed = await getPaidConfirmed(requestId);

  if (!pending && !paidConfirmed) {
    return NextResponse.json(
      { error: "Session introuvable. Ce lien a expiré ou est invalide.", retryable: false },
      { status: 404 }
    );
  }

  const requestData    = pending ?? paidConfirmed!;
  const alreadyPaid    = !!paidConfirmed;
  const apiKey         = process.env.PAYTECH_API_KEY ?? "";
  const apiSecret      = process.env.PAYTECH_API_SECRET ?? "";

  // Live mode: verify payment with PayTech (skip if we already confirmed it in a prior attempt)
  if (!alreadyPaid && apiKey && requestData.paytechToken) {
    try {
      const verifyRes = await fetchWithTimeout(
        `https://paytech.sn/api/payment/get-status?token_payment=${encodeURIComponent(requestData.paytechToken)}`,
        {
          headers: {
            "API_KEY":    apiKey,
            "API_SECRET": apiSecret,
          },
        },
        8_000
      );

      const verifyData = await verifyRes.json() as {
        type_event?: string;
        status?:     string;
      };

      const paid =
        verifyData.type_event === "sale_complete" ||
        verifyData.status     === "sale_complete" ||
        verifyData.status     === "completed";

      if (!paid) {
        return NextResponse.json(
          { error: "Paiement non confirmé. Contactez le support si vous avez été débité.", retryable: false },
          { status: 402 }
        );
      }

      // Payment confirmed — persist this so retries skip PayTech and generation can be retried for 7 days
      await storePaidConfirmed(requestId, requestData);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return NextResponse.json(
          { error: "Impossible de vérifier le paiement pour l'instant. Réessayez.", retryable: true },
          { status: 504 }
        );
      }
      console.error("[/api/payment/verify] PayTech verify error:", err);
      return NextResponse.json(
        { error: "Erreur lors de la vérification du paiement. Réessayez.", retryable: true },
        { status: 502 }
      );
    }
  }
  // Dev mode (no apiKey) or payment already confirmed: proceed to generation

  // Generate copy via OpenAI — retry up to 3 times before giving up
  const openaiKey = process.env.OPENAI_API_KEY ?? "";
  let copies: Record<string, string> | null = null;
  let lastErr: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      copies = await generateCopy(requestData, openaiKey);
      break;
    } catch (err) {
      lastErr = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  if (copies) {
    await storeResult(requestId, JSON.stringify(copies));
    await deletePending(requestId);
    await deletePaidConfirmed(requestId);
    return NextResponse.json({ copies });
  }

  // All 3 attempts failed — payment is safe (paidok key persists), user can retry later
  const err = lastErr;
  if (err instanceof GenerateError) {
    const map: Record<string, { msg: string; status: number }> = {
      QUOTA_EXCEEDED:  { msg: "Service temporairement indisponible. Réessayez dans quelques minutes.", status: 503 },
      INVALID_API_KEY: { msg: "Erreur de configuration. Contactez le support.",                        status: 503 },
      TIMEOUT:         { msg: "La génération a pris trop de temps. Réessayez.",                        status: 504 },
      API_ERROR:       { msg: "Erreur lors de la génération. Réessayez.",                              status: 502 },
    };
    const { msg, status } = map[err.code] ?? map.API_ERROR;
    console.error(`[/api/payment/verify] GenerateError(${err.code}) after 3 attempts:`, err.message);
    return NextResponse.json({ error: msg, retryable: true, paymentSafe: true }, { status });
  }
  console.error("[/api/payment/verify] Unexpected error after 3 attempts:", err);
  return NextResponse.json(
    { error: "Erreur inattendue. Réessayez.", retryable: true, paymentSafe: true },
    { status: 502 }
  );
}
