const { chromium } = require("playwright");

const BASE_URL = "https://sagnse-copy-generator.vercel.app";

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const ctx     = await browser.newContext();
  const page    = await ctx.newPage();

  // Intercept payment API calls to log request/response
  page.on("response", async (res) => {
    if (res.url().includes("/api/")) {
      let body = "";
      try { body = await res.text(); } catch {}
      console.log(`  ${res.url().replace(BASE_URL, "")} → ${res.status()} ${body.slice(0, 300)}`);
    }
  });

  // Intercept /api/v1/usage to return count: 5 so the paywall renders
  await page.route("**/api/v1/usage", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 5, limit: 5 }),
    });
  });

  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");

  console.log("\n=== Trial limit simulated via route intercept (count=5) ===");

  // Fill form
  await page.fill('input[type="text"]', "Thiébou Dieune Prestige");
  await page.fill('textarea', "Le meilleur thiébou dieune de Dakar, préparé avec des ingrédients frais du marché de Sandaga.");

  // Select Instagram platform
  const instaLabel = page.locator('label').filter({ hasText: /instagram/i }).first();
  if (await instaLabel.count()) {
    await instaLabel.click();
    console.log("  Instagram selected");
  }

  await page.screenshot({ path: "test-pay-01-loaded.png", fullPage: true });
  console.log("  Screenshot: test-pay-01-loaded.png (payment wall state)");

  // Look for pay button
  const payBtn = page.locator('button').filter({ hasText: /payer|pay/i }).first();
  if (await payBtn.count()) {
    const btnText = await payBtn.textContent();
    console.log(`\n=== Pay button found: "${btnText?.trim()}" ===`);
    await page.screenshot({ path: "test-pay-02-pay-button.png", fullPage: true });

    await payBtn.click();
    console.log("  Pay button clicked — waiting for redirect...");

    // Wait up to 15s for redirect or error
    await page.waitForTimeout(12000);
    const finalUrl = page.url();
    console.log("  Final URL:", finalUrl);

    await page.screenshot({ path: "test-pay-03-after-pay.png", fullPage: true });
    console.log("  Screenshot: test-pay-03-after-pay.png");

    if (finalUrl !== BASE_URL + "/") {
      console.log("\n  ✅ Redirected away from home — payment page loaded");
    } else {
      // Still on home — check for error
      const errorEl = await page.locator('[class*="error"], [class*="alert"], [role="alert"]').first();
      if (await errorEl.count()) {
        console.log("  ⚠️  Error message:", await errorEl.textContent());
      } else {
        console.log("  ⚠️  Still on home page — no redirect, no visible error");
      }
    }
  } else {
    console.log("\n  ❌ Pay button NOT found on page");
    const allBtns = await page.locator('button:visible').allTextContents();
    console.log("  Visible buttons:", allBtns);
  }

  console.log("\n=== Window left open for 30s ===");
  await page.waitForTimeout(30000);
  await browser.close();
}

run().catch(console.error);
