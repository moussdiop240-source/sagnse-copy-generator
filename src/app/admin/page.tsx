"use client";

import { useState } from "react";

export default function AdminPage() {
  const [key,     setKey]     = useState("");
  const [status,  setStatus]  = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res  = await fetch("/api/admin/reset-trials", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ key }),
      });
      const data = await res.json() as { ok?: boolean; deleted?: number; error?: string };
      if (!res.ok || data.error) {
        setStatus("error");
        setMessage(data.error ?? "Clé incorrecte ou erreur serveur.");
      } else {
        setStatus("ok");
        setMessage(`✅ Essais réinitialisés — ${data.deleted} IP(s) supprimée(s).`);
        setKey("");
      }
    } catch {
      setStatus("error");
      setMessage("Erreur réseau.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl shadow-2xl p-8 space-y-6">

        <div className="text-center space-y-1">
          <div className="text-2xl font-bold text-white">Sagnsé Admin</div>
          <p className="text-gray-400 text-sm">Réinitialiser les essais gratuits</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Clé admin
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="••••••••••••••••"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading" || !key}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-violet-900 disabled:text-violet-500 text-white font-semibold py-3 text-sm transition-colors duration-150"
          >
            {status === "loading" ? "Réinitialisation…" : "Réinitialiser les essais"}
          </button>
        </form>

        {message && (
          <p className={`text-sm text-center rounded-xl px-4 py-3 ${
            status === "ok"
              ? "bg-green-900/50 text-green-300"
              : "bg-red-900/50 text-red-300"
          }`}>
            {message}
          </p>
        )}

        <p className="text-xs text-gray-600 text-center">
          Accès restreint — ne partagez pas cette URL.
        </p>
      </div>
    </div>
  );
}
