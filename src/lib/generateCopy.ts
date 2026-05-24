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
  francais: "Rédige entièrement en français. Glisse naturellement une ou deux expressions locales imagées parmi : « Klasse », « c'est chaud », « paré », « dëgër na », « trop bien ça ».",
  wolof:    "Rédige entièrement en wolof authentique. Intègre subtilement des expressions comme : « deuredj li », « gawa lool », « paré nga », « dëgër na », « sagnssé dëgg ».",
  anglais:  "Write entirely in English. Weave in subtle Senegalese flair with expressions like \"Dakar vibes\", \"klasse\", \"top top\", \"no cap\" to feel local.",
  puular:   "Rédige entièrement en pulaar/fuula. Intègre des expressions locales comme : « mboddi », « jaraama », « ko woni » pour un ton authentique.",
  serere:   "Rédige entièrement en sérère. Donne une âme locale avec des expressions authentiques sérères.",
};

const TON_MAP: Record<string, string> = {
  professionnel: "ton professionnel, élégant et raffiné",
  amical:        "ton amical, chaleureux et proche",
  enthousiaste:  "ton enthousiaste, dynamique et percutant",
  luxueux:       "ton luxueux, exclusif et sophistiqué",
};

function platformHashtags(plateformes: string[]): string {
  const tags: string[] = [];
  if (plateformes.includes("instagram")) tags.push("#Sagnsé", "#ModedakarSN", "#ShopeLocal");
  if (plateformes.includes("tiktok"))    tags.push("#TikTokSN", "#DakarTrend", "#FYP");
  if (plateformes.includes("snapchat"))  tags.push("#SnapSN");
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
  const payment  = PAYMENT_LABELS[paymentMethod] ?? paymentMethod;
  const hashtags = platformHashtags(plateformes);
  const isTikTok = plateformes.includes("tiktok");
  const isIG     = plateformes.includes("instagram");
  const isWA     = plateformes.includes("whatsapp");

  if (langue === "wolof") {
    const hooks = [
      `🔥 Sagnssé dëgg — *${titre}* bi dafa ànd ak style bi!\nDëgër na, paré nga pour Korité ?`,
      `✨ Dafa gawa lool ! *${titre}* — deuredj li ci Dakar!\nXam nga loolu ? Tey lañu ko jënd !`,
    ];
    const hook = hooks[Math.floor(Math.random() * hooks.length)];
    return `${hook}\n\n✨ ${brief}\n\n${
      isTikTok ? "⚡ TikTok SN dafa ko xam — scroll bul dem!" :
      isIG     ? "📸 Feed bi dafa neex ak style Dakar klasse!" :
      isWA     ? "📲 Sos sa xarit yi — promotion bi dafa tàmm!" :
                 "💎 Élégance bi moy sa droit — Sagnsé!"
    }\n\n✅ Yomb lañ ko jënd\n✅ Livraison ci Dakar\n✅ Jënd ci ${payment} — gaaw te yomb!\n\n📩 Bindal sa yëgël ci comment walla DM bu kanam! 👇${hashtags}`;
  }

  if (langue === "anglais") {
    const hooks: Record<string, string> = {
      professionnel: `Are you still sleeping on *${titre}*? Dakar's most elegant women aren't. ✨\nThis is your sign — klasse doesn't wait.`,
      amical:        `Hey love 😊 — *${titre}* just landed and it's giving TOP TOP!\nYour next favourite piece is right here.`,
      enthousiaste:  `🔥 NO CAP — *${titre}* is the one everyone's been asking about!!\nDakar vibes, global standards.`,
      luxueux:       `👑 Some things are made for those who know their worth.\n*${titre}* — luxury, redefined for the Dakar woman.`,
    };
    return `${hooks[ton] ?? hooks.professionnel}\n\n✨ ${brief}\n\n${
      isTikTok ? "⚡ Trending hard on TikTok SN — don't miss out!" :
      isIG     ? "📸 Made for your feed. Made for Dakar." :
      isWA     ? "📲 Share with your crew — this one's too good to keep!" : ""
    }\n\n✅ Fast delivery across Dakar\n✅ 100% authentic quality\n✅ Easy payment via ${payment}\n\n📩 DM us or drop a comment — order now! 👇${hashtags}`;
  }

  const hooks: Record<string, string> = {
    professionnel: `Tu cherches l'élégance qui parle avant même que tu ouvres la bouche ? ✨\n*${titre}* — le style dakarois dans toute sa splendeur.`,
    amical:        `Eh toi ! 😊 T'as vu *${titre}* ? C'est chaud, paré — exactement ce qu'il te fallait !\nOn t'attendait.`,
    enthousiaste:  `🔥 ALERTE KLASSE ! *${titre}* vient d'arriver et ça va tout changer !!\nDakar, vous êtes paré ?`,
    luxueux:       `👑 Le luxe n'est plus un rêve.\n*${titre}* — pour celles qui savent ce qu'elles valent.`,
  };

  return `${hooks[ton] ?? hooks.professionnel}\n\n✨ ${brief}\n\n${
    isTikTok ? "⚡ Le buzz sur TikTok SN — arrête ton scroll !" :
    isIG     ? "📸 L'élégance dakaroise dans chaque détail — parfait pour ton feed." :
    isWA     ? "📲 Partage avec tes amies — cette offre est trop bonne pour la garder !" : ""
  }\n\n✅ Livraison rapide à Dakar\n✅ Qualité 100% authentique\n✅ Paiement facile via ${payment}\n\n📩 Commande maintenant ou écris-nous en DM — dëgër na ! 👇${hashtags}`;
}

export interface GenerateInput {
  titre: string;
  brief: string;
  plateformes: string[];
  ton: string;
  langue: string;
  paymentMethod: string;
}

// Named error codes surfaced to callers for user-friendly messages
export class GenerateError extends Error {
  constructor(
    public readonly code: "QUOTA_EXCEEDED" | "INVALID_API_KEY" | "TIMEOUT" | "API_ERROR",
    message: string
  ) {
    super(message);
    this.name = "GenerateError";
  }
}

export async function generateCopy(input: GenerateInput, apiKey: string): Promise<string> {
  const { titre, brief, plateformes, ton, langue, paymentMethod } = input;

  // Dev/demo mode: no valid key → return rich mock instantly
  if (!apiKey || apiKey.length < 20) {
    await new Promise((r) => setTimeout(r, 800));
    return mockCopy(titre, brief, plateformes, ton, langue, paymentMethod);
  }

  const client = new OpenAI({
    apiKey,
    timeout: 30_000,
    maxRetries: 1,
  });

  const platformNames = plateformes.map((p) => PLATFORM_LABELS[p] ?? p).join(", ");
  const payment       = PAYMENT_LABELS[paymentMethod] ?? paymentMethod;

  const platformContext = plateformes.includes("tiktok") || plateformes.includes("instagram")
    ? "TikTok/Instagram (le HOOK doit arrêter le scroll en moins de 2 secondes)"
    : plateformes.includes("whatsapp")
      ? "WhatsApp (ton conversationnel, urgence immédiate)"
      : "Snapchat (court, visuel, percutant)";

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es un copywriter expert du e-commerce sénégalais, spécialisé dans la vente de mode et de beauté sur les réseaux sociaux dakarois (Sagnsé).
Chaque copie que tu génères est UNIQUE — structure de phrase, vocabulaire et accroche différents à chaque fois.
Tu suis IMPÉRATIVEMENT cette structure en 3 blocs :

**BLOC 1 — LE HOOK (2 lignes max)**
Lance une punchline percutante, une question provocatrice OU une urgence culturelle sénégalaise (Tabaski, Gamou, Korité, sagnssé dëgg, mariages, tenue de fête).
Le but : arrêter net le scroll sur ${platformContext}.

**BLOC 2 — LE CORPS**
Transforme le brief produit en bénéfices clients irrésistibles.
Utilise des émojis pertinents, des listes à puces aérées, des formulations qui parlent à la femme dakaroise moderne.

**BLOC 3 — L'APPEL À L'ACTION (CTA)**
Incitation claire et urgente à commander maintenant via DM ou WhatsApp. Mentionne le moyen de paiement disponible.
Termine par les hashtags adaptés à la plateforme.

${LANG_MAP[langue] ?? LANG_MAP.francais}
Réponds UNIQUEMENT avec la copie finale — zéro introduction, zéro commentaire, zéro titre de bloc.`,
        },
        {
          role: "user",
          content: `Produit : ${titre}
Brief : ${brief}
Plateformes : ${platformNames}
Ton : ${TON_MAP[ton] ?? TON_MAP.professionnel}
Moyen de paiement : ${payment}

Génère une copie de vente haute conversion pour ce produit. Commence directement par le HOOK.`,
        },
      ],
      max_tokens: 600,
      temperature: 0.9,
      presence_penalty: 0.6,
    });

    return completion.choices[0]?.message?.content?.trim() ?? "";
  } catch (err: unknown) {
    // Classify OpenAI SDK errors into actionable codes
    const status  = (err as { status?: number })?.status;
    const errName = err instanceof Error ? err.name : "";

    if (status === 429)                  throw new GenerateError("QUOTA_EXCEEDED",  "OpenAI quota exceeded");
    if (status === 401)                  throw new GenerateError("INVALID_API_KEY", "OpenAI API key invalid");
    if (errName === "APIConnectionTimeoutError" ||
        errName === "APITimeoutError")   throw new GenerateError("TIMEOUT",         "OpenAI call timed out");

    throw new GenerateError("API_ERROR", err instanceof Error ? err.message : "Unknown OpenAI error");
  }
}
