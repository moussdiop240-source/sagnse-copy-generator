import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const VALID_PLATFORMS   = new Set(["instagram", "snapchat", "whatsapp", "tiktok"]);
const VALID_TONES       = new Set(["professionnel", "amical", "enthousiaste", "luxueux"]);
const VALID_LANGUAGES   = new Set(["francais", "wolof", "anglais", "puular", "serere"]);
const VALID_PAYMENTS    = new Set(["wave", "orange_money"]);

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
  if (plateformes.includes("instagram")) tags.push("#Sagnsé", "#ModedakarSN", "#ShopeLocal");
  if (plateformes.includes("tiktok"))    tags.push("#TikTokSN", "#DakarTrend", "#FYP");
  if (plateformes.includes("snapchat"))  tags.push("#SnapSN");
  // WhatsApp has no hashtag convention — intentionally omitted
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
  const payment  = PAYMENT_LABELS[paymentMethod];
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
  const em = toneEmoji[ton];

  if (langue === "wolof") {
    const hooks = [
      `${isTikTok ? "⚡" : "🔥"} Sagnssé dëgg — *${titre}* bi dafa ànd ak style bi!\nDëgër na, paré nga pour Korité ?`,
      `${em} Dafa gawa lool ! *${titre}* — deuredj li ci Dakar!\nXam nga loolu ? Tey lañu ko jënd !`,
    ];
    const hook = hooks[Math.floor(Math.random() * hooks.length)];
    return `${hook}

✨ ${brief}

${isTikTok ? "⚡ TikTok SN dafa ko xam — scroll bul dem!" : isIG ? "📸 Feed bi dafa neex ak style Dakar klasse!" : isWA ? "📲 Sos sa xarit yi — promotion bi dafa tàmm!" : "💎 Élégance bi moy sa droit — Sagnsé!"}

✅ Yomb lañ ko jënd
✅ Livraison ci Dakar
✅ Jënd ci ${payment} — gaaw te yomb!

📩 Bindal sa yëgël ci comment walla DM bu kanam! 👇${hashtags}`;
  }

  if (langue === "puular") {
    return `${em} Mboddi! *${titre}* — ko woni style Dakar dow ndee!
Jaraama, paré nga heɓde ko neɗɗo fof yiɗi?

✨ ${brief}

${isTikTok ? "⚡ TikTok SN heɓii — janngo waawaa!" : isIG ? "📸 Fello ngalu — style Dakar klasse!" : "💎 Sagnsé — ngenndaagu maa!"}

✅ Heɓirde wellaandi
✅ Livraison Dakar
✅ Jom ${payment} — yaawnude e laabi!

📩 Neldaa haala maa to comment walla DM! 👇${hashtags}`;
  }

  if (langue === "serere") {
    return `${em} *${titre}* — a xam na, klasse bi dafa màtt!
Paré nga pour fête bi? Tey mooy waxtu bi!

✨ ${brief}

${isTikTok ? "⚡ TikTok SN a ko xam — jangaat o ndaw!" : isIG ? "📸 Style Dakar — élégance ak raffinement!" : "💎 Sagnsé — a soxor njël!"}

✅ A xam na ko dëkk
✅ Livraison Dakar
✅ Faj ci ${payment} — gaaw te yomb!

📩 A bind soxna ci comment walla DM! 👇${hashtags}`;
  }

  if (langue === "anglais") {
    const hooks: Record<string, string> = {
      professionnel: `Are you still sleeping on *${titre}*? Dakar's most elegant women aren't. ✨\nThis is your sign — klasse doesn't wait.`,
      amical:        `Hey love 😊 — *${titre}* just landed and it's giving TOP TOP!\nYour next favourite piece is right here.`,
      enthousiaste:  `🔥 NO CAP — *${titre}* is the one everyone's been asking about!!\nDakar vibes, global standards.`,
      luxueux:       `👑 Some things are made for those who know their worth.\n*${titre}* — luxury, redefined for the Dakar woman.`,
    };
    return `${hooks[ton]}

✨ ${brief}

${isTikTok ? "⚡ Trending hard on TikTok SN — don't miss out!" : isIG ? "📸 Made for your feed. Made for Dakar." : isWA ? "📲 Share with your crew — this one's too good to keep!" : ""}

✅ Fast delivery across Dakar
✅ 100% authentic quality
✅ Easy payment via ${payment}

📩 DM us or drop a comment — order now! 👇${hashtags}`;
  }

  // Default: Français
  const hooks: Record<string, string> = {
    professionnel: `Tu cherches l'élégance qui parle avant même que tu ouvres la bouche ? ✨\n*${titre}* — le style dakarois dans toute sa splendeur.`,
    amical:        `Eh toi ! 😊 T'as vu *${titre}* ? C'est chaud, paré — exactement ce qu'il te fallait !\nOn t'attendait.`,
    enthousiaste:  `🔥 ALERTE KLASSE ! *${titre}* vient d'arriver et ça va tout changer !!\nDakar, vous êtes paré ?`,
    luxueux:       `👑 Le luxe n'est plus un rêve.\n*${titre}* — pour celles qui savent ce qu'elles valent.`,
  };

  return `${hooks[ton]}

✨ ${brief}

${isTikTok ? "⚡ Le buzz sur TikTok SN — arrête ton scroll !" : isIG ? "📸 L'élégance dakaroise dans chaque détail — parfait pour ton feed." : isWA ? "📲 Partage avec tes amies — cette offre est trop bonne pour la garder !" : ""}

✅ Livraison rapide à Dakar
✅ Qualité 100% authentique
✅ Paiement facile via ${payment}

📩 Commande maintenant ou écris-nous en DM — dëgër na ! 👇${hashtags}`;
}

export async function POST(req: NextRequest) {
  // Guard: malformed request body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 }
    );
  }

  const {
    titre,
    brief,
    plateformes,
    ton        = "professionnel",
    langue     = "francais",
    paymentMethod,
  } = body as {
    titre?: string;
    brief?: string;
    plateformes?: unknown;
    ton?: string;
    langue?: string;
    paymentMethod?: string;
  };

  // Validate required text fields
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

  // Validate platforms array
  if (!Array.isArray(plateformes) || plateformes.length === 0) {
    return NextResponse.json(
      { error: "Veuillez sélectionner au moins une plateforme." },
      { status: 400 }
    );
  }
  const safePlateformes = (plateformes as string[]).filter((p) => VALID_PLATFORMS.has(p));
  if (safePlateformes.length === 0) {
    return NextResponse.json(
      { error: "Plateforme(s) non reconnue(s)." },
      { status: 400 }
    );
  }

  // Validate enum fields
  if (!paymentMethod || !VALID_PAYMENTS.has(paymentMethod)) {
    return NextResponse.json(
      { error: "Moyen de paiement invalide ou manquant." },
      { status: 400 }
    );
  }
  const safeTon    = VALID_TONES.has(ton ?? "")    ? ton!    : "professionnel";
  const safeLangue = VALID_LANGUAGES.has(langue ?? "") ? langue! : "francais";

  // Use mock when no valid OpenAI key is configured
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.length < 20) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return NextResponse.json({
      copy: mockCopy(titre, brief, safePlateformes, safeTon, safeLangue, paymentMethod),
    });
  }

  // Live OpenAI path — client instantiated here to avoid module-level crash
  const client = new OpenAI({ apiKey });

  const platformNames = safePlateformes.map((p) => PLATFORM_LABELS[p] ?? p).join(", ");
  const payment = PAYMENT_LABELS[paymentMethod];

  const langMap: Record<string, string> = {
    francais: "Rédige entièrement en français. Glisse naturellement une ou deux expressions locales imagées parmi : « Klasse », « c'est chaud », « paré », « dëgër na », « trop bien ça ».",
    wolof:    "Rédige entièrement en wolof authentique. Intègre subtilement des expressions comme : « deuredj li », « gawa lool », « paré nga », « dëgër na », « sagnssé dëgg ».",
    anglais:  "Write entirely in English. Weave in subtle Senegalese flair with expressions like \"Dakar vibes\", \"klasse\", \"top top\", \"no cap\" to feel local.",
    puular:   "Rédige entièrement en pulaar/fuula. Intègre des expressions locales comme : « mboddi », « jaraama », « ko woni » pour un ton authentique.",
    serere:   "Rédige entièrement en sérère. Donne une âme locale avec des expressions authentiques sérères.",
  };

  const tonMap: Record<string, string> = {
    professionnel: "ton professionnel, élégant et raffiné",
    amical:        "ton amical, chaleureux et proche",
    enthousiaste:  "ton enthousiaste, dynamique et percutant",
    luxueux:       "ton luxueux, exclusif et sophistiqué",
  };

  const platformContext = safePlateformes.includes("tiktok") || safePlateformes.includes("instagram")
    ? "TikTok/Instagram (le HOOK doit arrêter le scroll en moins de 2 secondes)"
    : safePlateformes.includes("whatsapp")
      ? "WhatsApp (ton conversationnel, urgence immédiate)"
      : "Snapchat (court, visuel, percutant)";

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es un copywriter expert du e-commerce et du commerce social sénégalais, spécialisé dans la vente de mode et de beauté sur les réseaux sociaux dakarois pour la marque Sagnsé.
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

${langMap[safeLangue]}
Réponds UNIQUEMENT avec la copie finale — zéro introduction, zéro commentaire, zéro titre de bloc.`,
        },
        {
          role: "user",
          content: `Produit : ${titre}
Brief : ${brief}
Plateformes : ${platformNames}
Ton : ${tonMap[safeTon]}
Moyen de paiement : ${payment}

Génère une copie de vente haute conversion pour ce produit. Commence directement par le HOOK.`,
        },
      ],
      max_tokens: 600,
      temperature: 0.9,
      presence_penalty: 0.6,
    });

    const copy = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ copy });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[/api/generate] OpenAI error:", message);
    return NextResponse.json(
      { error: "Erreur lors de la génération. Veuillez réessayer." },
      { status: 502 }
    );
  }
}
