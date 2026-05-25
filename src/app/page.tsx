"use client";

import { useState, useEffect } from "react";

const FREE_LIMIT  = 5;
const STORAGE_KEY = "sagnse_gen_count";

const PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: "📸" },
  { value: "snapchat",  label: "Snapchat",  icon: "👻" },
  { value: "whatsapp",  label: "WhatsApp",  icon: "💬" },
  { value: "tiktok",    label: "TikTok",    icon: "🎵" },
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

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "📸 Instagram",
  snapchat:  "👻 Snapchat",
  whatsapp:  "💬 WhatsApp",
  tiktok:    "🎵 TikTok",
};

export default function Home() {
  const [titre, setTitre]                     = useState("");
  const [brief, setBrief]                     = useState("");
  const [plateformes, setPlateformes]         = useState<string[]>([]);
  const [ton, setTon]                         = useState("professionnel");
  const [langue, setLangue]                   = useState("francais");
  const [generatedCopies, setGeneratedCopies] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab]             = useState("");
  const [loading, setLoading]                 = useState(false);
  const [initiating, setInitiating]           = useState(false);
  const [error, setError]                     = useState("");
  const [copiedTab, setCopiedTab]             = useState<string | null>(null);

  const [genCount, setGenCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const stored = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);
    return isNaN(stored) ? 0 : stored;
  });

  // Sync with server on mount so admin resets are reflected immediately on refresh
  useEffect(() => {
    fetch("/api/v1/usage")
      .then((r) => r.json())
      .then((data: { count?: number }) => {
        if (typeof data.count === "number") {
          setGenCount(data.count);
          localStorage.setItem(STORAGE_KEY, String(data.count));
        }
      })
      .catch(() => { /* keep localStorage value on network error */ });
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
    setError("");

    // ── PAID FLOW ──
    if (limitReached) {
      setInitiating(true);
      try {
        const res  = await fetch("/api/v1/pay", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ titre, brief, plateformes, ton, langue }),
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

    // ── FREE FLOW ──
    setGeneratedCopies({});
    setActiveTab("");
    setLoading(true);
    try {
      const res  = await fetch("/api/v1/create", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ titre, brief, plateformes, ton, langue }),
      });
      const data = await res.json() as { copies?: Record<string, string>; error?: string; limitReached?: boolean };
      if (!res.ok) {
        if (data.limitReached) {
          // Server confirmed limit — sync localStorage so the paywall shows
          setGenCount(FREE_LIMIT);
          localStorage.setItem(STORAGE_KEY, String(FREE_LIMIT));
        }
        setError(data.error ?? "Une erreur est survenue. Veuillez réessayer.");
      } else {
        const copies = data.copies ?? {};
        setGeneratedCopies(copies);
        setActiveTab(Object.keys(copies)[0] ?? "");
        incrementCount();
      }
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(platform: string) {
    try {
      await navigator.clipboard.writeText(generatedCopies[platform] ?? "");
      setCopiedTab(platform);
      setTimeout(() => setCopiedTab(null), 2000);
    } catch {
      setError("Impossible d'accéder au presse-papiers. Copiez le texte manuellement.");
    }
  }

  const busy = loading || initiating;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-900">

      {/* ── Hero ── */}
      <div className="px-4 pt-12 pb-10 text-center">

        {/* Brand */}
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="text-3xl font-extrabold tracking-tight text-white">Sagnsé</span>
          <span className="text-xs font-bold text-violet-300 uppercase tracking-widest border border-violet-500 rounded-full px-2.5 py-1">
            GenCopy SN
          </span>
        </div>

        {/* Hook — main headline */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4 max-w-xl mx-auto">
          Tes produits méritent des textes{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-indigo-300">
            qui font acheter.
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-violet-200 text-base leading-relaxed mb-3 max-w-md mx-auto">
          Donne-nous ton produit — on écrit la copie en 10 secondes.
          Instagram, WhatsApp, TikTok & Snapchat.
        </p>

        {/* Tagline */}
        <p className="text-violet-400 text-sm mb-7">
          Votre expert en copie de vente pour les marchands
        </p>

        {/* Badges */}
        <div className="flex flex-wrap justify-center gap-2">
          {["🌍 5 langues", "📱 4 plateformes", "⚡ En secondes", "🎁 5 essais gratuits"].map((badge) => (
            <span
              key={badge}
              className="text-xs font-semibold text-violet-200 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="px-4 pb-16 flex flex-col items-center gap-6">
        <div className="w-full max-w-2xl">

          {/* ── Form card ── */}
          <div className="glass-card rounded-3xl shadow-2xl p-8 animate-fadeInUp">

            {/* Card header */}
            <div className="flex items-center justify-between mb-7">
              <h1 className="text-xl font-bold text-gray-900">
                Générer une copie de vente
              </h1>
              {!limitReached && (
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  remaining <= 2
                    ? "bg-orange-100 text-orange-700 border border-orange-200"
                    : "bg-violet-100 text-violet-700 border border-violet-200"
                }`}>
                  {remaining} essai{remaining !== 1 ? "s" : ""} gratuit{remaining !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Paywall banner */}
            {limitReached && (
              <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-5 text-center space-y-2 mb-7 shadow-lg">
                <div className="text-3xl">🔒</div>
                <p className="text-white font-bold text-sm">
                  Limite de {FREE_LIMIT} copies gratuites atteinte
                </p>
                <p className="text-violet-100 text-xs leading-relaxed">
                  Payez <strong className="text-white">500 FCFA</strong> par génération.
                  Choisissez <strong className="text-white">Wave</strong> ou{" "}
                  <strong className="text-white">Orange Money</strong> — paiement sécurisé en 30 secondes.
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Titre */}
              <div className="space-y-1.5">
                <label htmlFor="titre" className="block text-sm font-semibold text-gray-700">
                  Titre du produit <span className="text-violet-600">*</span>
                </label>
                <input
                  id="titre"
                  type="text"
                  placeholder="Ex: Promo Tabaski – Huile de coco bio"
                  value={titre}
                  onChange={(e) => { setTitre(e.target.value); setError(""); }}
                  maxLength={200}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Brief */}
              <div className="space-y-1.5">
                <label htmlFor="brief" className="block text-sm font-semibold text-gray-700">
                  Brief produit <span className="text-violet-600">*</span>
                </label>
                <textarea
                  id="brief"
                  rows={4}
                  placeholder="Décrivez votre produit: caractéristiques, avantages, public cible, prix..."
                  value={brief}
                  onChange={(e) => { setBrief(e.target.value); setError(""); }}
                  maxLength={2000}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 resize-none"
                />
                <p className="text-xs text-gray-400 text-right">{brief.length}/2000</p>
              </div>

              {/* Platforms */}
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
                        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all duration-200 text-sm ${
                          checked
                            ? "border-violet-500 bg-violet-50 text-violet-700 font-semibold shadow-sm"
                            : "border-gray-200 bg-white text-gray-600 hover:border-violet-300 hover:bg-violet-50/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePlatform(p.value)}
                          className="sr-only"
                        />
                        <span className="text-lg">{p.icon}</span>
                        <span>{p.label}</span>
                        {checked && (
                          <svg className="ml-auto h-4 w-4 text-violet-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
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
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
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
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2 text-sm text-red-600">
                  <span className="text-base flex-shrink-0">⚠️</span>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={busy}
                className="w-full btn-gradient disabled:opacity-60 disabled:cursor-not-allowed rounded-2xl py-3.5 px-6 text-sm font-bold shadow-lg shadow-violet-900/30 hover:shadow-violet-900/50 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2"
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
                  <>
                    <span>💳</span>
                    Payer & Générer — 500 FCFA
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Générer ma copie
                  </>
                )}
              </button>

              {/* Trust line */}
              <p className="text-center text-xs text-gray-400">
                🔒 Paiement sécurisé · Wave &amp; Orange Money acceptés
              </p>
            </form>
          </div>

          {/* ── Output card ── */}
          {Object.keys(generatedCopies).length > 0 && (
            <div className="glass-card rounded-3xl shadow-2xl p-8 space-y-5 animate-fadeInUp">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Votre copie de vente
                </h2>
              </div>

              {Object.keys(generatedCopies).length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {Object.keys(generatedCopies).map((platform) => (
                    <button
                      key={platform}
                      onClick={() => setActiveTab(platform)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                        activeTab === platform
                          ? "bg-violet-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {PLATFORM_LABELS[platform] ?? platform}
                    </button>
                  ))}
                </div>
              )}

              {activeTab && generatedCopies[activeTab] && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">
                      {generatedCopies[activeTab]}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(activeTab)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-all duration-200"
                    >
                      {copiedTab === activeTab ? (
                        <>
                          <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-600">Copié !</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                          Copier
                        </>
                      )}
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(generatedCopies[activeTab] ?? "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-4 text-sm transition-all duration-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Footer ── */}
          <div className="text-center mt-4 space-y-2">
            <p className="text-xs text-violet-300/60">
              Sagnsé GenCopy SN · Fait avec ❤️ pour les marchands sénégalais
            </p>
            <a
              href="/admin"
              className="inline-block text-xs text-violet-300/30 hover:text-violet-300/60 transition-colors duration-200"
            >
              Admin
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
