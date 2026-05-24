"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Status = "verifying" | "ready" | "error";

interface VerifyResponse {
  copy?:      string;
  error?:     string;
  retryable?: boolean;
}

function SuccessContent() {
  const params    = useSearchParams();
  const requestId = params.get("requestId") ?? "";

  const [copy,      setCopy]      = useState("");
  const [status,    setStatus]    = useState<Status>("verifying");
  const [errorMsg,  setErrorMsg]  = useState("");
  const [retryable, setRetryable] = useState(false);
  const [retrying,  setRetrying]  = useState(false);
  const [copied,    setCopied]    = useState(false);

  const runVerify = useCallback(async () => {
    if (!requestId) {
      setStatus("error");
      setErrorMsg("Lien de paiement invalide.");
      setRetryable(false);
      return;
    }

    setStatus("verifying");

    try {
      const res  = await fetch("/api/payment/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ requestId }),
      });
      const data: VerifyResponse = await res.json();

      if (!res.ok || data.error || !data.copy) {
        setStatus("error");
        setErrorMsg(data.error ?? "Une erreur est survenue.");
        setRetryable(data.retryable ?? false);
      } else {
        setCopy(data.copy);
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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  /* ── Loading ── */
  if (status === "verifying") {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="animate-spin h-10 w-10 border-4 border-violet-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-gray-600 text-sm font-medium">
          Vérification du paiement et génération en cours…
        </p>
        <p className="text-xs text-gray-400">Cela prend généralement moins de 15 secondes.</p>
      </div>
    );
  }

  /* ── Error ── */
  if (status === "error") {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 px-6 py-6 text-center space-y-4">
        <div className="text-2xl">❌</div>
        <p className="text-red-700 font-semibold text-sm">{errorMsg}</p>
        {requestId && (
          <p className="text-xs text-gray-400 font-mono break-all">Réf : {requestId}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {retryable && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:bg-violet-400 text-white text-sm font-semibold px-5 py-2.5 transition-colors duration-150"
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
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium px-5 py-2.5 transition-colors duration-150"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  /* ── Ready ── */
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(copy)}`;

  return (
    <div className="space-y-4">
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

      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{copy}</p>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 text-sm transition-colors duration-150"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Partager sur WhatsApp
      </a>

      <Link
        href="/"
        className="block text-center text-xs text-gray-400 hover:text-gray-600 transition-colors duration-150 pt-1"
      >
        ← Générer une autre copie
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-8 text-center space-y-2">
            <div className="text-4xl">✅</div>
            <h1 className="text-xl font-bold text-gray-900">Paiement confirmé !</h1>
            <p className="text-sm text-gray-500">
              Votre copie de vente Sagnsé est en cours de génération.
            </p>
          </div>
          <Suspense
            fallback={
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto" />
              </div>
            }
          >
            <SuccessContent />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
