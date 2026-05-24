import OpenAI from "openai";

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  snapchat: "Snapchat",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
};

const PAYMENT_LABELS: Record<string, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
};

const LANG_MAP: Record<string, string> = {
  francais: "Rédige entièrement en français.",
  wolof: "Rédige entièrement en wolof (langue d'Afrique de l'Ouest parlée au Sénégal). Utilise un vocabulaire wolof authentique.",
  anglais: "Write entirely in English.",
  puular: "Rédige entièrement en pulaar/fuula (langue peule du Sénégal).",
  serere: "Rédige entièrement en sérère (langue du Sénégal).",
};

const TON_MAP: Record<string, string> = {
  professionnel: "ton professionnel, élégant et raffiné",
  amical: "ton amical, chaleureux et proche",
  enthousiaste: "ton enthousiaste, dynamique et percutant",
  luxueux: "ton luxueux, exclusif et sophistiqué",
};

function platformHashtags(plateformes: string[]): string {
  const tags: string[] = [];
  if (plateformes.includes("instagram")) tags.push("#Sagnsé", "#ModedakarSN", "#ShopeLocal");
  if (plateformes.includes("tiktok")) tags.push("#TikTokSN", "#DakarTrend", "#FYP");
  if (plateformes.includes("snapchat")) tags.push("#SnapSN");
  return tags.length ? "\n" + tags.join(" ") : "";
}

function mockCopy(
  titre: string,
  brief: string,
  plateformes: string[],
  ton: string,
  langue: string,
  paymentMethod: string
): string {
  const payment = PAYMENT_LABELS[paymentMethod] ?? paymentMethod;
  const hashtags = platformHashtags(plateformes);
  const isTikTok = plateformes.includes("tiktok");
  const isIG = plateformes.includes("instagram");
  const isWA = plateformes.includes("whatsapp");
  const toneEmoji: Record<string, string> = {
    professionnel: "✨",
    amical: "😊",
    enthousiaste: "🔥",
    luxueux: "👑",
  };
  const em = toneEmoji[ton] ?? "✨";

  if (langue === "wolof") {
    return `${em} *${titre}* ${em}\n\n${brief}\n\n${
      isTikTok ? "⚡ Tey dafa am, suba dafa jeex!" : isIG ? "📸 Style bi dafa neex — Dakar style ak classe!" : isWA ? "📲 Xamal sa xarit yi — dafa am promotion!" : "💎 Sagnsé — élégance bi moy sa droit!"
    }\n\n✅ Yomb lañ ko jënd\n✅ Livraison ci Dakar\n✅ Jënd ci ${payment} — gaaw te yomb!\n\nBindal sa yëgël ci comment walla DM! 👇${hashtags}`;
  }

  if (langue === "anglais") {
    const tonePhrases: Record<string, string> = {
      professionnel: `Elevate your style with *${titre}* — crafted for the discerning Dakar woman.`,
      amical: `Hey love! Have you heard about *${titre}*? Your skin will thank you! 😊`,
      enthousiaste: `🔥 OH WOW — *${titre}* just dropped and it's EVERYTHING!!`,
      luxueux: `👑 Luxury redefined. *${titre}* — for those who know their worth.`,
    };
    return `${tonePhrases[ton] ?? tonePhrases.professionnel}\n\n${brief}\n\n${
      isTikTok ? "⚡ Trending now on TikTok SN!" : isIG ? "📸 Made for your feed. Made for Dakar." : ""
    }\n\n✅ Fast delivery across Dakar\n✅ Pay easily via ${payment}\n\nDM us or drop a comment below! 👇${hashtags}`;
  }

  const tonePhrases: Record<string, string> = {
    professionnel: `Découvrez *${titre}* — l'excellence au service de votre style dakarois.`,
    amical: `Eh toi ! 😊 Tu cherches *${titre}* ? On a exactement ce qu'il te faut !`,
    enthousiaste: `🔥 ALERTE PROMO ! *${titre}* est enfin disponible et ça va te changer la vie !!`,
    luxueux: `👑 Le luxe à votre portée. *${titre}* — parce que vous le méritez.`,
  };

  return `${tonePhrases[ton] ?? tonePhrases.professionnel}\n\n${brief}\n\n${
    isTikTok ? "⚡ Le produit qui fait le buzz sur TikTok SN !" : isIG ? "📸 L'élégance dakaroise dans chaque détail — parfait pour ton feed." : isWA ? "📲 Partage avec tes amies — cette offre est trop bonne pour la garder !" : ""
  }\n\n✅ Livraison rapide à Dakar\n✅ Qualité 100% authentique\n✅ Paiement facile via ${payment}\n\nCommande maintenant ou écris-nous en DM ! 👇${hashtags}`;
}

export interface GenerateInput {
  titre: string;
  brief: string;
  plateformes: string[];
  ton: string;
  langue: string;
  paymentMethod: string;
}

export async function generateCopy(input: GenerateInput, apiKey: string): Promise<string> {
  const { titre, brief, plateformes, ton, langue, paymentMethod } = input;

  if (!apiKey || apiKey.length < 20) {
    await new Promise((r) => setTimeout(r, 800));
    return mockCopy(titre, brief, plateformes, ton, langue, paymentMethod);
  }

  const client = new OpenAI({ apiKey });
  const platformNames = plateformes.map((p) => PLATFORM_LABELS[p] ?? p).join(", ");
  const payment = PAYMENT_LABELS[paymentMethod] ?? paymentMethod;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Tu es un expert en copywriting e-commerce mode au Sénégal pour la plateforme Sagnsé.
Tu rédiges des copies de vente courtes, percutantes et adaptées aux réseaux sociaux dakarois.
Style : élégance, classe, raffinement — le goût dakarois dans chaque mot.
Utilise des émojis pertinents, des hashtags adaptés à la plateforme, et un style accrocheur.
${LANG_MAP[langue] ?? LANG_MAP.francais}
Réponds uniquement avec la copie de vente — sans introduction ni commentaire.`,
      },
      {
        role: "user",
        content: `Produit : ${titre}
Brief : ${brief}
Plateformes : ${platformNames}
Ton : ${TON_MAP[ton] ?? TON_MAP.professionnel}
Moyen de paiement disponible : ${payment}

Génère une copie de vente haute conversion pour ce produit.`,
      },
    ],
    max_tokens: 600,
    temperature: 0.85,
  });

  return completion.choices[0]?.message?.content ?? "";
}
