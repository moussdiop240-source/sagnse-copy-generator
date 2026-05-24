import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { storePending } from "@/lib/store";

const VALID_PLATFORMS = new Set(["instagram", "snapchat", "whatsapp", "tiktok"]);
const VALID_TONES     = new Set(["professionnel", "amical", "enthousiaste", "luxueux"]);
const VALID_LANGUAGES = new Set(["francais", "wolof", "anglais", "puular", "serere"]);
const VALID_PAYMENTS  = new Set(["wave", "orange_money"]);

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
    ton = "professionnel",
    langue = "francais",
    paymentMethod,
  } = body as {
    titre?: string;
    brief?: string;
    plateformes?: unknown;
    ton?: string;
    langue?: string;
    paymentMethod?: string;
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
  if (!paymentMethod || !VALID_PAYMENTS.has(paymentMethod)) {
    return NextResponse.json({ error: "Moyen de paiement invalide ou manquant." }, { status: 400 });
  }

  const safeTon    = VALID_TONES.has(ton ?? "")        ? ton!    : "professionnel";
  const safeLangue = VALID_LANGUAGES.has(langue ?? "") ? langue! : "francais";

  const requestId = randomUUID();
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const price     = parseInt(process.env.SAGNSE_PRICE_XOF ?? "500", 10);
  const masterKey = process.env.PAYDUNYA_MASTER_KEY ?? "";

  const formData = {
    titre: titre.trim(),
    brief: brief.trim(),
    plateformes: safePlateformes,
    ton: safeTon,
    langue: safeLangue,
    paymentMethod,
    createdAt: Date.now(),
  };

  // Dev mode: no PayDunya keys → skip checkout, go straight to /success for verify
  if (!masterKey) {
    storePending(requestId, { ...formData, paydunyaToken: "" });
    return NextResponse.json({
      checkoutUrl: `${appUrl}/success?requestId=${requestId}`,
    });
  }

  // Live mode: create PayDunya invoice
  const privateKey = process.env.PAYDUNYA_PRIVATE_KEY ?? "";
  const apiToken   = process.env.PAYDUNYA_TOKEN ?? "";
  const mode       = process.env.PAYDUNYA_MODE ?? "sandbox";
  const baseUrl    = mode === "live"
    ? "https://app.paydunya.com/api/v1"
    : "https://app.paydunya.com/sandbox-api/v1";

  try {
    const paydunyaRes = await fetch(`${baseUrl}/checkout-invoice/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYDUNYA-MASTER-KEY": masterKey,
        "PAYDUNYA-PRIVATE-KEY": privateKey,
        "PAYDUNYA-TOKEN": apiToken,
      },
      body: JSON.stringify({
        invoice: {
          total_amount: price,
          description: `Copie de vente Sagnsé — ${titre.trim().slice(0, 80)}`,
        },
        store: {
          name: "Sagnsé",
          website_url: appUrl,
        },
        actions: {
          cancel_url: appUrl,
          return_url: `${appUrl}/success?requestId=${requestId}`,
        },
        custom_data: { request_id: requestId },
      }),
    });

    const result = await paydunyaRes.json() as {
      response_code?: string;
      description?: string;
      token?: string;
      checkout_url?: string;
    };

    if (result.response_code !== "00" || !result.checkout_url) {
      return NextResponse.json(
        { error: result.description ?? "Erreur de création de facture PayDunya." },
        { status: 502 }
      );
    }

    // Store form data alongside the PayDunya invoice token for verification later
    storePending(requestId, { ...formData, paydunyaToken: result.token ?? "" });

    return NextResponse.json({ checkoutUrl: result.checkout_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[/api/payment/initiate] PayDunya error:", message);
    return NextResponse.json(
      { error: "Erreur lors de l'initiation du paiement. Réessayez." },
      { status: 502 }
    );
  }
}
