import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { storePending } from "@/lib/store";

const VALID_PLATFORMS = new Set(["instagram", "snapchat", "whatsapp", "tiktok"]);
const VALID_TONES     = new Set(["professionnel", "amical", "enthousiaste", "luxueux"]);
const VALID_LANGUAGES = new Set(["francais", "wolof", "anglais", "puular", "serere"]);

function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const {
    titre,
    brief,
    plateformes,
    ton         = "professionnel",
    langue      = "francais",
    phoneNumber,
  } = body as {
    titre?: string; brief?: string; plateformes?: unknown;
    ton?: string; langue?: string; phoneNumber?: string;
  };

  if (!titre?.trim() || !brief?.trim()) {
    return NextResponse.json({ error: "Le titre et le brief produit sont requis." }, { status: 400 });
  }
  if (titre.length > 200 || brief.length > 2000) {
    return NextResponse.json({ error: "La longueur maximale autorisée est dépassée." }, { status: 400 });
  }
  if (!Array.isArray(plateformes) || plateformes.length === 0) {
    return NextResponse.json({ error: "Veuillez sélectionner au moins une plateforme." }, { status: 400 });
  }
  const safePlateformes = (plateformes as string[]).filter((p) => VALID_PLATFORMS.has(p));
  if (safePlateformes.length === 0) {
    return NextResponse.json({ error: "Plateforme(s) non reconnue(s)." }, { status: 400 });
  }

  const cleaned = (phoneNumber ?? "").replace(/\s/g, "");
  if (!cleaned || !/^7[0-8]\d{7}$/.test(cleaned)) {
    return NextResponse.json(
      { error: "Numéro invalide. Format attendu : 7X XXX XX XX (9 chiffres, ex: 771234567)." },
      { status: 400 }
    );
  }

  const safeTon    = VALID_TONES.has(ton ?? "")        ? ton!    : "professionnel";
  const safeLangue = VALID_LANGUAGES.has(langue ?? "") ? langue! : "francais";

  const requestId = randomUUID();
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const price     = parseInt(process.env.SAGNSE_PRICE_XOF ?? "500", 10);
  const masterKey = process.env.PAYDUNYA_MASTER_KEY ?? "";

  const formData = {
    titre:         titre.trim(),
    brief:         brief.trim(),
    plateformes:   safePlateformes,
    ton:           safeTon,
    langue:        safeLangue,
    phoneNumber:   cleaned,
    paymentMethod: "mobile",
    createdAt:     Date.now(),
  };

  // Dev mode: no PayDunya keys → skip checkout, go straight to /success
  if (!masterKey) {
    await storePending(requestId, { ...formData, paydunyaToken: "" });
    return NextResponse.json({
      checkoutUrl: `${appUrl}/success?requestId=${requestId}`,
    });
  }

  const privateKey = process.env.PAYDUNYA_PRIVATE_KEY ?? "";
  const apiToken   = process.env.PAYDUNYA_TOKEN ?? "";
  const mode       = process.env.PAYDUNYA_MODE ?? "sandbox";
  const baseUrl    = mode === "live"
    ? "https://app.paydunya.com/api/v1"
    : "https://app.paydunya.com/sandbox-api/v1";

  try {
    const paydunyaRes = await fetchWithTimeout(
      `${baseUrl}/checkout-invoice/create`,
      {
        method: "POST",
        headers: {
          "Content-Type":         "application/json",
          "PAYDUNYA-MASTER-KEY":  masterKey,
          "PAYDUNYA-PRIVATE-KEY": privateKey,
          "PAYDUNYA-TOKEN":       apiToken,
        },
        body: JSON.stringify({
          invoice: {
            total_amount: price,
            description:  `Copie de vente Sagnsé — ${titre.trim().slice(0, 80)}`,
          },
          store: {
            name:        "Sagnsé",
            website_url: appUrl,
          },
          actions: {
            cancel_url: appUrl,
            return_url: `${appUrl}/success?requestId=${requestId}`,
          },
          // Pre-fill customer phone on PayDunya checkout page
          customer: {
            name:  "Client Sagnsé",
            phone: `221${cleaned}`,
          },
          custom_data: { request_id: requestId },
        }),
      },
      10_000
    );

    const result = await paydunyaRes.json() as {
      response_code?: string;
      response_text?: string;
      description?:   string;
      token?:         string;
    };

    const checkoutUrl = result.response_code === "00" ? result.response_text : undefined;

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: result.description ?? "Erreur de création de facture PayDunya." },
        { status: 502 }
      );
    }

    await storePending(requestId, { ...formData, paydunyaToken: result.token ?? "" });
    return NextResponse.json({ checkoutUrl });

  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Le service de paiement met trop de temps à répondre. Réessayez." },
        { status: 504 }
      );
    }
    console.error("[/api/payment/initiate] PayDunya error:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'initiation du paiement. Réessayez." },
      { status: 502 }
    );
  }
}
