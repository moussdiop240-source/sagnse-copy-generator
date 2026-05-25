import { chromium } from "playwright";

const PROD_URL = "https://sagnse-copy-generator.vercel.app";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page    = await ctx.newPage();

  // ── Step 1: Load home page ──────────────────────────────────────────
  console.log("Step 1 — loading home page…");
  await page.goto(PROD_URL, { waitUntil: "networkidle" });
  await page.screenshot({ path: "ss-test-01-home.png" });
  console.log("  screenshot: ss-test-01-home.png");

  // ── Step 2: Fill form with MULTIPLE platforms ───────────────────────
  console.log("Step 2 — filling form with 3 platforms (Instagram + WhatsApp + TikTok)…");
  await page.fill("#titre", "Robe Bazin brodée");
  await page.fill("#brief", "Robe en bazin riche 100% coton, broderie dorée col et manches, taille S à XL, livrée 24h à Dakar");

  await page.locator('label:has-text("Instagram")').click();
  await page.locator('label:has-text("WhatsApp")').click();
  await page.locator('label:has-text("TikTok")').click();

  await page.selectOption("#ton", "luxueux");
  await page.selectOption("#langue", "francais");

  // Verify payment section is hidden in free mode
  const paymentVisibleFree = await page.locator('label:has-text("Wave")').isVisible().catch(() => false);
  console.log("  Wave selector visible in free mode (expected: false):", paymentVisibleFree);

  await page.screenshot({ path: "ss-test-02-form-filled.png" });
  console.log("  screenshot: ss-test-02-form-filled.png");

  // ── Step 3: Submit in free mode — expect tabs in output ─────────────
  console.log("Step 3 — submitting in free mode, expecting per-platform tabs…");
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/generate"), { timeout: 30000 }),
    page.locator('button[type="submit"]').click(),
  ]);
  await page.waitForTimeout(1500);

  await page.screenshot({ path: "ss-test-03-result.png" });
  console.log("  screenshot: ss-test-03-result.png");

  // Check tabs are visible
  const instagramTab = page.locator('button:has-text("Instagram")').first();
  const whatsappTab  = page.locator('button:has-text("WhatsApp")').first();
  const tiktokTab    = page.locator('button:has-text("TikTok")').first();

  const igVisible  = await instagramTab.isVisible().catch(() => false);
  const waVisible  = await whatsappTab.isVisible().catch(() => false);
  const ttVisible  = await tiktokTab.isVisible().catch(() => false);

  console.log("  Instagram tab visible:", igVisible);
  console.log("  WhatsApp tab visible:", waVisible);
  console.log("  TikTok tab visible:", ttVisible);

  // ── Step 4: Click each tab and screenshot ───────────────────────────
  if (igVisible) {
    console.log("Step 4a — clicking Instagram tab…");
    await instagramTab.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "ss-test-04-instagram.png" });
    console.log("  screenshot: ss-test-04-instagram.png");

    const igText = await page.locator(".whitespace-pre-wrap").first().innerText().catch(() => "");
    console.log("  Instagram copy (first 120 chars):", igText.slice(0, 120));
  }

  if (waVisible) {
    console.log("Step 4b — clicking WhatsApp tab…");
    await whatsappTab.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "ss-test-05-whatsapp.png" });
    console.log("  screenshot: ss-test-05-whatsapp.png");

    const waText = await page.locator(".whitespace-pre-wrap").first().innerText().catch(() => "");
    console.log("  WhatsApp copy (first 120 chars):", waText.slice(0, 120));
  }

  if (ttVisible) {
    console.log("Step 4c — clicking TikTok tab…");
    await tiktokTab.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "ss-test-06-tiktok.png" });
    console.log("  screenshot: ss-test-06-tiktok.png");

    const ttText = await page.locator(".whitespace-pre-wrap").first().innerText().catch(() => "");
    console.log("  TikTok copy (first 120 chars):", ttText.slice(0, 120));
  }

  // ── Step 5: Force paid mode + test phone number field ───────────────
  console.log("Step 5 — forcing paid mode (localStorage = 5)…");
  await page.evaluate(() => localStorage.setItem("sagnse_gen_count", "5"));
  await page.reload({ waitUntil: "networkidle" });
  await page.screenshot({ path: "ss-test-07-paid-mode.png" });
  console.log("  screenshot: ss-test-07-paid-mode.png");

  // Check phone field is visible, Wave/OM radio buttons are gone
  const phoneVisible = await page.locator('input[type="tel"]').isVisible().catch(() => false);
  const waveVisible  = await page.locator('label:has-text("Wave")').isVisible().catch(() => false);
  console.log("  Phone number field visible (expected: true):", phoneVisible);
  console.log("  Wave radio button visible (expected: false):", waveVisible);

  // Re-fill form after reload
  await page.fill("#titre", "Robe Bazin brodée");
  await page.fill("#brief", "Robe en bazin riche 100% coton, broderie dorée col et manches, taille S à XL, livrée 24h à Dakar");
  await page.locator('label:has-text("Instagram")').click();
  await page.locator('label:has-text("WhatsApp")').click();
  await page.locator('label:has-text("TikTok")').click();
  await page.selectOption("#ton", "luxueux");
  await page.selectOption("#langue", "francais");

  // Fill phone number (Senegalese format: 9 digits starting with 7)
  if (phoneVisible) {
    await page.fill('input[type="tel"]', "77 123 45 67");
    console.log("  Phone number filled: 77 123 45 67");
  }

  await page.screenshot({ path: "ss-test-08-paid-form.png" });
  console.log("  screenshot: ss-test-08-paid-form.png");

  console.log("Step 6 — clicking Payer & Générer…");
  const [response] = await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }),
    page.locator('button[type="submit"]').click(),
  ]);

  const currentUrl = page.url();
  console.log("  redirected to:", currentUrl);
  await page.screenshot({ path: "ss-test-09-paydunya.png" });
  console.log("  screenshot: ss-test-09-paydunya.png");
  console.log("  PayDunya sandbox page reached:", currentUrl.includes("paydunya.com"));

  await browser.close();
  console.log("\nDone. Screenshots saved.");
})();
