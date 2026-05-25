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

  // ── Step 2: Fill form ───────────────────────────────────────────────
  console.log("Step 2 — filling form…");
  await page.fill("#titre", "Robe Bazin brodée");
  await page.fill("#brief", "Robe en bazin riche 100% coton, broderie dorée col et manches, taille S à XL, livrée 24h à Dakar");

  // Check platforms
  await page.locator('label:has-text("Instagram")').click();
  await page.locator('label:has-text("TikTok")').click();

  // Select tone
  await page.selectOption("#ton", "luxueux");

  // Select language
  await page.selectOption("#langue", "francais");

  // Select payment method
  await page.locator('label:has-text("Wave")').click();

  await page.screenshot({ path: "ss-test-02-form-filled.png" });
  console.log("  screenshot: ss-test-02-form-filled.png");

  // ── Step 3: Force paid mode via localStorage (simulate 5 free uses) ─
  console.log("Step 3 — forcing paid mode (localStorage = 5)…");
  await page.evaluate(() => localStorage.setItem("sagnse_gen_count", "5"));
  await page.reload({ waitUntil: "networkidle" });
  await page.screenshot({ path: "ss-test-03-paid-mode.png" });
  console.log("  screenshot: ss-test-03-paid-mode.png");

  // Re-fill after reload
  await page.fill("#titre", "Robe Bazin brodée");
  await page.fill("#brief", "Robe en bazin riche 100% coton, broderie dorée col et manches, taille S à XL, livrée 24h à Dakar");
  await page.locator('label:has-text("Instagram")').click();
  await page.locator('label:has-text("TikTok")').click();
  await page.selectOption("#ton", "luxueux");
  await page.selectOption("#langue", "francais");
  await page.locator('label:has-text("Wave")').click();

  await page.screenshot({ path: "ss-test-04-paid-form.png" });
  console.log("  screenshot: ss-test-04-paid-form.png");

  // ── Step 4: Click "Payer & Générer" — capture redirect to PayDunya ──
  console.log("Step 4 — clicking Payer & Générer…");
  const [response] = await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }),
    page.locator('button[type="submit"]').click(),
  ]);

  const currentUrl = page.url();
  console.log("  redirected to:", currentUrl);
  await page.screenshot({ path: "ss-test-05-paydunya.png" });
  console.log("  screenshot: ss-test-05-paydunya.png");

  const isPayDunya = currentUrl.includes("paydunya.com");
  console.log("  PayDunya sandbox page reached:", isPayDunya);

  if (isPayDunya) {
    // ── Step 5: Interact with PayDunya sandbox page ─────────────────
    console.log("Step 5 — on PayDunya sandbox page, reading content…");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "ss-test-06-paydunya-loaded.png" });
    console.log("  screenshot: ss-test-06-paydunya-loaded.png");

    const pageTitle = await page.title();
    const bodyText  = await page.locator("body").innerText().catch(() => "");
    console.log("  page title:", pageTitle);
    console.log("  body excerpt:", bodyText.slice(0, 400));

    // Try to find and click Wave payment option if visible
    const waveBtn = page.locator("text=Wave").first();
    const waveVisible = await waveBtn.isVisible().catch(() => false);
    console.log("  Wave button visible:", waveVisible);
    if (waveVisible) {
      await waveBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "ss-test-07-wave-selected.png" });
      console.log("  screenshot: ss-test-07-wave-selected.png");
    }
  }

  await browser.close();
  console.log("\nDone. Screenshots saved.");
})();
