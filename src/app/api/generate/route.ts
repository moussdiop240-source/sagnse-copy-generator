import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PAYMENT_LABELS: Record<string, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
};

function mockCopy(productTitle: string, productBrief: string, language: string, paymentMethod: string): string {
  const payment = PAYMENT_LABELS[paymentMethod] ?? paymentMethod;

  if (language === "french") {
    return `Découvrez ${productTitle} — la solution qui va transformer votre quotidien.

${productBrief}

Pourquoi choisir ${productTitle} ?
• Conçu pour ceux qui exigent le meilleur
• Résultats rapides, sans friction
• Satisfaction garantie — parce que nous y croyons

N'attendez plus. Le moment idéal, c'est maintenant.

👉 Commandez ${productTitle} aujourd'hui via ${payment} et vivez la différence.`;
  }

  if (language === "wolof") {
    return `Jërëjëf ci ${productTitle} — li dina sàqq sa yëgël ak sa liggéey!

${productBrief}

Ndax lan la ${productTitle} yomb?
• Dafa dëkk ci nit ñu bëgg li baax
• Yomb, gaaw, te dafa màtt
• Nu lay dimbël — ndax nu xam ne dafa mujj

Doo dem kanam! Suba mooy bes bi.

👉 Jël sa ${productTitle} tey ci ${payment} — bul yàq sa waxtu!`;
  }

  // Default: English
  return `Introducing ${productTitle} — the last upgrade your workflow will ever need.

${productBrief}

Here's what sets ${productTitle} apart:
• Built for people who refuse to settle for "good enough"
• Engineered to save you time, reduce friction, and deliver results
• Backed by a satisfaction guarantee — because we know it works

Don't wait for the perfect moment. The perfect moment is now.

👉 Get ${productTitle} today via ${payment} and experience the difference for yourself.`;
}

export async function POST(req: NextRequest) {
  const { productTitle, productBrief, language = "english", paymentMethod } = await req.json();

  if (!productTitle?.trim() || !productBrief?.trim()) {
    return NextResponse.json(
      { error: "Product title and brief are required." },
      { status: 400 }
    );
  }

  if (productTitle.length > 200 || productBrief.length > 2000) {
    return NextResponse.json(
      { error: "Input exceeds maximum allowed length." },
      { status: 400 }
    );
  }

  if (!paymentMethod) {
    return NextResponse.json(
      { error: "A payment method is required." },
      { status: 400 }
    );
  }

  // Use mock when no API key is configured, otherwise call OpenAI
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.length < 20) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return NextResponse.json({ copy: mockCopy(productTitle, productBrief, language, paymentMethod) });
  }

  const langInstruction =
    language === "french" ? "Write the copy entirely in French."
    : language === "wolof" ? "Write the copy entirely in Wolof (a West African language spoken in Senegal). Use authentic Wolof vocabulary and expressions."
    : "Write the copy in English.";

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert direct-response copywriter. Write compelling, benefit-driven sales copy that grabs attention, builds desire, and drives action. Keep it punchy, professional, and persuasive. ${langInstruction} Respond with the sales copy only — no preamble, no meta-commentary.`,
      },
      {
        role: "user",
        content: `Product Title: ${productTitle}\n\nProduct Brief: ${productBrief}\n\nPayment method available: ${PAYMENT_LABELS[paymentMethod] ?? paymentMethod}\n\nWrite high-converting sales copy for this product.`,
      },
    ],
    max_tokens: 600,
    temperature: 0.8,
  });

  const copy = completion.choices[0]?.message?.content ?? "";
  return NextResponse.json({ copy });
}
