import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sagnsé — Générateur de Copie de Vente",
  description: "Générez des copies de vente percutantes pour Instagram, TikTok, WhatsApp et Snapchat en français, wolof, anglais, pulaar et sérère.",
  openGraph: {
    title: "Sagnsé — Générateur de Copie de Vente",
    description: "Créez des textes de vente professionnels pour vos produits en secondes. Disponible en français, wolof, anglais, pulaar et sérère.",
    url: "https://sagnse-copy-generator.vercel.app",
    siteName: "Sagnsé GenCopy SN",
    locale: "fr_SN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Sagnsé — Générateur de Copie de Vente",
    description: "Créez des textes de vente professionnels pour vos produits en secondes.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
