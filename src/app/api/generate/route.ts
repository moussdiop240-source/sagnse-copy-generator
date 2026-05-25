import { NextRequest, NextResponse } from "next/server";
import { getEffectiveTrialCount, incrementBothTrialCounts, FREE_LIMIT_SERVER, checkRateLimit, getResult, storeResult, incrementStats } from "@/lib/store";
import { generateCopy } from "@/lib/generateCopy";
import { randomUUID, createHash } from "crypto";

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
    ton          = "professionnel",
    langue       = "francais",
    paymentMethod,
  } = body as {
    titre?: string; brief?: string; plateformes?: unknown;
    ton?: string; langue?: string; paymentMethod?: string;
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

  const safeTon     = VALID_TONES.has(ton ?? "")         ? ton!         : "professionnel";
  const safeLangue  = VALID_LANGUAGES.has(langue ?? "")  ? langue!      : "francais";
  const safePayment = paymentMethod && VALID_PAYMENTS.has(paymentMethod) ? paymentMethod : null;

  // Rate limit: 3 generations per IP per minute (prevents OpenAI cost blowout)
  const ip      = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkRateLimit(`gen:${ip}`, 3, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes. Attendez une minute avant de réessayer." },
      { status: 429 }
    );
  }

  // Server-side free trial enforcement — IP + browser cookie (both must be bypassed)
  const uid        = req.cookies.get("sagnse_uid")?.value || randomUUID();
  const trialCount = await getEffectiveTrialCount(ip, uid);
  if (trialCount >= FREE_LIMIT_SERVER) {
    const res = NextResponse.json(
      { error: "Limite gratuite atteinte. Veuillez passer au paiement.", limitReached: true },
      { status: 403 }
    );
    res.cookies.set("sagnse_uid", uid, { maxAge: 31_536_000, httpOnly: true, sameSite: "strict", path: "/", secure: true });
    return res;
  }

  const apiKey = process.env.OPENAI_API_KEY ?? "";

  // Cache key — identical inputs always return the same copy, zero OpenAI cost
  const cacheKey = `freetrial:${createHash("md5")
    .update([titre.trim(), brief.trim(), [...safePlateformes].sort().join(","), safeTon, safeLangue, safePayment ?? ""].join("|"))
    .digest("hex")}`;

  // Return cached result if available (still counts as a trial use)
  try {
    const cached = await getResult(cacheKey);
    if (cached) {
      const copies = JSON.parse(cached.copy) as Record<string, string>;
      await incrementBothTrialCounts(ip, uid);
      incrementStats(safeLangue, safePlateformes).catch(() => {});
      const res = NextResponse.json({ copies });
      res.cookies.set("sagnse_uid", uid, { maxAge: 31_536_000, httpOnly: true, sameSite: "strict", path: "/", secure: true });
      return res;
    }
  } catch { /* cache miss — proceed to generate */ }

  try {
    const copies = await generateCopy({
      titre:         titre.trim(),
      brief:         brief.trim(),
      plateformes:   safePlateformes,
      ton:           safeTon,
      langue:        safeLangue,
      paymentMethod: safePayment ?? "mobile",
    }, apiKey);

    // Cache result for 1 hour — identical requests skip OpenAI entirely
    await storeResult(cacheKey, JSON.stringify(copies), 3600).catch(() => {});

    await incrementBothTrialCounts(ip, uid);
    incrementStats(safeLangue, safePlateformes).catch(() => {});
    const res = NextResponse.json({ copies });
    res.cookies.set("sagnse_uid", uid, { maxAge: 31_536_000, httpOnly: true, sameSite: "strict", path: "/", secure: true });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[/api/generate] generateCopy error:", message);
    return NextResponse.json({ error: "Erreur lors de la génération. Veuillez réessayer." }, { status: 502 });
  }
}
