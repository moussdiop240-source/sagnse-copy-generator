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
  francais: "Rédige en français dakarois. Injecte : « Klasse », « c'est chaud », « paré nga », « dëgër na », « gawa lool ».",
  wolof:    "⚠️ WOLOF REKK — Bind ci WOLOF YÉP. Dara ci français dëkk du sore. Jëfandikoo: « Sagnssé dëgg », « Gawa lool », « Paré nga », « Dëgër na », « Dafa neex », « Jënd léegi », « Tàmm bëgg na dem », « Xam nga loolu ? », « Deuredj li », « Gaaw lool », « Xóol ! », « Ak jaay », « Jëkk na ».",
  anglais:  "Write entirely in English. Dakar energy: \"Dakar vibes\", \"klasse\", \"top top\", \"no cap\", \"it's giving\", \"sagnsé dëgg\".",
  puular:   "⚠️ PULAAR REKK — Siftina PULAAR timmungal. Haala PULAAR e dente fof. Ɗum woni tiinde — tagi français walla wolof. Jëfandikoo : « Mboddi », « Jaraama », « Ko woni », « Waawnude », « Mo weli », « Ndeke », « Nguurndam », « Yeeso », « Fiɗtude », « Ƴamde ». CTA WhatsApp → « Ndar miin, min njahata yeeso ! » CTA Snapchat → « Yiyto kadi — ndar miin ! » CTA Instagram → « Ndar DM maa walla yiyto liɗɗi bio 👇 »",
  serere:   "Rédige en FRANÇAIS avec âme sérère. Intègre : « Nan nga def », « Jàmm rekk », « Mbegaan », « Dii jàmm », « Roog laa naan », références Sine-Saloum.",
};

const LANG_EXAMPLE: Record<string, string> = {
  francais: `{
  "instagram": "🌹 L'élégance à la dakaroise — ce parfum, tout Dakar s'en souvient.\\n\\n✨ Sillage envoûtant 12h — dëgër na !\\n🌿 100% naturel, sans alcool\\n💎 Flacon luxueux, parfait comme cadeau\\n💰 3500 FCFA — klasse garantie\\n🚀 Livraison Dakar 24h\\n\\n📩 Commande en DM ou lien en bio 👇\\n#Dakar #Parfum",
  "whatsapp": "🌹 *Rose des Sables — Parfum Premium*\\n\\n✨ Sillage 12h — neex na !\\n🌿 100% naturel\\n💰 Prix : 3500 FCFA\\n🚀 Livraison rapide. Stock limité !\\n\\n📲 Répondez à ce message pour commander maintenant !"
}`,
  wolof: `{
  "instagram": "🍚 Thiébou djen bi dafa neex lool — Dakar dëkk yi xam na !\\n\\n🌶️ Poisson bi rafet na ak épices yi 100% naturel\\n⏱️ Jëkk na ci 30 minutes\\n👨‍👩‍👧‍👦 Ngir 4 nit — dëgër na !\\n💰 4500 FCFA — gawa lool, jënd léegi !\\n🚀 Livraison Dakar ci 1 heure\\n\\n📩 DM kanam wala lien ci bio 👇\\n#Dakar #Thiéboudiène #Sénégal",
  "whatsapp": "🍚 *Thiéboudiène Royal — Ceeb ak jën premium* 🌶️\\n\\n🌿 Épices naturel 100% — sagnssé dëgg !\\n⏱️ Jëkk na ci 30 min ngir 4 nit\\n💰 Jënd : 4500 FCFA\\n🚀 Livraison Dakar ci 1h. Tàmm bëgg na dem !\\n\\n📲 Bindal ma wax — gaaw !"
}`,
  anglais: `{
  "instagram": "🔥 Rose des Sables — Dakar's finest fragrance, no cap !\\n\\n✨ 12h sillage — it's giving luxury !\\n🌿 100% natural, no alcohol\\n💎 Perfect as a gift — klasse guaranteed\\n💰 3500 FCFA only\\n🚀 Dakar delivery in 24h\\n\\n📩 DM to order or link in bio 👇\\n#Dakar #Senegal #Perfume #DakarVibes",
  "whatsapp": "🌹 *Rose des Sables — Premium Fragrance* ✨\\n\\n✨ 12h sillage — top top !\\n🌿 100% natural, no alcohol\\n💎 Great as a gift\\n💰 Price: 3500 FCFA\\n🚀 Fast delivery across Senegal. Limited stock!\\n\\n📲 Reply to this message to order now!",
  "tiktok": "🎬 Visual: Close-up on the bottle, a touch on the wrist, big smile.\\n🎤 Audio/On-screen text: \\"Rose des Sables — it's giving Dakar klasse ! 12h fragrance, 100% natural, 3500 FCFA. Link in bio now!\\"\\n#TikTokSN #Perfume #DakarVibes",
  "snapchat": "🌹 Rose des Sables — klasse ultime ! 12h fragrance, 3500 FCFA. Limited stock. Swipe up 👆 or DM direct !"
}`,
  puular: `{
  "instagram": "🍚 Thiéboudiène Royal — ɗum ko nguurndam Dakar, mboddi !\\n\\n🌶️ Jën bi jaraama ak épices 100% gaa nii\\n⏱️ Waawnude e nder 30 miniti\\n👨‍👩‍👧‍👦 Ngir 4 neɗɗo — ko woni !\\n💰 4500 FCFA — fiɗtude laaɓi\\n🚀 Tiindol Dakar e nder 1 waktu\\n\\n📩 Ndar DM maa walla yiyto liɗɗi bio 👇\\n#Dakar #Senegaal #Thiéboudiène",
  "whatsapp": "🍚 *Thiéboudiène Royal — Ceeb ak jën premium* 🌶️\\n\\n🌿 Épices gaa nii 100% — waawnude !\\n⏱️ Waawnude e nder 30 min ngir 4 neɗɗo\\n💰 Ƴamdu : 4500 FCFA\\n🚀 Tiindol Dakar e nder 1h. Yeeso, ndaar maɗɗen !\\n\\n📲 Ndar miin, min njahata yeeso !"
}`,
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
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `⚠️ LANGUE OBLIGATOIRE : ${(LANG_MAP[langue] ?? LANG_MAP.francais).replace("⚠️ ", "")}
Ton : ${TON_MAP[ton] ?? TON_MAP.professionnel}

Tu es Sagnese AI, copywriter d'élite du e-commerce sénégalais à Dakar.
Réponds UNIQUEMENT avec un objet JSON valide contenant exactement ces clés : ${platformKeys}.

⚠️ RÈGLE ABSOLUE — LE HOOK NE DOIT JAMAIS ÊTRE UNE QUESTION ⚠️
La 1ère ligne = 1 affirmation percutante (jamais "?").
❌ INTERDIT : "Prêt à ?", "Envie de ?", "Vous cherchez ?", "Tu veux ?"
✅ OBLIGATOIRE : exclamation choc, révélation, urgence, affirmation forte.

━━━ STRUCTURE OBLIGATOIRE ━━━

HOOK : 1 seule ligne affirmative. Ligne vide après.
CORPS : Bullets émojis variés (✅ 🌿 💡 🚀 💎 🎁). Prix FCFA. Livraison. Ligne vide après.
CTA — adapte dans la langue choisie :
  Instagram → DM ou lien bio + hashtags (ex: "📩 Commande en DM" / "Ndar DM maa" / "DM to order")
  WhatsApp  → CTA direct dans la langue (ex: "Répondez à ce message" / "Bindal ma wax" / "Ndar miin, min njahata yeeso !" / "Reply to this message")
  TikTok    → CTA dans l'audio dans la langue + hashtags
  Snapchat  → Ultra-court dans la langue (ex: "Swipe up 👆" / "Yiyto kadi — ndar miin !" / "Swipe up or DM")

━━━ RÈGLES PAR PLATEFORME ━━━
${platformRules}

EXEMPLE DE SORTIE PARFAITE :
${LANG_EXAMPLE[langue] ?? LANG_EXAMPLE.francais}`,
        },
        {
          role: "user",
          content: `Produit : ${titre}
Brief : ${brief}
Plateformes : ${platformNames}
Moyen de paiement : ${payment}
${langue !== "francais" ? `\n⚠️ IMPORTANT : Traduis le brief ci-dessus dans la langue cible (${LANG_MAP[langue]?.split("—")[0]?.replace(/⚠️.*?:/,"").trim() ?? langue}) avant de rédiger. Le corps de la copie doit être entièrement dans cette langue, pas en français.` : ""}

Génère le JSON. Hook = affirmation percutante (jamais une question). Corps aéré avec émojis. CTA clair par plateforme.`,
        },
      ],
      max_tokens: 1600,
      temperature: 0.92,
      presence_penalty: 0.7,
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

    // Post-validate: if any hook (first line) is a question, replace it with a strong affirmation
    const hookTemplates = [
      `🔥 Alerte pépite — ${titre} va changer la donne !`,
      `⚡ Dëgër na ! ${titre} — tout Dakar en parle déjà.`,
      `✨ Sagnssé dëgg ! ${titre}, c'est klasse et c'est disponible maintenant.`,
      `🌟 Stop au scroll — ${titre} est exactement ce que tu cherchais.`,
    ];
    let hookIdx = 0;
    for (const p of plateformes) {
      if (!copies[p]) continue;
      const lines = copies[p].split("\n");
      const firstLine = lines[0] ?? "";
      if (firstLine.includes("?")) {
        lines[0] = hookTemplates[hookIdx % hookTemplates.length];
        hookIdx++;
        copies[p] = lines.join("\n");
      }
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
