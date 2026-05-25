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
  const apiKey    = process.env.PAYTECH_API_KEY ?? "";
  const apiSecret = process.env.PAYTECH_API_SECRET ?? "";

  const formData = {
    titre:         titre.trim(),
    brief:         brief.trim(),
    plateformes:   safePlateformes,
    ton:           safeTon,
    langue:        safeLangue,
    paymentMethod: "mobile",
    paytechToken:  "",
    createdAt:     Date.now(),
  };

  // Dev mode: no PayTech keys → skip payment, go straight to /success
  if (!apiKey) {
    await storePending(requestId, formData);
    return NextResponse.json({
      checkoutUrl: `${appUrl}/success?requestId=${requestId}`,
    });
  }

  try {
    const paytechRes = await fetchWithTimeout(
      "https://paytech.sn/api/payment/request-payment",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "API_KEY":       apiKey,
          "API_SECRET":    apiSecret,
        },
        body: JSON.stringify({
          item_name:    `Sagnsé — ${titre.trim().slice(0, 80)}`,
          item_price:   price,
          currency:     "XOF",
          ref_command:  requestId,
          command_name: `Génération de copie de vente Sagnsé`,
          env:          process.env.PAYTECH_ENV ?? "test",
          success_url:  `${appUrl}/success?requestId=${requestId}`,
          cancel_url:   appUrl,
          ipn_url:      `${appUrl}/api/payment/notify`,
          custom_field: JSON.stringify({ request_id: requestId }),
        }),
      },
      12_000
    );

    const result = await paytechRes.json() as {
      success?:      number;
      token?:        string;
      redirect_url?: string;
      redirectUrl?:  string;
    };

    const checkoutUrl = result.redirect_url ?? result.redirectUrl;

    if (result.success !== 1 || !checkoutUrl) {
      console.error("[/api/payment/initiate] PayTech error:", result);
      return NextResponse.json(
        { error: "Erreur lors de la création du paiement. Réessayez." },
        { status: 502 }
      );
    }

    await storePending(requestId, { ...formData, paytechToken: result.token ?? "" });
    return NextResponse.json({ checkoutUrl });

  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Le service de paiement met trop de temps à répondre. Réessayez." },
        { status: 504 }
      );
    }
    console.error("[/api/payment/initiate] PayTech error:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'initiation du paiement. Réessayez." },
      { status: 502 }
    );
  }
}
