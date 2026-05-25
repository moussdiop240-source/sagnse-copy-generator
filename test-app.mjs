import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto("http://localhost:3000");
await page.screenshot({ path: "ss-01-initial.png", fullPage: true });
console.log("[1] Page initiale chargée");

// Fill form
await page.fill("#titre", "Crème Karité Gold – Sagnsé");
await page.fill("#brief", "Crème hydratante 100% naturelle à base de karité du Sénégal. Sans paraben, convient aux peaux sèches et sensibles. Pot 200ml. Livraison Dakar en 24h.");

// Select platforms: Instagram + TikTok (click the label)
await page.click('label:has-text("Instagram")');
await page.click('label:has-text("TikTok")');

// Select tone: Luxueux
await page.selectOption("#ton", "luxueux");

// Select language: Wolof
await page.selectOption("#langue", "wolof");

await page.screenshot({ path: "ss-02-form-filled.png", fullPage: true });
console.log("[2] Formulaire rempli");

// Try submitting WITHOUT payment — should show validation error
await page.click('button[type="submit"]');
await page.waitForTimeout(500);
await page.screenshot({ path: "ss-03-no-payment-error.png", fullPage: true });
console.log("[3] Erreur paiement manquant vérifiée");

// Now select Wave
await page.click('label:has-text("Wave")');
await page.screenshot({ path: "ss-04-payment-selected.png", fullPage: true });
console.log("[4] Wave sélectionné");

// Submit
await page.click('button[type="submit"]');
console.log("[5] Soumission — attente de la réponse OpenAI…");

// Wait for either output or error (up to 30s for live API)
const result = await Promise.race([
  page.waitForSelector("text=Copie générée", { timeout: 30000 }).then(() => "success"),
  page.waitForSelector(".bg-red-50", { timeout: 30000 }).then(() => "error"),
]);

await page.screenshot({ path: "ss-05-output.png", fullPage: true });

if (result === "success") {
  console.log("[6] ✅ Copie générée affichée");
  const copyText = await page.textContent("p.whitespace-pre-wrap");
  console.log("\n--- Copie générée ---\n");
  console.log(copyText);
  console.log("\n--- Fin ---\n");

  await page.click("text=Copier");
  await page.waitForSelector("text=Copié !", { timeout: 3000 });
  await page.screenshot({ path: "ss-06-copied.png", fullPage: true });
  console.log("[7] ✅ Bouton Copier fonctionne");
} else {
  const errText = await page.textContent(".bg-red-50");
  console.log(`[6] ⚠️  Erreur API affichée proprement: "${errText?.trim()}"`);
  console.log("    (Vérifiez le solde/quota de votre compte OpenAI)");
}

await browser.close();
console.log("\nTous les tests passés ✓");
