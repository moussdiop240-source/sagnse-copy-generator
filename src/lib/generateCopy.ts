import OpenAI from "openai";

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

const LANG_MAP: Record<string, string> = {
  francais: "Rédige entièrement en français avec des expressions locales : « Klasse », « c'est chaud », « paré », « dëgër na ».",
  wolof:    "Rédige entièrement en wolof authentique avec des expressions : « deuredj li », « gawa lool », « paré nga », « sagnssé dëgg ».",
  anglais:  "Write entirely in English with Senegalese flair: \"Dakar vibes\", \"klasse\", \"top top\", \"no cap\".",
  puular:   "Rédige entièrement en pulaar/fuula avec : « mboddi », « jaraama », « ko woni ».",
  serere:   "Rédige entièrement en sérère avec des expressions authentiques sérères.",
};

const TON_MAP: Record<string, string> = {
  professionnel: "professionnel, élégant et raffiné",
  amical:        "amical, chaleureux et proche",
  enthousiaste:  "enthousiaste, dynamique et percutant",
  luxueux:       "luxueux, exclusif et sophistiqué",
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
  paymentMethod: string
): string {
  const payment  = PAYMENT_LABELS[paymentMethod] ?? paymentMethod;
  const payLine  = `✅ Paiement facile via ${payment}`;
  const tags     = hashtags(platform);
  const em: Record<string, string> = { professionnel: "✨", amical: "😊", enthousiaste: "🔥", luxueux: "👑" };
  const e = em[ton] ?? "✨";

  if (platform === "instagram") return `${e} *${titre}* — l'élégance dakaroise à son meilleur.\nScrolle pas ! Cette pièce est pour toi.\n\n✨ ${brief}\n\n📸 Parfait pour ton feed — klasse garantie.\n\n✅ Livraison rapide à Dakar\n${payLine}\n\n📩 Commande en DM — dëgër na ! 👇${tags}`;
  if (platform === "whatsapp")  return `${e} Salut ! Tu as vu *${titre}* ?\n\nVoilà ce qu'il faut savoir :\n\n• ${brief}\n• Livraison à Dakar sous 24h\n• ${payment} disponible\n• Stock limité — commande maintenant !\n\n📲 Réponds à ce message pour commander. C'est paré !`;
  if (platform === "tiktok")    return `⚡ POV : tu scrolles et tu tombes sur *${titre}*\n\n${brief.slice(0, 80)}\n\n🎬 Dakar vibes only — c'est chaud !\n\n${payLine}\n📩 Lien en bio ou DM direct${tags}`;
  if (platform === "snapchat")  return `${e} *${titre}* — Dakar klasse ultime !\n${brief.slice(0, 70)}…\n\n💨 Stock limité. Swipe up ou DM ! 👆${tags}`;
  return `${e} *${titre}*\n\n${brief}\n\n${payLine}\n📩 Commande en DM !`;
}

function mockCopies(input: GenerateInput): Record<string, string> {
  const { titre, brief, plateformes, ton, paymentMethod } = input;
  const result: Record<string, string> = {};
  for (const p of plateformes) result[p] = mockOnePlatform(titre, brief, p, ton, paymentMethod);
  return result;
}

export interface GenerateInput {
  titre: string;
  brief: string;
  plateformes: string[];
  ton: string;
  langue: string;
  paymentMethod: string;
}

export class GenerateError extends Error {
  constructor(
    public readonly code: "QUOTA_EXCEEDED" | "INVALID_API_KEY" | "TIMEOUT" | "API_ERROR",
    message: string
  ) {
    super(message);
    this.name = "GenerateError";
  }
}

export async function generateCopy(input: GenerateInput, apiKey: string): Promise<Record<string, string>> {
  const { titre, brief, plateformes, ton, langue, paymentMethod } = input;

  if (!apiKey || apiKey.length < 20) {
    await new Promise((r) => setTimeout(r, 800));
    return mockCopies(input);
  }

  const client = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 1 });

  const payment       = PAYMENT_LABELS[paymentMethod] ?? paymentMethod;
  const platformKeys  = plateformes.join(", ");
  const platformNames = plateformes.map((p) => PLATFORM_LABELS[p] ?? p).join(", ");

  const platformRules = [
    plateformes.includes("instagram") ? "- instagram : Texte visuel lifestyle, hook 2 lignes max qui arrête le scroll, corps avec émojis et listes, bloc hashtags Dakar en fin de texte." : "",
    plateformes.includes("whatsapp")  ? "- whatsapp : Texte direct et aéré, listes à puces claires, CTA explicite vers DM ou catalogue, ton conversationnel et chaleureux." : "",
    plateformes.includes("tiktok")    ? "- tiktok : Accroche ultra-courte style POV ou mini-script vidéo dynamique (3-4 lignes), énergie maximale, hashtags TikTok SN." : "",
    plateformes.includes("snapchat")  ? "- snapchat : Texte très court et punchy (2-3 lignes max), visuel, avec appel à l'action swipe up ou DM." : "",
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
${LANG_MAP[langue] ?? LANG_MAP.francais}
Ton : ${TON_MAP[ton] ?? TON_MAP.professionnel}

Format de réponse JSON attendu :
{ "instagram": "texte complet ici...", "whatsapp": "texte complet ici..." }`,
        },
        {
          role: "user",
          content: `Produit : ${titre}
Brief : ${brief}
Plateformes : ${platformNames}
Moyen de paiement : ${payment}

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
      copies = { [plateformes[0]]: raw };
    }
    for (const p of plateformes) {
      if (!copies[p]) copies[p] = Object.values(copies)[0] ?? "";
    }
    return copies;
  } catch (err: unknown) {
    const status  = (err as { status?: number })?.status;
    const errName = err instanceof Error ? err.name : "";

    if (status === 429)                  throw new GenerateError("QUOTA_EXCEEDED",  "OpenAI quota exceeded");
    if (status === 401)                  throw new GenerateError("INVALID_API_KEY", "OpenAI API key invalid");
    if (errName === "APIConnectionTimeoutError" ||
        errName === "APITimeoutError")   throw new GenerateError("TIMEOUT",         "OpenAI call timed out");

    throw new GenerateError("API_ERROR", err instanceof Error ? err.message : "Unknown OpenAI error");
  }
}
