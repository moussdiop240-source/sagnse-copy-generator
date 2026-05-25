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
  // Rate limit: 40 calls per IP per minute (polling every 3 s = ~20/min with headroom)
  const ip      = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkRateLimit(`poll:${ip}`, 40, 60);
  if (!allowed) {
    return NextResponse.json(
      { status: "rate_limited", error: "Trop de tentatives. Attendez avant de réessayer." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "error", error: "Corps invalide." }, { status: 400 });
  }

  const requestId = (body.requestId as string | undefined)?.trim();
  if (!requestId) {
    return NextResponse.json({ status: "error", error: "requestId manquant." }, { status: 400 });
  }

  // Already completed — return cached result
  const cached = await getResult(requestId);
  if (cached) {
    try {
      const copies = JSON.parse(cached.copy) as Record<string, string>;
      return NextResponse.json({ status: "paid", copies });
    } catch {
      return NextResponse.json({ status: "paid", copies: { text: cached.copy } });
    }
  }

  const pending = await getPending(requestId);
  if (!pending) {
    return NextResponse.json(
      { status: "expired", error: "Session expirée ou introuvable." },
      { status: 404 }
    );
  }

  const masterKey = process.env.PAYDUNYA_MASTER_KEY ?? "";

  // Dev mode or no softpay token → skip verification, generate immediately
  if (!masterKey || !pending.paydunyaToken) {
    try {
      const copies = await generateCopy(pending, process.env.OPENAI_API_KEY ?? "");
      await storeResult(requestId, JSON.stringify(copies));
      await deletePending(requestId);
      return NextResponse.json({ status: "paid", copies });
    } catch {
      return NextResponse.json({ status: "error", error: "Erreur de génération." }, { status: 502 });
    }
  }

  // Check softpay status with PayDunya
  const mode    = process.env.PAYDUNYA_MODE ?? "sandbox";
  const baseUrl = mode === "live"
    ? "https://app.paydunya.com/api/v1"
    : "https://app.paydunya.com/sandbox-api/v1";

  try {
    const statusRes = await fetchWithTimeout(
      `${baseUrl}/softpay/confirm/${pending.paydunyaToken}`,
      {
        headers: {
          "PAYDUNYA-MASTER-KEY":  masterKey,
          "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY ?? "",
          "PAYDUNYA-TOKEN":       process.env.PAYDUNYA_TOKEN ?? "",
        },
      },
      8_000
    );

    const statusData = await statusRes.json() as {
      status?: string;
      response_code?: string;
      invoice?: { status?: string };
    };

    const payStatus = statusData.status ?? statusData.invoice?.status;

    if (payStatus !== "completed") {
      return NextResponse.json({ status: "pending" });
    }

    // Payment confirmed → generate copy
    const copies = await generateCopy(pending, process.env.OPENAI_API_KEY ?? "");
    await storeResult(requestId, JSON.stringify(copies));
    await deletePending(requestId);
    return NextResponse.json({ status: "paid", copies });

  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ status: "pending" });
    }
    if (err instanceof GenerateError) {
      const msgs: Record<string, string> = {
        QUOTA_EXCEEDED:  "Service temporairement indisponible (quota). Réessayez dans quelques minutes.",
        INVALID_API_KEY: "Erreur de configuration du service. Contactez le support.",
        TIMEOUT:         "La génération a pris trop de temps. Réessayez.",
        API_ERROR:       "Erreur lors de la génération. Réessayez.",
      };
      return NextResponse.json(
        { status: "error", error: msgs[err.code] ?? msgs.API_ERROR },
        { status: 502 }
      );
    }
    console.error("[/api/payment/poll] error:", err);
    return NextResponse.json({ status: "pending" }); // be resilient on transient errors
  }
}
