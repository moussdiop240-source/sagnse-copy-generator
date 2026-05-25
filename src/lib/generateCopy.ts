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
  francais: "Rédige en français avec une âme dakaroise. Injecte naturellement des expressions sénégalaises imagées : « Klasse », « c'est chaud », « paré nga », « dëgër na », « gawa lool », « Wawaw », « Neexna », « Xessal ». Mélange l'élégance du français et l'authenticité culturelle de Dakar.",
  wolof:    "Rédige entièrement en wolof authentique. Utilise des expressions percutantes : « deuredj li », « gawa lool », « paré nga », « sagnssé dëgg », « xam nga », « dafa neex ».",
  anglais:  "Write entirely in English with bold Senegalese Dakar energy: \"Dakar vibes\", \"klasse\", \"top top\", \"no cap\", \"it's giving\", \"sagnsé dëgg\".",
  puular:   "Rédige entièrement en pulaar/fuula. Utilise des expressions authentiques : « mboddi », « jaraama », « ko woni », « waawnude », « mo weli ».",
  serere:   "Rédige entièrement en sérère avec des expressions et tournures de phrases authentiques sérères.",
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

  if (platform === "instagram") return `${e} Stop ! *${titre}* est exactement ce que tu cherchais — dëgër na !\nScrolle pas, tu vas le regretter.\n\n✨ ${brief}\n\n📸 Parfait pour ton feed — klasse garantie.\n\n✅ Livraison rapide à Dakar, Thiès, Mbour\n${payLine}\n\n📩 Commande en DM ou lien en bio 👇${tags}`;
  if (platform === "whatsapp")  return `✨ *${titre}* ✨\n\n👉 ${brief}\n\n💰 Tarif : voir description\n🚀 Livraison rapide partout au Sénégal.\nStock limité ! Commandez directement ici.\n\n📲 Répondez à ce message — c'est paré !`;
  if (platform === "tiktok")    return `⚡ *${titre}* — c'est chaud au Sénégal là !\n\n🎬 Visuel : Montre *${titre}* sous toutes ses facettes, gros plan sur la qualité et le style.\n\n🎤 Audio/Texte à l'écran : "${brief.slice(0, 60)} — Klasse garantie ! Disponible maintenant, lien en bio 👇"\n\n${payLine}${tags}`;
  if (platform === "snapchat")  return `${e} *${titre}* — Dakar klasse ultime !\n${brief.slice(0, 70)}…\n\n💨 Stock limité. Swipe up ou DM ! 👆${tags}`;
  return `${e} *${titre}*\n\n${brief}\n\n${payLine}\n📩 Commande en DM !`;
}

function mockCopies(input: GenerateInput): Record<string, string> {
  const { titre, brief, plateformes, ton, paymentMethod = "mobile" } = input;
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
  paymentMethod?: string;
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
  const { titre, brief, plateformes, ton, langue, paymentMethod = "mobile" } = input;

  if (!apiKey || apiKey.length < 20) {
    await new Promise((r) => setTimeout(r, 800));
    return mockCopies(input);
  }

  const client = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 1 });

  const payment       = PAYMENT_LABELS[paymentMethod] ?? "paiement mobile";
  const platformKeys  = plateformes.join(", ");
  const platformNames = plateformes.map((p) => PLATFORM_LABELS[p] ?? p).join(", ");

  const platformRules = [
    plateformes.includes("instagram") ? "- instagram : Hook PERCUTANT sur 2 lignes MAX (punchline ou urgence culturelle sénégalaise : Tabaski, Gamou, Korité, sagnsé dëgg) pour arrêter le scroll. Corps aéré avec émojis naturels, liste de bénéfices, prix en FCFA si applicable, livraison (Dakar/Thiès/Mbour). CTA vers lien en bio ou DM Instagram. Termine par un bloc de hashtags Dakar/Sénégal." : "",
    plateformes.includes("whatsapp")  ? "- whatsapp : Nom du produit en titre avec émojis. Texte descriptif court et direct (bénéfices clients). Tarif public en FCFA si applicable. Livraison rapide partout au Sénégal. Mention 'Stock limité !'. CTA explicite : 'Commandez directement ici' ou 'Répondez à ce message'." : "",
    plateformes.includes("tiktok")    ? "- tiktok : Format script vidéo avec DEUX sections distinctes obligatoires — '🎬 Visuel :' (décrire ce que la caméra montre, 1-2 lignes) puis '🎤 Audio/Texte à l'écran :' (voix-off accrocheuse de 15 secondes max, entre guillemets). Énergie maximale, ton percutant. Hashtags TikTok SN en fin." : "",
    plateformes.includes("snapchat")  ? "- snapchat : Ultra-court (2-3 lignes MAX). Percutant et visuel. Urgence et exclusivité. CTA : 'Swipe up' ou 'DM direct'. Hashtag court optionnel." : "",
  ].filter(Boolean).join("\n");

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Tu es Sagnese AI, un copywriter d'élite spécialisé dans le e-commerce et le commerce social sénégalais à Dakar.
Tu dois répondre UNIQUEMENT avec un objet JSON valide contenant exactement ces clés : ${platformKeys}.
Chaque valeur est une copie de vente UNIQUE, haute conversion, culturellement authentique et optimisée pour sa plateforme.

STRUCTURE OBLIGATOIRE pour chaque copie (respecter cet ordre) :
1. LE HOOK — Les 2 premières lignes : punchline percutante selon le ton OU question provocatrice OU urgence culturelle sénégalaise (Tabaski, Gamou, Korité, sagnsé dëgg, rentrée scolaire) pour ARRÊTER instantanément le scroll mobile.
2. LE CORPS — Transformer le brief en bénéfices clients irrésistibles. Aérer avec des émojis naturels et des listes à puces. Mentionner prix en FCFA si présent dans le brief, livraison rapide (Dakar, Thiès, Mbour, tout le Sénégal).
3. L'APPEL À L'ACTION (CTA) — Incitation claire et directe à commander immédiatement via lien en bio, DM, ou message WhatsApp.

RÈGLES STRICTES PAR PLATEFORME :
${platformRules}

VARIABILITÉ CULTURELLE OBLIGATOIRE :
Injecte de façon fluide et naturelle des expressions urbaines locales imagées pour donner une âme unique à chaque texte.
${LANG_MAP[langue] ?? LANG_MAP.francais}
Ton : ${TON_MAP[ton] ?? TON_MAP.professionnel}

Format de réponse JSON (exemple) :
{ "instagram": "texte complet ici...", "whatsapp": "texte complet ici..." }`,
        },
        {
          role: "user",
          content: `Produit : ${titre}
Brief : ${brief}
Plateformes : ${platformNames}
Moyen de paiement : ${payment}

Génère le JSON avec une copie haute conversion et culturellement authentique pour chaque plateforme.`,
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
