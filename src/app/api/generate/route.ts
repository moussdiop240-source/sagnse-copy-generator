import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

function platformHashtags(plateformes: string[]): string {
  const tags: string[] = [];
  if (plateformes.includes("instagram"))  tags.push("#Sagnsé", "#ModedakarSN", "#ShopeLocal");
  if (plateformes.includes("tiktok"))     tags.push("#TikTokSN", "#DakarTrend", "#FYP");
  if (plateformes.includes("snapchat"))   tags.push("#SnapSN");
  if (plateformes.includes("whatsapp"))   tags.push();
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
  const isIG     = plateformes.includes("instagram");
  const isTikTok = plateformes.includes("tiktok");
  const isWA     = plateformes.includes("whatsapp");

  const toneEmoji: Record<string, string> = {
    professionnel: "✨",
    amical:        "😊",
    enthousiaste:  "🔥",
    luxueux:       "👑",
  };
  const em = toneEmoji[ton] ?? "✨";

  if (langue === "wolof") {
    return `${em} *${titre}* ${em}

${brief}

${isTikTok ? "⚡ Tey dafa am, suba dafa jeex!" : isIG ? "📸 Style bi dafa neex — Dakar style ak classe!" : isWA ? "📲 Xamal sa xarit yi — dafa am promotion!" : "💎 Sagnsé — élégance bi moy sa droit!"}

✅ Yomb lañ ko jënd
✅ Livraison ci Dakar
✅ Jënd ci ${payment} — gaaw te yomb!

Bindal sa yëgël ci comment walla DM! 👇${hashtags}`;
  }

  if (langue === "puular") {
    return `${em} *${titre}* ${em}

${brief}

${isTikTok ? "⚡ Jogii hannde — janngo waawaa!" : isIG ? "📸 Fello ngalu — style Dakar!" : "💎 Sagnsé — ngenndaagu maa!"}

✅ Heɓirde wellaandi
✅ Livaraison Dakar
✅ Jom ${payment} — yaawnude e laabi!

Neldaa haala maa to comment walla DM! 👇${hashtags}`;
  }

  if (langue === "serere") {
    return `${em} *${titre}* ${em}

${brief}

${isTikTok ? "⚡ A jox ak handë — jangaat o ndaw!" : isIG ? "📸 Style Dakar — élégance ak raffinement!" : "💎 Sagnsé — a soxor njël!"}

✅ A xam na ko dëkk
✅ Livraison Dakar
✅ Faj ci ${payment} — gaaw te yomb!

A bind soxna ci comment wall DM! 👇${hashtags}`;
  }

  if (langue === "anglais") {
    const tonePhrases: Record<string, string> = {
      professionnel: `Elevate your style with *${titre}* — crafted for the discerning Dakar woman.`,
      amical:        `Hey love! Have you heard about *${titre}*? Your skin (and your wallet) will thank you! 😊`,
      enthousiaste:  `🔥 OH WOW — *${titre}* just dropped and it's EVERYTHING!!`,
      luxueux:       `👑 Luxury redefined. *${titre}* — for those who know their worth.`,
    };
    return `${tonePhrases[ton] ?? tonePhrases["professionnel"]}

${brief}

${isTikTok ? "⚡ Trending now on TikTok SN!" : isIG ? "📸 Made for your feed. Made for Dakar." : isWA ? "📲 Share with your crew — this one's too good to keep secret!" : ""}

✅ Fast delivery across Dakar
✅ 100% authentic quality
✅ Pay easily via ${payment}

DM us or drop a comment below! 👇${hashtags}`;
  }

  // Default: Français
  const tonePhrases: Record<string, string> = {
    professionnel: `Découvrez *${titre}* — l'excellence au service de votre style dakarois.`,
    amical:        `Eh toi ! 😊 Tu cherches *${titre}* ? On a exactement ce qu'il te faut !`,
    enthousiaste:  `🔥 ALERTE PROMO ! *${titre}* est enfin disponible et ça va te changer la vie !!`,
    luxueux:       `👑 Le luxe à votre portée. *${titre}* — parce que vous le méritez.`,
  };

  return `${tonePhrases[ton] ?? tonePhrases["professionnel"]}

${brief}

${isTikTok ? "⚡ Le produit qui fait le buzz sur TikTok SN !" : isIG ? "📸 L'élégance dakaroise dans chaque détail — parfait pour ton feed." : isWA ? "📲 Partage avec tes amies — cette offre est trop bonne pour la garder !" : ""}

✅ Livraison rapide à Dakar
✅ Qualité 100% authentique
✅ Paiement facile via ${payment}

Commande maintenant ou écris-nous en DM ! 👇${hashtags}`;
}

export async function POST(req: NextRequest) {
  const {
    titre,
    brief,
    plateformes = [],
    ton = "professionnel",
    langue = "francais",
    paymentMethod,
  } = await req.json();

  if (!titre?.trim() || !brief?.trim()) {
    return NextResponse.json(
      { error: "Le titre et le brief produit sont requis." },
      { status: 400 }
    );
  }
  if (titre.length > 200 || brief.length > 2000) {
    return NextResponse.json(
      { error: "La longueur maximale autorisée est dépassée." },
      { status: 400 }
    );
  }
  if (!plateformes.length) {
    return NextResponse.json(
      { error: "Veuillez sélectionner au moins une plateforme." },
      { status: 400 }
    );
  }
  if (!paymentMethod) {
    return NextResponse.json(
      { error: "Un moyen de paiement est requis." },
      { status: 400 }
    );
  }

  // Use mock when no valid OpenAI key is configured
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.length < 20) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return NextResponse.json({
      copy: mockCopy(titre, brief, plateformes, ton, langue, paymentMethod),
    });
  }

  const platformNames = plateformes.map((p: string) => PLATFORM_LABELS[p] ?? p).join(", ");
  const payment = PAYMENT_LABELS[paymentMethod] ?? paymentMethod;

  const langMap: Record<string, string> = {
    francais: "Rédige entièrement en français.",
    wolof:    "Rédige entièrement en wolof (langue d'Afrique de l'Ouest parlée au Sénégal). Utilise un vocabulaire wolof authentique.",
    anglais:  "Write entirely in English.",
    puular:   "Rédige entièrement en pulaar/fuula (langue peule du Sénégal).",
    serere:   "Rédige entièrement en sérère (langue du Sénégal).",
  };

  const tonMap: Record<string, string> = {
    professionnel: "ton professionnel, élégant et raffiné",
    amical:        "ton amical, chaleureux et proche",
    enthousiaste:  "ton enthousiaste, dynamique et percutant",
    luxueux:       "ton luxueux, exclusif et sophistiqué",
  };

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Tu es un expert en copywriting e-commerce mode au Sénégal pour la plateforme Sagnsé.
Tu rédiges des copies de vente courtes, percutantes et adaptées aux réseaux sociaux dakarois.
Style : élégance, classe, raffinement — le goût dakarois dans chaque mot.
Utilise des émojis pertinents, des hashtags adaptés à la plateforme, et un style accrocheur.
${langMap[langue] ?? langMap["francais"]}
Réponds uniquement avec la copie de vente — sans introduction ni commentaire.`,
      },
      {
        role: "user",
        content: `Produit : ${titre}
Brief : ${brief}
Plateformes : ${platformNames}
Ton : ${tonMap[ton] ?? ton}
Moyen de paiement disponible : ${payment}

Génère une copie de vente haute conversion pour ce produit.`,
      },
    ],
    max_tokens: 600,
    temperature: 0.85,
  });

  const copy = completion.choices[0]?.message?.content ?? "";
  return NextResponse.json({ copy });
}
