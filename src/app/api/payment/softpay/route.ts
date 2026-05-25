import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { storePending } from "@/lib/store";

const VALID_PLATFORMS = new Set(["instagram", "snapchat", "whatsapp", "tiktok"]);
const VALID_TONES     = new Set(["professionnel", "amical", "enthousiaste", "luxueux"]);
const VALID_LANGUAGES = new Set(["francais", "wolof", "anglais", "puular", "serere"]);
const VALID_OPERATORS = new Set(["wave_senegal", "orange_money_sn"]);

function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-()+.]/g, "");
  if (cleaned.startsWith("221")) return cleaned;
  return `221${cleaned}`;
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
    phone,
    operator,
  } = body as {
    titre?: string; brief?: string; plateformes?: unknown;
    ton?: string; langue?: string; phone?: string; operator?: string;
  };

  if (!titre?.trim() || !brief?.trim()) {
    return NextResponse.json({ error: "Le titre et le brief produit sont requis." }, { status: 400 });
  }
  if (titre.length > 200 || brief.length > 2000) {
    return NextResponse.json({ error: "La longueur maximale autorisée est dépassée." }, { status: 400 });
  }
  if (!phone?.trim()) {
    return NextResponse.json({ error: "Veuillez entrer votre numéro de téléphone." }, { status: 400 });
  }
  if (!operator || !VALID_OPERATORS.has(operator)) {
    return NextResponse.json({ error: "Opérateur invalide." }, { status: 400 });
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

  const requestId      = randomUUID();
  const normalizedPhone = normalizePhone(phone.trim());
  const price          = parseInt(process.env.SAGNSE_PRICE_XOF ?? "500", 10);
  const masterKey      = process.env.PAYDUNYA_MASTER_KEY ?? "";

  const pendingData = {
    titre:         titre.trim(),
    brief:         brief.trim(),
    plateformes:   safePlateformes,
    ton:           safeTon,
    langue:        safeLangue,
    paymentMethod: operator,
    phoneNumber:   normalizedPhone,
    createdAt:     Date.now(),
  };

  // Dev mode: no PayDunya keys → skip directly to result
  if (!masterKey) {
    await storePending(requestId, { ...pendingData, paydunyaToken: "" });
    return NextResponse.json({ requestId, status: "dev" });
  }

  const privateKey = process.env.PAYDUNYA_PRIVATE_KEY ?? "";
  const apiToken   = process.env.PAYDUNYA_TOKEN ?? "";
  const mode       = process.env.PAYDUNYA_MODE ?? "sandbox";
  const baseUrl    = mode === "live"
    ? "https://app.paydunya.com/api/v1"
    : "https://app.paydunya.com/sandbox-api/v1";

  try {
    const pdRes = await fetchWithTimeout(
      `${baseUrl}/softpay/create`,
      {
        method: "POST",
        headers: {
          "Content-Type":         "application/json",
          "PAYDUNYA-MASTER-KEY":  masterKey,
          "PAYDUNYA-PRIVATE-KEY": privateKey,
          "PAYDUNYA-TOKEN":       apiToken,
        },
        body: JSON.stringify({
          operator:     operator,
          amount:       price,
          phone_number: normalizedPhone,
          description:  `Sagnsé — ${titre.trim().slice(0, 80)}`,
          send_sms:     1,
        }),
      },
      12_000
    );

    const result = await pdRes.json() as {
      response_code?: string;
      response_text?: string;
      description?:   string;
      token?:         string;
    };

    if (result.response_code !== "00" || !result.token) {
      return NextResponse.json(
        { error: result.description ?? "Erreur lors de l'initiation du paiement mobile." },
        { status: 502 }
      );
    }

    await storePending(requestId, { ...pendingData, paydunyaToken: result.token });
    return NextResponse.json({ requestId, status: "pending" });

  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Le service de paiement met trop de temps à répondre. Réessayez." },
        { status: 504 }
      );
    }
    console.error("[/api/payment/softpay] error:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'initiation du paiement. Réessayez." },
      { status: 502 }
    );
  }
}
