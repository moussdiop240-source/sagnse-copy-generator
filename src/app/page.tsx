"use client";

import { useState, useEffect, useRef } from "react";

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

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  snapchat:  "Snapchat",
  whatsapp:  "WhatsApp",
  tiktok:    "TikTok",
};

type PayStep = "select" | "waiting" | "done";

export default function Home() {
  const [titre, setTitre]                     = useState("");
  const [brief, setBrief]                     = useState("");
  const [plateformes, setPlateformes]         = useState<string[]>([]);
  const [ton, setTon]                         = useState("professionnel");
  const [langue, setLangue]                   = useState("francais");
  const [generatedCopies, setGeneratedCopies] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab]             = useState("");
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");
  const [copiedTab, setCopiedTab]             = useState<string | null>(null);

  // Payment state
  const [phone, setPhone]           = useState("");
  const [payStep, setPayStep]       = useState<PayStep>("select");
  const [payingOp, setPayingOp]     = useState<"wave_senegal" | "orange_money_sn" | "">("");
  const [pollId, setPollId]         = useState("");
  const [paidCopies, setPaidCopies] = useState<Record<string, string>>({});
  const pollRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [genCount, setGenCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const stored = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);
    return isNaN(stored) ? 0 : stored;
  });

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

  // ── Polling loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (payStep !== "waiting" || !pollId) return;

    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const res  = await fetch("/api/payment/poll", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ requestId: pollId }),
        });
        const data = await res.json() as {
          status: string;
          copies?: Record<string, string>;
          error?:  string;
        };

        if (cancelled) return;

        if (data.status === "paid" && data.copies) {
          setPaidCopies(data.copies);
          setActiveTab(Object.keys(data.copies)[0] ?? "");
          setPayStep("done");
          incrementCount();
        } else if (data.status === "pending") {
          pollRef.current = setTimeout(poll, 3_000);
        } else {
          setError(data.error ?? "Erreur lors du paiement. Réessayez.");
          setPayStep("select");
          setPayingOp("");
        }
      } catch {
        if (!cancelled) pollRef.current = setTimeout(poll, 5_000);
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payStep, pollId]);

  // ── Free flow ─────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (limitReached) return; // paid flow is handled by handlePay
    if (plateformes.length === 0) {
      setError("Veuillez sélectionner au moins une plateforme.");
      return;
    }
    setError("");
    setGeneratedCopies({});
    setActiveTab("");
    setLoading(true);
    try {
      const res  = await fetch("/api/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ titre, brief, plateformes, ton, langue }),
      });
      const data = await res.json() as { copies?: Record<string, string>; error?: string };
      if (!res.ok) {
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

  // ── Paid flow ─────────────────────────────────────────────────────────────
  async function handlePay(op: "wave_senegal" | "orange_money_sn") {
    if (!phone.trim()) {
      setError("Entrez votre numéro de téléphone.");
      return;
    }
    if (plateformes.length === 0) {
      setError("Veuillez sélectionner au moins une plateforme.");
      return;
    }
    if (!titre.trim() || !brief.trim()) {
      setError("Le titre et le brief produit sont requis.");
      return;
    }
    setError("");
    setPayingOp(op);

    try {
      const res  = await fetch("/api/payment/softpay", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ titre, brief, plateformes, ton, langue, phone, operator: op }),
      });
      const data = await res.json() as { requestId?: string; status?: string; error?: string };

      if (!res.ok || !data.requestId) {
        setError(data.error ?? "Erreur lors de l'initiation du paiement.");
        setPayingOp("");
        return;
      }

      setPollId(data.requestId);
      setPayStep("waiting");
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion et réessayez.");
      setPayingOp("");
    }
  }

  function handleCancelPay() {
    if (pollRef.current) clearTimeout(pollRef.current);
    setPayStep("select");
    setPayingOp("");
    setPollId("");
  }

  async function handleCopy(platform: string, source: Record<string, string>) {
    try {
      await navigator.clipboard.writeText(source[platform] ?? "");
      setCopiedTab(platform);
      setTimeout(() => setCopiedTab(null), 2000);
    } catch {
      setError("Impossible d'accéder au presse-papiers. Copiez le texte manuellement.");
    }
  }

  const formDisabled = loading || payStep === "waiting";
  const inPaymentDone = payStep === "done";

  // Copies to show — free or paid
  const displayCopies    = inPaymentDone ? paidCopies : generatedCopies;
  const hasDisplayCopies = Object.keys(displayCopies).length > 0;

  return (
    <main className="min-h-screen bg-gray-100 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">

        {/* Brand header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-violet-700">Sagnsé</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest border border-gray-300 rounded-full px-2 py-0.5">GenCopy SN</span>
          </div>
          <p className="text-xs text-gray-500">Copywriting expert pour les marchands sénégalais</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-start justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Générer une copie de vente
            </h1>
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

          {/* Freemium banner */}
          {limitReached && payStep !== "done" && (
            <div className="rounded-2xl bg-violet-50 border border-violet-200 px-5 py-4 text-center space-y-1 mb-6">
              <div className="text-2xl">🔒</div>
              <p className="text-sm font-bold text-violet-800">
                Limite de {FREE_LIMIT} copies gratuites atteinte.
              </p>
              <p className="text-xs text-violet-600">
                Entrez votre numéro et payez <strong>500 FCFA</strong> directement avec <strong>Wave</strong> ou <strong>Orange Money</strong>.
              </p>
            </div>
          )}

          {/* Form */}
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
                disabled={formDisabled}
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition disabled:opacity-60"
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
                disabled={formDisabled}
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition resize-none disabled:opacity-60"
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
                        formDisabled ? "opacity-60 cursor-not-allowed" : ""
                      } ${
                        checked
                          ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500 text-violet-700 font-semibold"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => !formDisabled && togglePlatform(p.value)}
                        disabled={formDisabled}
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
                  disabled={formDisabled}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition appearance-none disabled:opacity-60"
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
                  disabled={formDisabled}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition appearance-none disabled:opacity-60"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── PAYMENT SECTION ─────────────────────────────────────────── */}
            {limitReached && payStep === "select" && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 space-y-4">
                <p className="text-sm font-semibold text-violet-800">Numéro de téléphone mobile money</p>
                <input
                  type="tel"
                  placeholder="Ex: 77 123 45 67"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError(""); }}
                  className="w-full rounded-xl border border-violet-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handlePay("wave_senegal")}
                    disabled={!!payingOp}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#1BB8E6] hover:bg-[#17a3cf] disabled:opacity-60 text-white font-bold py-3 px-4 text-sm transition-colors"
                  >
                    {payingOp === "wave_senegal" ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                      </svg>
                    )}
                    Wave Sénégal
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePay("orange_money_sn")}
                    disabled={!!payingOp}
                    className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 px-4 text-sm transition-colors"
                  >
                    {payingOp === "orange_money_sn" ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                    )}
                    Orange Money
                  </button>
                </div>
                <p className="text-xs text-violet-500 text-center">
                  Vous recevrez une confirmation directement sur votre téléphone.
                </p>
              </div>
            )}

            {/* ── WAITING FOR PAYMENT CONFIRMATION ───────────────────────── */}
            {payStep === "waiting" && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center space-y-4">
                <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <div>
                  <p className="text-sm font-bold text-blue-800">
                    Confirmez le paiement sur votre téléphone
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Une demande de {payingOp === "wave_senegal" ? "Wave" : "Orange Money"} a été envoyée au{" "}
                    <strong>{phone}</strong>. Acceptez pour continuer.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelPay}
                  className="text-xs text-blue-500 underline hover:text-blue-700"
                >
                  Annuler
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit — only for free flow */}
            {!limitReached && (
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-violet-700 hover:bg-violet-800 disabled:bg-violet-400 text-white font-semibold py-3 px-6 text-sm transition-colors duration-150 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Génération en cours…
                  </>
                ) : "Générer"}
              </button>
            )}
          </form>
        </div>

        {/* Output Card */}
        {hasDisplayCopies && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-4">
            {inPaymentDone && (
              <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-semibold">
                Paiement confirmé — voici votre copie de vente !
              </div>
            )}
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Copie générée
            </h2>

            {Object.keys(displayCopies).length > 1 && (
              <div className="flex flex-wrap gap-2">
                {Object.keys(displayCopies).map((platform) => (
                  <button
                    key={platform}
                    onClick={() => setActiveTab(platform)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 ${
                      activeTab === platform
                        ? "bg-violet-700 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {PLATFORM_LABELS[platform] ?? platform}
                  </button>
                ))}
              </div>
            )}

            {activeTab && displayCopies[activeTab] && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={() => handleCopy(activeTab, displayCopies)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors duration-150"
                  >
                    {copiedTab === activeTab ? (
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
                  {displayCopies[activeTab]}
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
