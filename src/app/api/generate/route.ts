import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getTrialCount, incrementTrialCount, FREE_LIMIT_SERVER } from "@/lib/store";

const VALID_PLATFORMS = new Set(["instagram", "snapchat", "whatsapp", "tiktok"]);
const VALID_TONES     = new Set(["professionnel", "amical", "enthousiaste", "luxueux"]);
const VALID_LANGUAGES = new Set(["francais", "wolof", "anglais", "puular", "serere"]);
const VALID_PAYMENTS  = new Set(["wave", "orange_money"]);

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  snapchat:  "Snapchat",
  whatsapp:  "WhatsApp",
  tiktok:    "TikTok",
};

const PAYMENT_LABELS: Record<string, string> = {
  wave:         "Wave",
  orange_money: "Orange Money",
};

function hashtags(platform: string): string {
  if (platform === "instagram") return "\n#Sagnsé #ModedakarSN #ShopeLocal";
  if (platform === "tiktok")    return "\n#TikTokSN #DakarTrend #FYP";
  if (platform === "snapchat")  return "\n#SnapSN";
  return "";
}

function mockOnePlatform(
  titre: string,
  brief: string,
  platform: string,
  ton: string,
  langue: string,
  paymentMethod: string | null
): string {
  const payment  = paymentMethod ? (PAYMENT_LABELS[paymentMethod] ?? "") : "";
  const payLine  = payment ? `✅ Paiement facile via ${payment}` : "✅ Paiement simple et rapide";
  const tags     = hashtags(platform);
  const em: Record<string, string> = { professionnel: "✨", amical: "😊", enthousiaste: "🔥", luxueux: "👑" };
  const e = em[ton] ?? "✨";

  if (langue === "wolof") {
    if (platform === "instagram") return `${e} *${titre}* bi dafa gawa lool — dëgër na !\nScroll bul dem, xam nga loolu ?\n\n✨ ${brief}\n\n📸 Dakar klasse ci feed bi — paré nga !\n\n✅ Livraison ci Dakar, Thiès, Mbour\n${payLine}\n\n📩 DM kanam — gaaw ! 👇${tags}`;
    if (platform === "whatsapp")  return `${e} *${titre}* ✨\n\n👉 ${brief}\n\n💰 Tarif : voir ci-dessous\n🚀 Livraison ci Sénégal yépp.\nStock dafay tàmm ! Jëndal léegi.\n\n📲 Bindal ma wax — gaaw !`;
    if (platform === "tiktok")    return `⚡ Sagnssé dëgg — *${titre}* bi dafa gawa lool!\n\n🎬 Visuel : Yëgël *${titre}* bi ci kanam, regard ci qualité ak style bi.\n\n🎤 Audio/Texte à l'écran : "${brief.slice(0, 60)} — Klasse garantie ! Tàmm bëgg na dem, lien ci bio 👇"\n\n${payLine}${tags}`;
    if (platform === "snapchat")  return `${e} *${titre}* — Dakar klasse!\n${brief.slice(0, 70)}…\n\n💨 Tàmm — DM kanam ! 👆${tags}`;
  }

  if (langue === "anglais") {
    if (platform === "instagram") return `${e} Stop scrolling — *${titre}* is exactly what you needed.\nDakar vibes, klasse guaranteed. No cap.\n\n✨ ${brief}\n\n📸 Feed-worthy. Delivered fast in Dakar, Thiès, Mbour.\n${payLine}\n\n📩 DM to order — it's giving ! 👇${tags}`;
    if (platform === "whatsapp")  return `${e} *${titre}* ✨\n\n👉 ${brief}\n\n💰 Price : check description\n🚀 Fast delivery across Senegal.\nLimited stock! Order now.\n\n📲 Reply to this message — top top !`;
    if (platform === "tiktok")    return `⚡ POV: you just found *${titre}* and it's giving klasse!\n\n🎬 Visual: Show *${titre}* from every angle, close-up on quality and style.\n\n🎤 Audio/On-screen text: "${brief.slice(0, 60)} — Sagnsé dëgg! Available now, link in bio 👇"\n\n${payLine}${tags}`;
    if (platform === "snapchat")  return `${e} *${titre}* — Dakar's finest !\n${brief.slice(0, 70)}…\n\n💨 Limited. Swipe up or DM ! 👆${tags}`;
  }

  // Default: français
  if (platform === "instagram") return `${e} Stop ! *${titre}* est exactement ce que tu cherchais — dëgër na !\nScrolle pas, tu vas le regretter.\n\n✨ ${brief}\n\n📸 Parfait pour ton feed — klasse garantie.\n\n✅ Livraison rapide à Dakar, Thiès, Mbour\n${payLine}\n\n📩 Commande en DM ou lien en bio 👇${tags}`;
  if (platform === "whatsapp")  return `${e} *${titre}* ✨\n\n👉 ${brief}\n\n💰 Tarif public : voir description\n🚀 Livraison rapide partout au Sénégal.\nStock limité ! Commandez directement ici.\n\n📲 Répondez à ce message — c'est paré !`;
  if (platform === "tiktok")    return `⚡ *${titre}* — c'est chaud au Sénégal là !\n\n🎬 Visuel : Montre *${titre}* sous toutes ses facettes, gros plan sur la qualité et le style.\n\n🎤 Audio/Texte à l'écran : "${brief.slice(0, 60)} — Klasse garantie ! Disponible maintenant, lien en bio 👇"\n\n${payLine}${tags}`;
  if (platform === "snapchat")  return `${e} *${titre}* — Dakar klasse ultime !\n${brief.slice(0, 70)}…\n\n💨 Stock limité. Swipe up ou DM ! 👆${tags}`;
  return `${e} *${titre}*\n\n${brief}\n\n${payLine}\n📩 Commande en DM !`;
}

function mockCopies(
  titre: string,
  brief: string,
  plateformes: string[],
  ton: string,
  langue: string,
  paymentMethod: string | null
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const p of plateformes) result[p] = mockOnePlatform(titre, brief, p, ton, langue, paymentMethod);
  return result;
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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length < 20) {
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.json({ copies: mockCopies(titre, brief, safePlateformes, safeTon, safeLangue, safePayment) });
  }

  // Server-side free trial enforcement (bypasses localStorage manipulation)
  const ip         = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const trialCount = await getTrialCount(ip);
  if (trialCount >= FREE_LIMIT_SERVER) {
    return NextResponse.json(
      { error: "Limite gratuite atteinte. Veuillez passer au paiement.", limitReached: true },
      { status: 403 }
    );
  }

  const client        = new OpenAI({ apiKey });
  const payment       = safePayment ? (PAYMENT_LABELS[safePayment] ?? "") : null;
  const platformKeys  = safePlateformes.join(", ");
  const platformNames = safePlateformes.map((p) => PLATFORM_LABELS[p] ?? p).join(", ");

  const langNameMap: Record<string, string> = {
    francais: "français",
    wolof:    "wolof",
    anglais:  "anglais",
    puular:   "pulaar (fuula)",
    serere:   "français (avec expressions sérères)",
  };

  // Hard language constraint — placed first in the prompt so the model cannot ignore it
  const langConstraint: Record<string, string> = {
    francais: "Rédige en FRANÇAIS. Injecte des expressions sénégalaises : « Klasse », « c'est chaud », « paré nga », « dëgër na », « gawa lool ».",
    wolof:    "⚠️ LANGUE OBLIGATOIRE : WOLOF UNIQUEMENT. Chaque mot de la copie DOIT être en wolof. Zéro phrase en français. Utilise : « deuredj li », « gawa lool », « paré nga », « sagnssé dëgg », « xam nga », « dafa neex », « amul solo », « jënd léegi ».",
    anglais:  "⚠️ MANDATORY LANGUAGE: ENGLISH ONLY. Every word must be in English. Zero French. Use Dakar energy: \"Dakar vibes\", \"klasse\", \"top top\", \"no cap\", \"it's giving\".",
    puular:   "⚠️ LANGUE OBLIGATOIRE : PULAAR (FUULA) UNIQUEMENT. Chaque mot de la copie DOIT être en pulaar. Zéro phrase en français. Utilise des expressions authentiques pulaar : « mboddi », « jaraama », « ko woni », « waawnude », « mo weli », « ndeke », « nguurndam ».",
    serere:   "Rédige en FRANÇAIS avec une âme sérère authentique. Intègre naturellement des expressions et salutations sérères : « Nan nga def », « Jàmm rekk », « Mbegaan », « A dëkk », « Fanaan », « Dii jàmm », « Roog laa naan » (formule de bénédiction), et des références culturelles du Sine-Saloum. Mélange le français et la culture sérère de façon fluide et naturelle.",
  };

  const tonMap: Record<string, string> = {
    professionnel: "professionnel, élégant et raffiné",
    amical:        "amical, chaleureux et proche",
    enthousiaste:  "enthousiaste, dynamique et percutant",
    luxueux:       "luxueux, exclusif et sophistiqué",
  };

  const platformRules = [
    safePlateformes.includes("instagram") ? "- instagram : Hook PERCUTANT sur 2 lignes MAX (punchline ou urgence culturelle sénégalaise : Tabaski, Gamou, Korité, sagnsé dëgg) pour arrêter le scroll. Corps aéré avec émojis naturels, liste de bénéfices, prix en FCFA si applicable, livraison (Dakar/Thiès/Mbour). CTA vers lien en bio ou DM Instagram. Termine par un bloc de hashtags Dakar/Sénégal." : "",
    safePlateformes.includes("whatsapp")  ? "- whatsapp : Nom du produit en titre avec émojis. Texte descriptif court et direct (bénéfices clients). Tarif public en FCFA si applicable. Livraison rapide partout au Sénégal. Mention 'Stock limité !'. CTA explicite : 'Commandez directement ici' ou 'Répondez à ce message'." : "",
    safePlateformes.includes("tiktok")    ? "- tiktok : Format script vidéo avec DEUX sections distinctes obligatoires — '🎬 Visuel :' (décrire ce que la caméra montre, 1-2 lignes) puis '🎤 Audio/Texte à l'écran :' (voix-off accrocheuse de 15 secondes max, entre guillemets). Énergie maximale, ton percutant. Hashtags TikTok SN en fin." : "",
    safePlateformes.includes("snapchat")  ? "- snapchat : Ultra-court (2-3 lignes MAX). Percutant et visuel. Urgence et exclusivité. CTA : 'Swipe up' ou 'DM direct'. Hashtag court optionnel." : "",
  ].filter(Boolean).join("\n");

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${langConstraint[safeLangue] ?? langConstraint.francais}

Tu es Sagnese AI, un copywriter d'élite spécialisé dans le e-commerce et le commerce social sénégalais à Dakar.
Tu dois répondre UNIQUEMENT avec un objet JSON valide contenant exactement ces clés : ${platformKeys}.
Chaque valeur est une copie de vente UNIQUE, haute conversion, culturellement authentique et optimisée pour sa plateforme.

RÈGLE ABSOLUE N°1 — LANGUE : ${(langConstraint[safeLangue] ?? langConstraint.francais).replace("⚠️ ", "")}

STRUCTURE OBLIGATOIRE pour chaque copie (respecter cet ordre) :
1. LE HOOK — Les 2 premières lignes : punchline percutante selon le ton OU question provocatrice OU urgence culturelle sénégalaise (Tabaski, Gamou, Korité, rentrée scolaire) pour ARRÊTER instantanément le scroll mobile.
2. LE CORPS — Transformer le brief en bénéfices clients irrésistibles. Aérer avec des émojis naturels et des listes à puces. Mentionner prix en FCFA si présent dans le brief, livraison rapide (Dakar, Thiès, Mbour, tout le Sénégal).
3. L'APPEL À L'ACTION (CTA) — Incitation claire et directe à commander immédiatement via lien en bio, DM, ou message WhatsApp.

RÈGLES STRICTES PAR PLATEFORME :
${platformRules}

TON : ${tonMap[safeTon] ?? tonMap.professionnel}

Format de réponse JSON (exemple) :
{ "instagram": "texte complet ici...", "whatsapp": "texte complet ici..." }`,
        },
        {
          role: "user",
          content: `Produit : ${titre}
Brief : ${brief}
Plateformes : ${platformNames}
Langue de rédaction : ${langNameMap[safeLangue] ?? "français"} — TOUTE la copie doit être rédigée en ${langNameMap[safeLangue] ?? "français"}, pas en français.
${payment ? `Moyen de paiement : ${payment}` : ""}

Génère le JSON. Chaque copie doit être intégralement en ${langNameMap[safeLangue] ?? "français"}.`,
        },
      ],
      max_tokens: 1400,
      temperature: 0.9,
      presence_penalty: 0.6,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let copies: Record<string, string> = {};
    try {
      copies = JSON.parse(raw) as Record<string, string>;
    } catch {
      copies = { [safePlateformes[0]]: raw };
    }
    // Ensure all requested platforms have an entry
    for (const p of safePlateformes) {
      if (!copies[p]) copies[p] = Object.values(copies)[0] ?? "";
    }

    await incrementTrialCount(ip);
    return NextResponse.json({ copies });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[/api/generate] OpenAI error:", message);
    return NextResponse.json({ error: "Erreur lors de la génération. Veuillez réessayer." }, { status: 502 });
  }
}
