"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Status = "verifying" | "ready" | "error";

interface VerifyResponse {
  copies?:      Record<string, string>;
  error?:       string;
  retryable?:   boolean;
  paymentSafe?: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "📸 Instagram",
  snapchat:  "👻 Snapchat",
  whatsapp:  "💬 WhatsApp",
  tiktok:    "🎵 TikTok",
};

function SuccessContent() {
  const params    = useSearchParams();
  const requestId = params.get("requestId") ?? "";

  const [copies,    setCopies]    = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("");
  const [status,    setStatus]    = useState<Status>("verifying");
  const [errorMsg,  setErrorMsg]  = useState("");
  const [retryable, setRetryable] = useState(false);
  const [retrying,  setRetrying]  = useState(false);
  const [copiedTab,    setCopiedTab]    = useState<string | null>(null);
  const [paymentSafe,  setPaymentSafe]  = useState(false);

  const runVerify = useCallback(async () => {
    if (!requestId) {
      setStatus("error");
      setErrorMsg("Lien de paiement invalide.");
      setRetryable(false);
      return;
    }

    setStatus("verifying");

    try {
      const res  = await fetch("/api/v1/confirm", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ requestId }),
      });
      const data: VerifyResponse = await res.json();

      if (!res.ok || data.error || !data.copies) {
        setStatus("error");
        setErrorMsg(data.error ?? "Une erreur est survenue.");
        setRetryable(data.retryable ?? false);
        setPaymentSafe(data.paymentSafe ?? false);
      } else {
        setCopies(data.copies);
        setActiveTab(Object.keys(data.copies)[0] ?? "");
        setStatus("ready");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Erreur réseau. Vérifiez votre connexion et réessayez.");
      setRetryable(true);
    }
  }, [requestId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await runVerify();
    })();
    return () => { cancelled = true; };
  }, [runVerify]);

  async function handleRetry() {
    setRetrying(true);
    await runVerify();
    setRetrying(false);
  }

  async function handleCopy(platform: string) {
    try {
      await navigator.clipboard.writeText(copies[platform] ?? "");
      setCopiedTab(platform);
      setTimeout(() => setCopiedTab(null), 2000);
    } catch { /* ignore */ }
  }

  /* ── Loading ── */
  if (status === "verifying") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-900 flex items-center justify-center px-4">
        <div className="text-center space-y-5">
          <div className="animate-spin h-12 w-12 border-4 border-violet-300 border-t-transparent rounded-full mx-auto" />
          <p className="text-white font-semibold text-base">
            Vérification du paiement et génération en cours…
          </p>
          <p className="text-violet-300 text-sm">Cela prend généralement moins de 15 secondes.</p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-900 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="bg-red-50 rounded-3xl shadow-2xl p-8 text-center space-y-5 animate-fadeInUp">
            <div className="text-4xl">{paymentSafe ? "⚠️" : "❌"}</div>
            <p className="text-red-700 font-semibold">{errorMsg}</p>
            {paymentSafe && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-1">
                <p className="text-amber-800 text-sm font-semibold">✅ Votre paiement de 500 FCFA est confirmé et sécurisé.</p>
                <p className="text-amber-700 text-xs">La génération a échoué temporairement. Cliquez &ldquo;Réessayer&rdquo; ou conservez ce lien — il reste valide 7 jours.</p>
              </div>
            )}
            {requestId && (
              <p className="text-xs text-gray-400 font-mono break-all">Réf : {requestId}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
              {retryable && (
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-semibold px-6 py-3 transition-colors duration-150"
                >
                  {retrying ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Vérification…
                    </>
                  ) : "Réessayer"}
                </button>
              )}
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium px-6 py-3 transition-colors duration-150"
              >
                ← Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Ready ── */
  const platformKeys  = Object.keys(copies);
  const whatsappText  = copies["whatsapp"] ?? Object.values(copies)[0] ?? "";
  const whatsappUrl   = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="text-6xl">✅</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Paiement confirmé !
          </h1>
          <p className="text-violet-200 text-sm">
            Votre copie de vente Sagnsé est prête.
          </p>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 animate-fadeInUp space-y-6">

          {/* Copy output area */}
          <div className="bg-gray-50 rounded-2xl p-5 space-y-4">

            {/* Platform tabs */}
            {platformKeys.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {platformKeys.map((platform) => (
                  <button
                    key={platform}
                    onClick={() => setActiveTab(platform)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 ${
                      activeTab === platform
                        ? "bg-violet-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {PLATFORM_LABELS[platform] ?? platform}
                  </button>
                ))}
              </div>
            )}

            {/* Active copy + copy button */}
            {activeTab && copies[activeTab] && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={() => handleCopy(activeTab)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors duration-150"
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
                  {copies[activeTab]}
                </p>
              </div>
            )}
          </div>

          {/* WhatsApp share button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 px-6 text-sm transition-colors duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Partager sur WhatsApp
          </a>

          {/* Back link */}
          <div className="text-center">
            <Link
              href="/"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-150"
            >
              ← Générer une autre copie
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-900 flex items-center justify-center">
          <div className="animate-spin h-12 w-12 border-4 border-violet-300 border-t-transparent rounded-full" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
