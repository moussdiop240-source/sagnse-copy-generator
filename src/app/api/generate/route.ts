import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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
    if (platform === "instagram") return `${e} *${titre}* — style Dakar klasse ci feed bi!\nScrolle bul dem — dëgër na !\n\n✨ ${brief}\n\n📸 Élégance dakaroise — paré nga !\n\n✅ Livraison ci Dakar\n${payLine}\n\n📩 DM kanam ! 👇${tags}`;
    if (platform === "whatsapp")  return `${e} Salaam! *${titre}* lañu jënd tey.\n\n• ${brief}\n• Livraison Dakar 24h\n• ${payLine.replace("✅ ", "")}\n• Stock dafay tàmm !\n\n📲 Bindal ma ci DM — gaaw !`;
    if (platform === "tiktok")    return `⚡ Sagnssé dëgg — *${titre}* bi dafa gawa lool!\n${brief.slice(0, 80)}\n\n🎬 TikTok SN — scroll bul dem !\n${payLine}${tags}`;
    if (platform === "snapchat")  return `${e} *${titre}* — Dakar klasse!\n${brief.slice(0, 70)}…\n\n💨 Tàmm — DM kanam ! 👆${tags}`;
  }

  if (langue === "anglais") {
    if (platform === "instagram") return `${e} *${titre}* — Dakar vibes at their finest.\nStop scrolling. This one's for you.\n\n✨ ${brief}\n\n📸 Feed-worthy, klasse guaranteed.\n\n✅ Fast delivery in Dakar\n${payLine}\n\n📩 DM to order — no cap ! 👇${tags}`;
    if (platform === "whatsapp")  return `${e} Hey! You need to see *${titre}*.\n\n• ${brief}\n• Dakar delivery in 24h\n• ${payLine.replace("✅ ", "")}\n• Limited stock!\n\n📲 Reply to order now. Top top !`;
    if (platform === "tiktok")    return `⚡ POV: you just found *${titre}*\n${brief.slice(0, 80)}\n\n🎬 Dakar vibes only — it's giving klasse !\n${payLine}${tags}`;
    if (platform === "snapchat")  return `${e} *${titre}* — Dakar's finest !\n${brief.slice(0, 70)}…\n\n💨 Limited. Swipe up or DM ! 👆${tags}`;
  }

  // Default: français
  if (platform === "instagram") return `${e} *${titre}* — l'élégance dakaroise à son meilleur.\nScrolle pas ! Cette pièce est pour toi.\n\n✨ ${brief}\n\n📸 Parfait pour ton feed — klasse garantie.\n\n✅ Livraison rapide à Dakar\n${payLine}\n\n📩 Commande en DM — dëgër na ! 👇${tags}`;
  if (platform === "whatsapp")  return `${e} Salut ! Tu as vu *${titre}* ?\n\nVoilà ce qu'il faut savoir :\n\n• ${brief}\n• Livraison à Dakar sous 24h\n• ${payLine.replace("✅ ", "")}\n• Stock limité — commande maintenant !\n\n📲 Réponds à ce message pour commander. C'est paré !`;
  if (platform === "tiktok")    return `⚡ POV : tu scrolles et tu tombes sur *${titre}*\n\n${brief.slice(0, 80)}\n\n🎬 Dakar vibes only — c'est chaud !\n\n${payLine}\n📩 Lien en bio ou DM direct${tags}`;
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

  const client        = new OpenAI({ apiKey });
  const payment       = safePayment ? (PAYMENT_LABELS[safePayment] ?? "") : null;
  const platformKeys  = safePlateformes.join(", ");
  const platformNames = safePlateformes.map((p) => PLATFORM_LABELS[p] ?? p).join(", ");

  const langMap: Record<string, string> = {
    francais: "Rédige entièrement en français avec des expressions locales : « Klasse », « c'est chaud », « paré », « dëgër na ».",
    wolof:    "Rédige entièrement en wolof authentique avec des expressions : « deuredj li », « gawa lool », « paré nga », « sagnssé dëgg ».",
    anglais:  "Write entirely in English with Senegalese flair: \"Dakar vibes\", \"klasse\", \"top top\", \"no cap\".",
    puular:   "Rédige entièrement en pulaar/fuula avec : « mboddi », « jaraama », « ko woni ».",
    serere:   "Rédige entièrement en sérère avec des expressions authentiques sérères.",
  };

  const tonMap: Record<string, string> = {
    professionnel: "professionnel, élégant et raffiné",
    amical:        "amical, chaleureux et proche",
    enthousiaste:  "enthousiaste, dynamique et percutant",
    luxueux:       "luxueux, exclusif et sophistiqué",
  };

  const platformRules = [
    safePlateformes.includes("instagram") ? "- instagram : Texte visuel lifestyle, hook 2 lignes max qui arrête le scroll, corps avec émojis et listes, bloc hashtags Dakar en fin de texte." : "",
    safePlateformes.includes("whatsapp")  ? "- whatsapp : Texte direct et aéré, listes à puces claires, CTA explicite vers DM ou catalogue, ton conversationnel et chaleureux." : "",
    safePlateformes.includes("tiktok")    ? "- tiktok : Accroche ultra-courte style POV ou mini-script vidéo dynamique (3-4 lignes), énergie maximale, hashtags TikTok SN." : "",
    safePlateformes.includes("snapchat")  ? "- snapchat : Texte très court et punchy (2-3 lignes max), visuel, avec appel à l'action swipe up ou DM." : "",
  ].filter(Boolean).join("\n");

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Tu es un copywriter expert du e-commerce et du commerce social sénégalais pour la marque Sagnsé.
Tu dois répondre UNIQUEMENT avec un objet JSON valide contenant exactement ces clés : ${platformKeys}.
Chaque valeur est une copie de vente UNIQUE et ultra-spécifique, optimisée pour la plateforme correspondante.

Règles par plateforme :
${platformRules}

Chaque copie suit la structure : HOOK → CORPS → CTA.
${langMap[safeLangue] ?? langMap.francais}
Ton : ${tonMap[safeTon] ?? tonMap.professionnel}

Format de réponse JSON attendu (exemple pour instagram et whatsapp) :
{ "instagram": "texte complet ici...", "whatsapp": "texte complet ici..." }`,
        },
        {
          role: "user",
          content: `Produit : ${titre}
Brief : ${brief}
Plateformes : ${platformNames}
${payment ? `Moyen de paiement : ${payment}` : ""}

Génère le JSON avec une copie haute conversion et unique pour chaque plateforme.`,
        },
      ],
      max_tokens: 1200,
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

    return NextResponse.json({ copies });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[/api/generate] OpenAI error:", message);
    return NextResponse.json({ error: "Erreur lors de la génération. Veuillez réessayer." }, { status: 502 });
  }
}
