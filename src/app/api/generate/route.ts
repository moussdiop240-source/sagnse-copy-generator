import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { productTitle, productBrief } = await req.json();

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

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an expert direct-response copywriter. Write compelling, benefit-driven sales copy that grabs attention, builds desire, and drives action. Keep it punchy, professional, and persuasive. Respond with the sales copy only — no preamble, no meta-commentary.",
      },
      {
        role: "user",
        content: `Product Title: ${productTitle}\n\nProduct Brief: ${productBrief}\n\nWrite high-converting sales copy for this product.`,
      },
    ],
    max_tokens: 600,
    temperature: 0.8,
  });

  const copy = completion.choices[0]?.message?.content ?? "";
  return NextResponse.json({ copy });
}
