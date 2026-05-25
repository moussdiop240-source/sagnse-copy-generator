const { chromium } = require("playwright");

const LANGUAGES = [
  { label: "Français", value: "francais" },
  { label: "Wolof",    value: "wolof" },
  { label: "Anglais",  value: "anglais" },
  { label: "Pulaar",   value: "puular" },
  { label: "Sérère",   value: "serere" },
];

async function resetTrials() {
  try {
    const r = await fetch("https://sagnse-copy-generator.vercel.app/api/admin/reset-trials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "sagnseadmintrial", ip: "unknown" }),
    });
    const data = await r.json();
    console.log("  Trials reset:", data);
  } catch (e) {
    console.log("  Reset failed:", e.message);
  }
}

// Click a platform toggle by finding its parent label and clicking the visible wrapper
async function selectPlatform(page, name) {
  // Try clicking the label that wraps the platform checkbox
  const label = page.locator("label").filter({ hasText: new RegExp(name, "i") }).first();
  if (await label.count()) {
    // Click the visible container (not the sr-only checkbox)
    const box = await label.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(300);
      return;
    }
  }
  // Fallback: find any clickable element with the platform name
  const btn = page.locator("div, span, button").filter({ hasText: new RegExp(name, "i") }).first();
  if (await btn.count()) await btn.click();
}

// Use selectOption for native <select> elements, fallback to clicking for custom dropdowns
async function selectDropdown(page, value, label) {
  const selects = page.locator("select");
  const count = await selects.count();
  for (let i = 0; i < count; i++) {
    const sel = selects.nth(i);
    const options = await sel.locator("option").allTextContents();
    if (options.some(o => o.toLowerCase().includes(value.toLowerCase()) || o.toLowerCase().includes(label.toLowerCase()))) {
      await sel.selectOption({ value });
      await page.waitForTimeout(400);
      return true;
    }
  }
  // Fallback: click buttons/labels
  const btn = page.locator("button, label").filter({ hasText: new RegExp(label, "i") }).first();
  if (await btn.count()) { await btn.click(); await page.waitForTimeout(400); return true; }
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  for (let i = 0; i < LANGUAGES.length; i++) {
    const lang = LANGUAGES[i];
    console.log(`\n=== [${i + 1}/5] ${lang.label} ===`);

    await resetTrials();

    await page.goto("https://sagnse-copy-generator.vercel.app");
    await page.waitForLoadState("networkidle");

    // Product title
    await page.locator('input[type="text"]').first().fill("Parfum Thiouraye Premium");

    // Brief
    await page.locator("textarea").first().fill(
      "Encens et parfum traditionnel sénégalais, 100% naturel, fabriqué à Saint-Louis, senteur envoûtante 8h, flacon élégant, idéal comme cadeau, 5000 FCFA, livraison Dakar 24h"
    );

    // Platforms
    await selectPlatform(page, "Instagram");
    await selectPlatform(page, "WhatsApp");

    // Language (native select)
    await selectDropdown(page, lang.value, lang.label);
    console.log(`  Language: ${lang.label}`);

    // Tone (native select or button)
    await selectDropdown(page, "enthousiaste", "Enthousiaste");
    console.log("  Tone: Enthousiaste");

    // Payment (native select or button)
    await selectDropdown(page, "wave", "Wave");
    console.log("  Payment: Wave");

    // Generate
    const generateBtn = page.locator("button").filter({ hasText: /générer|generer|generate/i }).first();
    await generateBtn.scrollIntoViewIfNeeded();
    await generateBtn.click();
    console.log("  Generating...");

    await page.waitForTimeout(13000);
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(2000);
    console.log(`  ✅ ${lang.label} done`);

    if (i < LANGUAGES.length - 1) {
      console.log("  Pausing 5s — review the result...");
      await page.waitForTimeout(5000);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    }
  }

  console.log("\n=== All 5 languages tested — window left open ===");
})();
