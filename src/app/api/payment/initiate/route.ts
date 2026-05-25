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
    ton    = "professionnel",
    langue = "francais",
  } = body as {
    titre?: string; brief?: string; plateformes?: unknown;
    ton?: string; langue?: string;
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

  const safeTon    = VALID_TONES.has(ton ?? "")        ? ton!    : "professionnel";
  const safeLangue = VALID_LANGUAGES.has(langue ?? "") ? langue! : "francais";

  const requestId = randomUUID();
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const price     = parseInt(process.env.SAGNSE_PRICE_XOF ?? "500", 10);
  const apiKey    = process.env.CINETPAY_API_KEY ?? "";
  const siteId    = process.env.CINETPAY_SITE_ID ?? "";

  const formData = {
    titre:         titre.trim(),
    brief:         brief.trim(),
    plateformes:   safePlateformes,
    ton:           safeTon,
    langue:        safeLangue,
    paymentMethod: "mobile",
    createdAt:     Date.now(),
  };

  // Dev mode: no CinetPay keys → skip payment, go straight to /success
  if (!apiKey) {
    await storePending(requestId, { ...formData, paydunyaToken: "" });
    return NextResponse.json({
      checkoutUrl: `${appUrl}/success?requestId=${requestId}`,
    });
  }

  try {
    const cinetRes = await fetchWithTimeout(
      "https://api-checkout.cinetpay.com/v2/payment",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey:         apiKey,
          site_id:        siteId,
          transaction_id: requestId,
          amount:         price,
          currency:       "XOF",
          description:    `Sagnsé — ${titre.trim().slice(0, 80)}`,
          return_url:     `${appUrl}/success?requestId=${requestId}`,
          notify_url:     `${appUrl}/api/payment/notify`,
          channels:       "MOBILE_MONEY",
          lang:           "fr",
        }),
      },
      12_000
    );

    const result = await cinetRes.json() as {
      code?:    string;
      message?: string;
      data?: { payment_url?: string };
    };

    if (result.code !== "201" || !result.data?.payment_url) {
      return NextResponse.json(
        { error: result.message ?? "Erreur lors de la création du paiement." },
        { status: 502 }
      );
    }

    await storePending(requestId, { ...formData, paydunyaToken: "" });
    return NextResponse.json({ checkoutUrl: result.data.payment_url });

  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Le service de paiement met trop de temps à répondre. Réessayez." },
        { status: 504 }
      );
    }
    console.error("[/api/payment/initiate] CinetPay error:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'initiation du paiement. Réessayez." },
      { status: 502 }
    );
  }
}
