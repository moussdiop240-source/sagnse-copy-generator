"use client";

import { useState, useEffect } from "react";

const FREE_LIMIT  = 5;
const STORAGE_KEY = "sagnse_gen_count";

const PLATFORMS = [
  { value: "instagram", label: "Instagram (IG)" },
  { value: "snapchat",  label: "Snapchat" },
  { value: "whatsapp",  label: "WhatsApp" },
  { value: "tiktok",    label: "TikTok" },
];

const TONES = [
  { value: "professionnel", label: "Professionnel" },
  { value: "amical",        label: "Amical" },
  { value: "enthousiaste",  label: "Enthousiaste" },
  { value: "luxueux",       label: "Luxueux" },
];

const LANGUAGES = [
  { value: "francais", label: "Français" },
  { value: "wolof",    label: "Wolof" },
  { value: "anglais",  label: "Anglais" },
  { value: "puular",   label: "Puular" },
  { value: "serere",   label: "Sérère" },
];

const PAYMENT_METHODS = [
  { value: "wave",         label: "Wave" },
  { value: "orange_money", label: "Orange Money" },
];

export default function Home() {
  const [titre, setTitre]                 = useState("");
  const [brief, setBrief]                 = useState("");
  const [plateformes, setPlateformes]     = useState<string[]>([]);
  const [ton, setTon]                     = useState("professionnel");
  const [langue, setLangue]               = useState("francais");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [generatedCopy, setGeneratedCopy] = useState("");
  const [loading, setLoading]             = useState(false);
  const [initiating, setInitiating]       = useState(false);
  const [error, setError]                 = useState("");
  const [copied, setCopied]               = useState(false);

  // Freemium counter — read from localStorage after mount
  const [genCount, setGenCount] = useState(0);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);
    setGenCount(isNaN(stored) ? 0 : stored);
  }, []);

  const limitReached = genCount >= FREE_LIMIT;
  const remaining    = Math.max(0, FREE_LIMIT - genCount);

  function togglePlatform(val: string) {
    setPlateformes((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]
    );
  }

  function incrementCount() {
    const next = genCount + 1;
    setGenCount(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (plateformes.length === 0) {
      setError("Veuillez sélectionner au moins une plateforme.");
      return;
    }
    if (!paymentMethod) {
      setError("Veuillez choisir un moyen de paiement pour continuer.");
      return;
    }
    setError("");

    // ── PAID FLOW: limit reached → initiate real PayDunya payment ──
    if (limitReached) {
      setInitiating(true);
      try {
        const res = await fetch("/api/payment/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titre, brief, plateformes, ton, langue, paymentMethod }),
        });
        const data = await res.json() as { checkoutUrl?: string; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Erreur lors de l'initiation du paiement.");
          return;
        }
        window.location.href = data.checkoutUrl!;
      } catch {
        setError("Erreur réseau. Vérifiez votre connexion et réessayez.");
      } finally {
        setInitiating(false);
      }
      return;
    }

    // ── FREE FLOW: limit not reached → call /api/generate directly ──
    setGeneratedCopy("");
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre, brief, plateformes, ton, langue, paymentMethod }),
      });
      const data = await res.json() as { copy?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue. Veuillez réessayer.");
      } else {
        setGeneratedCopy(data.copy ?? "");
        incrementCount();
      }
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Impossible d'accéder au presse-papiers. Copiez le texte manuellement.");
    }
  }

  const busy = loading || initiating;

  return (
    <main className="min-h-screen bg-gray-100 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-start justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Générer une copie de vente
            </h1>
            {/* Usage badge */}
            {!limitReached && (
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                remaining <= 2
                  ? "bg-orange-50 text-orange-600 border border-orange-200"
                  : "bg-violet-50 text-violet-700 border border-violet-200"
              }`}>
                {remaining} essai{remaining > 1 ? "s" : ""} gratuit{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Freemium banner (shown above the form when limit reached) */}
          {limitReached && (
            <div className="rounded-2xl bg-violet-50 border border-violet-200 px-5 py-4 text-center space-y-1 mb-6">
              <div className="text-2xl">🔒</div>
              <p className="text-sm font-bold text-violet-800">
                Limite de {FREE_LIMIT} copies gratuites atteinte.
              </p>
              <p className="text-xs text-violet-600">
                Remplissez le formulaire et cliquez sur{" "}
                <strong>Payer &amp; Générer</strong> pour débloquer votre copie via Wave ou Orange Money.
              </p>
            </div>
          )}

          {/* Form — always visible */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Titre */}
            <div className="space-y-1.5">
              <label htmlFor="titre" className="block text-sm font-semibold text-gray-700">
                Titre <span className="text-violet-600">*</span>
              </label>
              <input
                id="titre"
                type="text"
                placeholder="Ex: Promo Ramadan – Huile de coco"
                value={titre}
                onChange={(e) => { setTitre(e.target.value); setError(""); }}
                maxLength={200}
                required
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
              />
            </div>

            {/* Brief produit */}
            <div className="space-y-1.5">
              <label htmlFor="brief" className="block text-sm font-semibold text-gray-700">
                Brief produit <span className="text-violet-600">*</span>
              </label>
              <textarea
                id="brief"
                rows={5}
                placeholder="Ex: Crème hydratante naturelle à base de karité du Sénégal. Convient aux peaux sèches, mixtes et sensibles. Sans paraben. Pot de 200ml."
                value={brief}
                onChange={(e) => { setBrief(e.target.value); setError(""); }}
                maxLength={2000}
                required
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition resize-none"
              />
              <p className="text-xs text-gray-400 text-right">{brief.length}/2000</p>
            </div>

            {/* Plateformes */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">
                Plateformes <span className="text-violet-600">*</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => {
                  const checked = plateformes.includes(p.value);
                  return (
                    <label
                      key={p.value}
                      className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 cursor-pointer transition-all text-sm ${
                        checked
                          ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500 text-violet-700 font-semibold"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePlatform(p.value)}
                        className="accent-violet-600"
                      />
                      {p.label}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Ton + Langue */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="ton" className="block text-sm font-semibold text-gray-700">
                  Ton <span className="text-violet-600">*</span>
                </label>
                <select
                  id="ton"
                  value={ton}
                  onChange={(e) => setTon(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition appearance-none"
                >
                  {TONES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="langue" className="block text-sm font-semibold text-gray-700">
                  Langue <span className="text-violet-600">*</span>
                </label>
                <select
                  id="langue"
                  value={langue}
                  onChange={(e) => setLangue(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition appearance-none"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 pt-1" />

            {/* Paiement */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Moyen de paiement</p>
              <p className="text-xs text-gray-400">
                {limitReached
                  ? "Sélectionnez votre moyen de paiement (500 FCFA) pour débloquer la génération."
                  : "Sélectionnez un moyen de paiement pour personnaliser votre copie."}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((pm) => {
                  const selected = paymentMethod === pm.value;
                  return (
                    <label
                      key={pm.value}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all text-sm ${
                        selected
                          ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500 text-violet-700 font-semibold"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={pm.value}
                        checked={selected}
                        onChange={() => setPaymentMethod(pm.value)}
                        className="accent-violet-600"
                      />
                      {pm.label}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-violet-700 hover:bg-violet-800 disabled:bg-violet-400 text-white font-semibold py-3 px-6 text-sm transition-colors duration-150 flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {initiating ? "Redirection vers le paiement…" : "Génération en cours…"}
                </>
              ) : limitReached ? (
                "Payer & Générer (500 FCFA)"
              ) : (
                "Générer"
              )}
            </button>
          </form>
        </div>

        {/* Output Card (free-tier results only; paid results appear on /success) */}
        {generatedCopy && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Copie générée
              </h2>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors duration-150"
              >
                {copied ? (
                  <>
                    <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-600">Copié !</span>
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copier
                  </>
                )}
              </button>
            </div>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
              {generatedCopy}
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
