import { chromium } from "playwright";

const PROD_URL = "https://sagnse-copy-generator.vercel.app";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page    = await ctx.newPage();

  // ── Step 1: Load home page ──────────────────────────────────────────
  console.log("Step 1 — loading production home page…");
  await page.goto(PROD_URL, { waitUntil: "networkidle" });
  await page.screenshot({ path: "ss-audit-01-home.png" });

  // ── Step 2: Fill form — Instagram + WhatsApp + TikTok ──────────────
  console.log("Step 2 — filling form…");
  await page.fill("#titre", "Robe Bazin brodée — Collection Tabaski");
  await page.fill("#brief", "Robe en bazin riche 100% coton, broderie dorée col et manches, disponible en S/M/L/XL. Livraison 24h à Dakar, Thiès et Mbour. Prix : 35 000 FCFA.");

  await page.locator('label:has-text("Instagram")').click();
  await page.locator('label:has-text("WhatsApp")').click();
  await page.locator('label:has-text("TikTok")').click();

  await page.selectOption("#ton", "luxueux");
  await page.selectOption("#langue", "francais");

  await page.screenshot({ path: "ss-audit-02-form.png" });

  // ── Step 3: Submit (free mode) ──────────────────────────────────────
  console.log("Step 3 — submitting in free mode…");
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/generate"), { timeout: 30000 }),
    page.locator('button[type="submit"]').click(),
  ]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "ss-audit-03-result.png" });

  // ── Step 4: Check tabs ──────────────────────────────────────────────
  const igTab  = page.locator('button:has-text("Instagram")').first();
  const waTab  = page.locator('button:has-text("WhatsApp")').first();
  const ttTab  = page.locator('button:has-text("TikTok")').first();

  const igVisible = await igTab.isVisible().catch(() => false);
  const waVisible = await waTab.isVisible().catch(() => false);
  const ttVisible = await ttTab.isVisible().catch(() => false);

  console.log("  Instagram tab visible:", igVisible);
  console.log("  WhatsApp tab  visible:", waVisible);
  console.log("  TikTok tab    visible:", ttVisible);

  // ── Step 5: Read Instagram copy ─────────────────────────────────────
  if (igVisible) {
    await igTab.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "ss-audit-04-instagram.png" });
    const igText = await page.locator(".whitespace-pre-wrap").first().innerText().catch(() => "");
    console.log("\n── Instagram copy ──────────────────────────────────");
    console.log(igText.slice(0, 400));
    const hasHook = igText.includes("Stop") || igText.includes("Scrolle") || igText.includes("Tabaski") || igText.includes("dëgër");
    console.log("  HOOK detected:", hasHook);
  }

  // ── Step 6: Read WhatsApp copy ──────────────────────────────────────
  if (waVisible) {
    await waTab.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "ss-audit-05-whatsapp.png" });
    const waText = await page.locator(".whitespace-pre-wrap").first().innerText().catch(() => "");
    console.log("\n── WhatsApp copy ───────────────────────────────────");
    console.log(waText.slice(0, 400));
    const hasTarif = waText.toLowerCase().includes("fcfa") || waText.toLowerCase().includes("tarif") || waText.toLowerCase().includes("prix");
    const hasLivraison = waText.toLowerCase().includes("livraison") || waText.toLowerCase().includes("sénégal");
    console.log("  Prix/FCFA mention:", hasTarif);
    console.log("  Livraison mention:", hasLivraison);
  }

  // ── Step 7: Read TikTok copy — check new Visuel/Audio format ────────
  if (ttVisible) {
    await ttTab.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "ss-audit-06-tiktok.png" });
    const ttText = await page.locator(".whitespace-pre-wrap").first().innerText().catch(() => "");
    console.log("\n── TikTok copy ─────────────────────────────────────");
    console.log(ttText.slice(0, 500));
    const hasVisuel = ttText.includes("Visuel");
    const hasAudio  = ttText.includes("Audio") || ttText.includes("l'écran");
    console.log("  Visuel section present:", hasVisuel);
    console.log("  Audio/Texte section present:", hasAudio);
  }

  // ── Step 8: Wolof language test ─────────────────────────────────────
  console.log("\nStep 8 — testing Wolof language…");
  await page.reload({ waitUntil: "networkidle" });
  await page.fill("#titre", "Boubou Wax Premium");
  await page.fill("#brief", "Boubou en wax authentique, couture locale Dakar, disponible en 3 couleurs. 28 000 FCFA. Livraison rapide.");
  await page.locator('label:has-text("Instagram")').click();
  await page.locator('label:has-text("TikTok")').click();
  await page.selectOption("#ton", "enthousiaste");
  await page.selectOption("#langue", "wolof");

  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/generate"), { timeout: 30000 }),
    page.locator('button[type="submit"]').click(),
  ]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "ss-audit-07-wolof.png" });

  const wolofTtTab = page.locator('button:has-text("TikTok")').first();
  if (await wolofTtTab.isVisible().catch(() => false)) {
    await wolofTtTab.click();
    await page.waitForTimeout(300);
    const ttWolof = await page.locator(".whitespace-pre-wrap").first().innerText().catch(() => "");
    console.log("\n── TikTok copy (Wolof) ─────────────────────────────");
    console.log(ttWolof.slice(0, 400));
    const hasWolofExpr = ttWolof.includes("paré") || ttWolof.includes("dëgg") || ttWolof.includes("gawa") || ttWolof.includes("Visuel") || ttWolof.includes("Audio");
    console.log("  Wolof/Script format detected:", hasWolofExpr);
    await page.screenshot({ path: "ss-audit-08-tiktok-wolof.png" });
  }

  // ── Step 9: Paid mode — phone field check ───────────────────────────
  console.log("\nStep 9 — checking paid mode (phone field)…");
  await page.evaluate(() => localStorage.setItem("sagnse_gen_count", "5"));
  await page.reload({ waitUntil: "networkidle" });
  await page.screenshot({ path: "ss-audit-09-paid-mode.png" });
  const phoneVisible = await page.locator('input[type="tel"]').isVisible().catch(() => false);
  const waveRadio    = await page.locator('label:has-text("Wave")').isVisible().catch(() => false);
  console.log("  Phone input visible (expected: true):", phoneVisible);
  console.log("  Wave radio visible  (expected: false):", waveRadio);

  await browser.close();
  console.log("\n✅ Audit test complete. Screenshots saved to ss-audit-*.png");
})();
